import { CreateAgentDto, UpdateAgentDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import {
	AuthenticatedRequest,
	GLOBAL_MEMBER_ROLE,
	UserRepository,
	WorkflowRepository,
	ProjectRelationRepository,
	ProjectRepository,
} from '@n8n/db';
import { RestController, Body, Get, Post, Patch, Param } from '@n8n/decorators';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	createRunExecutionData,
	jsonStringify,
	type INode,
	type IPinData,
	type IWorkflowExecutionDataProcess,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

const LLM_API_KEY = process.env.N8N_AGENT_LLM_API_KEY ?? '';
const LLM_BASE_URL = process.env.N8N_AGENT_LLM_BASE_URL ?? 'https://api.anthropic.com';
const LLM_MODEL = process.env.N8N_AGENT_LLM_MODEL ?? 'claude-sonnet-4-5-20250929';
const MAX_ITERATIONS = 15;
const EXECUTION_TIMEOUT_MS = 120_000;

const SUPPORTED_TRIGGERS: Record<string, string> = {
	[MANUAL_TRIGGER_NODE_TYPE]: 'Manual Trigger',
	[WEBHOOK_NODE_TYPE]: 'Webhook Trigger',
	[CHAT_TRIGGER_NODE_TYPE]: 'Chat Trigger',
	[FORM_TRIGGER_NODE_TYPE]: 'Form Trigger',
	[SCHEDULE_TRIGGER_NODE_TYPE]: 'Schedule Trigger',
};

interface LlmMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface TaskStep {
	action: string;
	workflowName?: string;
	toAgent?: string;
	result?: string;
}

interface IterationBudget {
	remaining: number;
}

@RestController('/agents')
export class AgentsController {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly credentialsService: CredentialsService,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
	) {}

	@Post('/')
	async createAgent(_req: AuthenticatedRequest, _res: Response, @Body payload: CreateAgentDto) {
		const email = `agent-${crypto.randomUUID().slice(0, 8)}@internal.n8n.local`;

		const { user } = await this.userRepository.createUserWithProject({
			email,
			firstName: payload.firstName,
			lastName: '',
			password: null,
			type: 'agent',
			avatar: payload.avatar ?? null,
			role: GLOBAL_MEMBER_ROLE,
		});

		if (payload.description !== undefined || payload.agentAccessLevel !== undefined) {
			if (payload.description !== undefined) user.description = payload.description;
			if (payload.agentAccessLevel !== undefined) user.agentAccessLevel = payload.agentAccessLevel;
			await this.userRepository.save(user);
		}

		return {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			avatar: user.avatar,
			description: user.description,
			agentAccessLevel: user.agentAccessLevel,
		};
	}

	@Patch('/:agentId')
	async updateAgent(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: UpdateAgentDto,
	) {
		const agent = await this.userRepository.findOneBy({ id: agentId });

		if (!agent || agent.type !== 'agent') {
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		if (payload.firstName !== undefined) {
			agent.firstName = payload.firstName;
		}
		if (payload.avatar !== undefined) {
			agent.avatar = payload.avatar;
		}
		if (payload.description !== undefined) {
			agent.description = payload.description;
		}
		if (payload.agentAccessLevel !== undefined) {
			agent.agentAccessLevel = payload.agentAccessLevel;
		}

		const saved = await this.userRepository.save(agent);

		return {
			id: saved.id,
			firstName: saved.firstName,
			lastName: saved.lastName,
			email: saved.email,
			avatar: saved.avatar,
			description: saved.description,
			agentAccessLevel: saved.agentAccessLevel,
		};
	}

	@Get('/:agentId/capabilities')
	async getCapabilities(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const agentUser = await this.userRepository.findOne({
			where: { id: agentId },
			relations: ['role'],
		});

		if (!agentUser) {
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		const workflowIds = await this.workflowSharingService.getSharedWorkflowIds(agentUser, {
			scopes: ['workflow:read'],
		});

		const workflows = workflowIds.length
			? await this.workflowRepository.findByIds(workflowIds, {
					fields: ['id', 'name', 'active'],
				})
			: [];

		const credentials = await this.credentialsService.getMany(agentUser, {
			includeGlobal: false,
		});

		const projectRelations = await this.projectRelationRepository.findAllByUser(agentUser.id);
		const projectIds = projectRelations.map((r) => r.projectId);

		const projects =
			projectIds.length > 0 ? await this.projectRepository.findByIds(projectIds) : [];

		return {
			agentId: agentUser.id,
			agentName: `${agentUser.firstName} ${agentUser.lastName}`.trim(),
			description: agentUser.description,
			agentAccessLevel: agentUser.agentAccessLevel,
			projects: projects.map((p) => ({ id: p.id, name: p.name })),
			workflows: workflows.map((w) => ({
				id: w.id,
				name: w.name,
				active: w.active,
			})),
			credentials: credentials.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
			})),
		};
	}

	@Get('/:agentId/card', { apiKeyAuth: true, allowUnauthenticated: true })
	async getAgentCard(req: Request, _res: Response, @Param('agentId') agentId: string) {
		const agent = await this.userRepository.findOneBy({ id: agentId, type: 'agent' });

		if (!agent || agent.agentAccessLevel === 'closed') {
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		const baseUrl = `${req.protocol}://${req.get('host')}`;

		return {
			id: agent.id,
			name: agent.firstName,
			provider: {
				name: 'n8n',
				description: agent.description ?? '',
			},
			capabilities: {
				streaming: false,
				pushNotifications: false,
				multiTurn: true,
			},
			skills: [],
			interfaces: [
				{
					type: 'http+json',
					url: `${baseUrl}/rest/agents/${agent.id}/task`,
				},
			],
			securitySchemes: {
				apiKey: {
					type: 'apiKey',
					name: 'x-n8n-api-key',
					in: 'header',
				},
			},
			security: [{ apiKey: [] }],
		};
	}

	@Post('/:agentId/task', { apiKeyAuth: true })
	async dispatchTask(req: AuthenticatedRequest, _res: Response, @Param('agentId') agentId: string) {
		const { prompt } = req.body as { prompt: string };
		return await this.executeAgentTask(agentId, prompt, { remaining: MAX_ITERATIONS });
	}

	private async executeAgentTask(
		agentId: string,
		prompt: string,
		budget: IterationBudget,
	): Promise<{ status: string; summary?: string; steps: TaskStep[]; message?: string }> {
		const agentUser = await this.userRepository.findOne({
			where: { id: agentId },
			relations: ['role'],
		});

		if (!agentUser) {
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		if (!LLM_API_KEY) {
			return {
				status: 'error',
				message:
					'N8N_AGENT_LLM_API_KEY not configured. Set the environment variable to enable agent tasks.',
				steps: [],
			};
		}

		// Fetch capabilities for LLM context
		const workflowIds = await this.workflowSharingService.getSharedWorkflowIds(agentUser, {
			scopes: ['workflow:read'],
		});
		const workflows = workflowIds.length
			? await this.workflowRepository.findByIds(workflowIds, {
					fields: ['id', 'name', 'active'],
				})
			: [];

		const workflowList = workflows.map((w) => ({
			id: w.id,
			name: w.name,
			active: w.active,
		}));

		// Fetch other agents for delegation (only if budget allows)
		const otherAgents: Array<{ firstName: string; description: string }> = [];
		if (budget.remaining > 0) {
			const allAgents = await this.userRepository.find({ where: { type: 'agent' } });
			for (const a of allAgents) {
				if (a.id !== agentId && a.agentAccessLevel !== 'closed') {
					otherAgents.push({
						firstName: a.firstName,
						description: a.description ?? '',
					});
				}
			}
		}

		const canDelegate = budget.remaining > 0 && otherAgents.length > 0;
		const agentName = `${agentUser.firstName} ${agentUser.lastName}`.trim();
		const steps: TaskStep[] = [];

		const systemPrompt = buildSystemPrompt(agentName, workflowList, otherAgents, canDelegate);
		const messages: LlmMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: prompt },
		];

		while (budget.remaining > 0) {
			budget.remaining--;

			const llmResponse = await callLlm(messages);
			messages.push({ role: 'assistant', content: llmResponse });

			// Strip markdown code fences if present
			const cleaned = llmResponse
				.replace(/^```(?:json)?\s*/i, '')
				.replace(/\s*```\s*$/, '')
				.trim();

			let parsed: {
				action: string;
				workflowId?: string;
				toAgent?: string;
				message?: string;
				reasoning?: string;
				summary?: string;
			};
			try {
				parsed = JSON.parse(cleaned);
			} catch {
				return { status: 'completed', summary: llmResponse, steps };
			}

			if (parsed.action === 'complete') {
				return {
					status: 'completed',
					summary: parsed.summary ?? 'Task completed',
					steps,
				};
			}

			if (parsed.action === 'execute_workflow' && parsed.workflowId) {
				const capWorkflow = workflowList.find((w) => w.id === parsed.workflowId);
				const workflowName = capWorkflow?.name ?? parsed.workflowId;

				steps.push({ action: 'execute_workflow', workflowName });

				try {
					const result = await this.runWorkflow(agentUser, parsed.workflowId, prompt);
					const observation = `Workflow "${workflowName}" executed. Result: ${jsonStringify(result).slice(0, 2000)}`;
					steps[steps.length - 1].result = result.success ? 'success' : 'failed';
					messages.push({ role: 'user', content: `Observation: ${observation}` });
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : String(error);
					steps[steps.length - 1].result = 'error';
					messages.push({
						role: 'user',
						content: `Observation: Workflow execution failed: ${errorMsg}`,
					});
				}
			} else if (
				parsed.action === 'send_message' &&
				parsed.toAgent &&
				parsed.message &&
				canDelegate
			) {
				const targetAgent = await this.userRepository.findOne({
					where: { firstName: parsed.toAgent, type: 'agent' },
				});

				steps.push({ action: 'send_message', toAgent: parsed.toAgent });

				if (!targetAgent) {
					steps[steps.length - 1].result = 'error';
					messages.push({
						role: 'user',
						content: `Observation: Agent "${parsed.toAgent}" not found. Available agents: ${otherAgents.map((a) => a.firstName).join(', ')}`,
					});
				} else if (targetAgent.agentAccessLevel === 'closed') {
					steps[steps.length - 1].result = 'error';
					messages.push({
						role: 'user',
						content: `Observation: Agent "${parsed.toAgent}" is not accessible.`,
					});
				} else {
					try {
						const result = await this.executeAgentTask(targetAgent.id, parsed.message, budget);
						const observation = `Agent "${parsed.toAgent}" responded: ${result.summary ?? 'No summary'}`;
						steps[steps.length - 1].result = result.status === 'completed' ? 'success' : 'failed';
						messages.push({ role: 'user', content: `Observation: ${observation}` });
					} catch (error) {
						const errorMsg = error instanceof Error ? error.message : String(error);
						steps[steps.length - 1].result = 'error';
						messages.push({
							role: 'user',
							content: `Observation: Agent delegation failed: ${errorMsg}`,
						});
					}
				}
			} else {
				const validActions = canDelegate
					? '"execute_workflow", "send_message", or "complete"'
					: '"execute_workflow" or "complete"';
				messages.push({
					role: 'user',
					content: `Observation: Unknown action. Use ${validActions}.`,
				});
			}
		}

		return { status: 'completed', summary: 'Reached maximum iterations', steps };
	}

	private async runWorkflow(
		user: User,
		workflowId: string,
		agentPrompt?: string,
	): Promise<{ success: boolean; executionId: string; data?: unknown }> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:execute'],
			{ includeActiveVersion: true },
		);

		if (!workflow) {
			throw new Error(`Workflow ${workflowId} not found or agent lacks permission`);
		}

		const nodes = workflow.activeVersion?.nodes ?? workflow.nodes ?? [];
		const connections = workflow.activeVersion?.connections ?? workflow.connections ?? {};

		const triggerNode = findSupportedTrigger(nodes);
		if (!triggerNode) {
			throw new Error(
				`Workflow has no supported trigger. Supported: ${Object.values(SUPPORTED_TRIGGERS).join(', ')}`,
			);
		}

		const pinData = buildPinData(triggerNode, agentPrompt);

		const runData: IWorkflowExecutionDataProcess = {
			executionMode: getExecutionMode(triggerNode),
			workflowData: { ...workflow, nodes, connections },
			userId: user.id,
			startNodes: [{ name: triggerNode.name, sourceData: null }],
			pinData,
			executionData: createRunExecutionData({
				startData: {},
				resultData: { pinData, runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [
						{
							node: triggerNode,
							data: { main: [pinData[triggerNode.name]] },
							source: null,
						},
					],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			}),
		};

		const executionId = await this.workflowRunner.run(runData);

		const resultPromise = this.activeExecutions.getPostExecutePromise(executionId);
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Workflow execution timed out')), EXECUTION_TIMEOUT_MS);
		});

		const data = await Promise.race([resultPromise, timeoutPromise]);

		if (data === undefined) {
			throw new Error('Workflow did not return any data');
		}

		const success = data.status !== 'error' && !data.data.resultData?.error;

		return { success, executionId, data: data.data.resultData };
	}
}

