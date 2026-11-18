import type {
	McpServerToolInput,
	McpServerToolTargetDto,
	McpServerSkillTargetDto,
} from '@n8n/api-types';
import { getWorkflowToolIncompatibilityReason } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User, WorkflowEntity } from '@n8n/db';
import { UserRepository, WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { INode } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { AgentTestRunService } from '@/modules/agents/agent-test-run.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { executeWorkflow } from '@/modules/agents/tools/workflow-tool-factory';
import { createAgentCredentialProvider } from '@/modules/agents/utils/agent-credential-provider';
import { SkillService } from '@/modules/skills';
import { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';
import {
	detectTriggerNode,
	listWorkflowInputFields,
} from '@/workflows/callable/callable-workflow-input';
import { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { McpServerToolEntity } from './database/mcp-server.entities';

export type ResolvedTarget =
	| {
			kind: 'workflow';
			id: string;
			name: string;
			description: string;
			projectId: string | null;
			inputs: McpServerToolInput[];
			available: boolean;
			reason?: string;
			workflow?: WorkflowEntity;
			triggerNode?: INode;
	  }
	| {
			kind: 'agent';
			id: string;
			name: string;
			description: string;
			projectId: string | null;
			inputs: McpServerToolInput[];
			available: boolean;
			reason?: string;
	  };

export interface ToolRunResult {
	ok: boolean;
	output: unknown;
	error?: string;
	executionId?: string;
	workflowId?: string;
}

const AGENT_INPUTS: McpServerToolInput[] = [
	{
		name: 'message',
		type: 'string',
		required: true,
		description: 'The question or task for the agent, in plain words.',
	},
];

function toInputType(type: string | undefined): McpServerToolInput['type'] {
	switch (type) {
		case 'number':
		case 'boolean':
		case 'object':
		case 'array':
			return type;
		default:
			return 'string';
	}
}

/** Lower snake case, the convention AI clients expect for tool names. */
export function toToolName(value: string): string {
	const name = value
		.normalize('NFKD')
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/[\s-]+/g, '_')
		.replace(/_+/g, '_')
		.toLowerCase()
		.slice(0, 64);
	return name || 'tool';
}

/**
 * Finds, describes and runs the workflows and agents behind tools. Every run uses the
 * rights of the server owner, for every caller (hack scope).
 */
@Service()
export class McpServerTargetsService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly ownershipService: OwnershipService,
		private readonly userRepository: UserRepository,
		private readonly skillService: SkillService,
	) {}

	async getOwner(ownerId: string): Promise<User> {
		const owner = await this.userRepository.findOne({
			where: { id: ownerId },
			relations: ['role'],
		});
		if (!owner) throw new Error('The owner of this MCP server no longer exists.');
		return owner;
	}

	// --- lookup ---------------------------------------------------------------

	async resolve(tool: Pick<McpServerToolEntity, 'kind' | 'targetId'>): Promise<ResolvedTarget> {
		if (tool.kind === 'agent') return await this.resolveAgent(tool.targetId);
		return await this.resolveWorkflow(tool.targetId);
	}

	private async resolveWorkflow(workflowId: string): Promise<ResolvedTarget> {
		const workflow = await this.workflowRepository.findOne({ where: { id: workflowId } });
		if (!workflow || workflow.isArchived) {
			return {
				kind: 'workflow',
				id: workflowId,
				name: 'Missing workflow',
				description: '',
				projectId: null,
				inputs: [],
				available: false,
				reason: 'The workflow was deleted or archived.',
			};
		}
		const projectId = await this.ownershipService
			.getWorkflowProjectCached(workflow.id)
			.then((project) => project.id)
			.catch(() => null);
		const base = {
			kind: 'workflow' as const,
			id: workflow.id,
			name: workflow.name,
			description: workflow.description?.trim() || `Runs the n8n workflow "${workflow.name}".`,
			projectId,
		};
		const incompatibility = getWorkflowToolIncompatibilityReason(workflow);
		if (incompatibility) {
			return {
				...base,
				inputs: [],
				available: false,
				reason:
					incompatibility.reason === 'incompatible_nodes'
						? 'The workflow has nodes that cannot run as a tool.'
						: 'Add a "When Executed by Another Workflow" trigger so the workflow can run as a tool.',
				workflow,
			};
		}
		const { node } = detectTriggerNode(workflow);
		const inputs = listWorkflowInputFields(node).map((field) => ({
			name: field.name,
			type: toInputType(field.type),
			required: false,
		}));
		return { ...base, inputs, available: true, workflow, triggerNode: node };
	}

	private async resolveAgent(agentId: string): Promise<ResolvedTarget> {
		const agent = await Container.get(AgentRepository).findById(agentId);
		if (!agent || agent.isArchived) {
			return {
				kind: 'agent',
				id: agentId,
				name: 'Missing agent',
				description: '',
				projectId: null,
				inputs: AGENT_INPUTS,
				available: false,
				reason: 'The agent was deleted or archived.',
			};
		}
		return {
			kind: 'agent',
			id: agent.id,
			name: agent.name,
			description: agentDescription(agent),
			projectId: agent.projectId,
			inputs: AGENT_INPUTS,
			available: true,
		};
	}

	// --- pickers --------------------------------------------------------------

	async listTargets(user: User, search = ''): Promise<McpServerToolTargetDto[]> {
		const term = search.trim().toLowerCase();
		const matches = (name: string) => term === '' || name.toLowerCase().includes(term);

		const { workflows } = await this.workflowFinderService.findWorkflowsForUser(
			user,
			['workflow:read'],
			{},
		);
		const seen = new Set<string>();
		const workflowTargets: McpServerToolTargetDto[] = [];
		for (const workflow of workflows.sort(
			(a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
		)) {
			if (seen.has(workflow.id) || workflow.isArchived || !matches(workflow.name)) continue;
			seen.add(workflow.id);
			const incompatibility = getWorkflowToolIncompatibilityReason(workflow);
			workflowTargets.push({
				kind: 'workflow',
				id: workflow.id,
				name: workflow.name,
				description: workflow.description ?? '',
				projectId: null,
				compatible: !incompatibility,
				...(incompatibility
					? { reason: 'Needs a "When Executed by Another Workflow" trigger' }
					: {}),
			});
		}

		let agentTargets: McpServerToolTargetDto[] = [];
		try {
			const { AgentsService } = await import('@/modules/agents/agents.service.js');
			const agents = await Container.get(AgentsService).findByUser(user.id);
			agentTargets = agents
				.filter((agent) => matches(agent.name))
				.map((agent) => ({
					kind: 'agent' as const,
					id: agent.id,
					name: agent.name,
					description: agentDescription(agent),
					projectId: agent.projectId,
					compatible: true,
				}));
		} catch (error) {
			this.logger.debug('MCP servers: could not list agents', { error: ensureError(error) });
		}

		return [...workflowTargets.slice(0, 200), ...agentTargets.slice(0, 100)];
	}

	async listSkills(user: User, search = ''): Promise<McpServerSkillTargetDto[]> {
		try {
			const result = await this.skillService.list(user, {
				skip: 0,
				take: 100,
				...(search.trim() ? { search: search.trim() } : {}),
			} as Parameters<SkillService['list']>[1]);
			return result.data.map((item) => ({
				id: item.id,
				name: item.name,
				description: item.description,
			}));
		} catch (error) {
			this.logger.debug('MCP servers: could not list skills', { error: ensureError(error) });
			return [];
		}
	}

	async readSkill(owner: User, skillId: string) {
		try {
			const detail = await this.skillService.get(owner, skillId);
			return {
				name: detail.skill.name,
				description: detail.skill.description,
				text: `# ${detail.skill.name}\n\n${detail.skill.description}\n\n${detail.skill.instructions}`,
			};
		} catch {
			return null;
		}
	}

	// --- runs -----------------------------------------------------------------

	async run(
		owner: User,
		target: ResolvedTarget,
		input: Record<string, unknown>,
		abortSignal?: AbortSignal,
	): Promise<ToolRunResult> {
		if (!target.available) {
			return { ok: false, output: null, error: target.reason ?? 'This tool is not available.' };
		}
		if (target.kind === 'agent') return await this.runAgent(owner, target, input, abortSignal);
		return await this.runWorkflow(target, input, abortSignal);
	}

	private async runWorkflow(
		target: Extract<ResolvedTarget, { kind: 'workflow' }>,
		input: Record<string, unknown>,
		abortSignal?: AbortSignal,
	): Promise<ToolRunResult> {
		const { workflow, triggerNode } = target;
		if (!workflow || !triggerNode) {
			return { ok: false, output: null, error: 'The workflow cannot run as a tool.' };
		}
		const projectId = target.projectId ?? '';
		const result = await executeWorkflow(
			Object.assign(workflow, { pinData: undefined }),
			triggerNode,
			input,
			{
				workflowLoader: Container.get(CallableWorkflowLoader),
				executor: Container.get(EphemeralNodeExecutor),
				workflowRunner: Container.get(WorkflowRunner),
				subworkflowPolicyChecker: Container.get(SubworkflowPolicyChecker),
				activeExecutions: Container.get(ActiveExecutions),
				projectId,
				executionMode: 'integrated',
				supportsHitl: false,
				abortSignal,
			},
		);
		const ok = result.status === 'success';
		return {
			ok,
			output: result.data ?? null,
			...(ok
				? {}
				: { error: result.error ?? `The workflow ended with status "${result.status}".` }),
			executionId: result.executionId,
			workflowId: workflow.id,
		};
	}

	private async runAgent(
		owner: User,
		target: Extract<ResolvedTarget, { kind: 'agent' }>,
		input: Record<string, unknown>,
		abortSignal?: AbortSignal,
	): Promise<ToolRunResult> {
		const projectId = target.projectId;
		if (!projectId) return { ok: false, output: null, error: 'The agent has no project.' };
		const message =
			typeof input.message === 'string' && input.message.trim()
				? input.message
				: JSON.stringify(input);
		const result = await Container.get(AgentTestRunService).executeDraftRun({
			agentId: target.id,
			projectId,
			message,
			user: owner,
			credentialProvider: createAgentCredentialProvider(
				Container.get(CredentialsService),
				projectId,
				owner,
			),
			source: 'mcp',
			abortSignal,
		});
		if (result.status === 'completed') {
			return { ok: true, output: { response: result.response }, executionId: result.executionId };
		}
		if (result.status === 'suspended') {
			return {
				ok: false,
				output: { response: result.response },
				error: 'The agent needs an approval that this MCP server cannot ask for.',
				executionId: result.executionId,
			};
		}
		if (result.status === 'agent_misconfigured') {
			return {
				ok: false,
				output: null,
				error: `The agent is not ready to run. Missing: ${result.missing.join(', ')}.`,
			};
		}
		return { ok: false, output: null, error: 'The agent session was not found.' };
	}
}

function agentDescription(agent: Pick<Agent, 'name'>): string {
	return `Ask the "${agent.name}" agent. Send a full question or task in plain words.`;
}