function findSupportedTrigger(nodes: INode[]): INode | undefined {
	const supported = Object.keys(SUPPORTED_TRIGGERS);
	return nodes.find((node) => supported.includes(node.type) && !node.disabled);
}

function getExecutionMode(node: INode): WorkflowExecuteMode {
	switch (node.type) {
		case WEBHOOK_NODE_TYPE:
			return 'webhook';
		case CHAT_TRIGGER_NODE_TYPE:
			return 'chat';
		case MANUAL_TRIGGER_NODE_TYPE:
			return 'manual';
		default:
			return 'trigger';
	}
}

function buildPinData(node: INode, agentPrompt?: string): IPinData {
	switch (node.type) {
		case MANUAL_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							triggeredByAgent: true,
							timestamp: new Date().toISOString(),
							...(agentPrompt ? { message: agentPrompt } : {}),
						},
					},
				],
			};
		case WEBHOOK_NODE_TYPE:
			return {
				[node.name]: [{ json: { headers: {}, query: {}, body: {} } }],
			};
		case CHAT_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							sessionId: `agent-${Date.now()}`,
							action: 'sendMessage',
							chatInput: 'Triggered by agent',
						},
					},
				],
			};
		case FORM_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							submittedAt: new Date().toISOString(),
							formMode: 'agent',
						},
					},
				],
			};
		case SCHEDULE_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							timestamp: new Date().toISOString(),
							triggeredByAgent: true,
						},
					},
				],
			};
		default:
			return {};
	}
}

export function buildSystemPrompt(
	agentName: string,
	workflows: Array<{ id: string; name: string; active: boolean }>,
	otherAgents: Array<{ firstName: string; description: string }>,
	canDelegate: boolean,
): string {
	const workflowList = workflows
		.map((w) => `- ${w.name} (id: ${w.id}, active: ${w.active})`)
		.join('\n');

	let agentSection = '';
	if (canDelegate && otherAgents.length > 0) {
		const agentList = otherAgents
			.map((a) => `- ${a.firstName}${a.description ? `: ${a.description}` : ''}`)
			.join('\n');
		agentSection = `

You can also delegate tasks to other agents:
${agentList}

To send a message to another agent:
{"action": "send_message", "toAgent": "<firstName>", "message": "<what you need them to do>"}`;
	}

	const validActions = canDelegate
		? '"execute_workflow", "send_message", or "complete"'
		: '"execute_workflow" or "complete"';

	return `You are ${agentName}, an autonomous AI agent in an n8n workflow automation system.

You have access to these workflows:
${workflowList || '(none)'}
${agentSection}

RULES:
- Respond with exactly ONE JSON object per message. No markdown, no explanation, no code fences.
- After each action, you will receive an Observation with the result. Wait for it before deciding your next action.
- Do NOT batch multiple actions. One action per response, then wait.
- Valid actions: ${validActions}

To execute a workflow:
{"action": "execute_workflow", "workflowId": "<id>", "reasoning": "<why>"}

When the task is complete (after seeing all results):
{"action": "complete", "summary": "<what was accomplished>"}

If asked to run something multiple times, execute it once, wait for the result, then execute again.`;
}

export async function callLlm(messages: LlmMessage[]): Promise<string> {
	// Extract system message — Anthropic puts it as a top-level param
	const systemMessage = messages.find((m) => m.role === 'system')?.content ?? '';
	const conversationMessages = messages
		.filter((m) => m.role !== 'system')
		.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

	const response = await fetch(`${LLM_BASE_URL}/v1/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': LLM_API_KEY,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model: LLM_MODEL,
			system: systemMessage,
			messages: conversationMessages,
			temperature: 0.2,
			max_tokens: 1024,
		}),
	});

	if (!response.ok) {
		throw new Error(`LLM API returned ${response.status}: ${await response.text()}`);
	}

	const data = (await response.json()) as {
		content: Array<{ type: string; text: string }>;
	};
	return data.content.find((c) => c.type === 'text')?.text ?? '';
}
