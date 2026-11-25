import { Agent as RuntimeAgent, Tool, type StreamChunk } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import { ExecutionRetentionService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflowWithHistory,
	setActiveVersion,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import {
	ExecutionRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { createCredentials } from '../shared/db/credentials';
import { OperationalError } from '@n8n/errors';
import { WaitTracker } from '@/wait-tracker';
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test';
import type { ActionEvent } from 'chat';
import { InstanceSettings } from 'n8n-core';
import type { IExecuteFunctions, INodeType, INodeTypeData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { AgentChannelApproval } from 'n8n-nodes-base/nodes/AgentChannelApproval/AgentChannelApproval.node';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import {
	SubworkflowPolicyChecker,
	CredentialsPermissionChecker,
} from '@/executions/pre-execution-checks';
import { channelApprovalNode } from '@/modules/agents/integrations/channel-hitl';
import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '@/modules/agents/agent-sandbox-principal';
import { AgentApprovalCleanupService } from '@/modules/agents/approval/agent-approval-cleanup.service';
import { AgentChannelHitlService } from '@/modules/agents/approval/agent-channel-hitl.service';
import { AgentDecisionWorkflowService } from '@/modules/agents/approval/agent-decision-workflow.service';
import { getAgentRuntimeDefinitionHash } from '@/modules/agents/utils/agent-config-hash';
import { registerApprovalRuntime } from '@/modules/agents/approval/register-approval-runtime';
import { encodeReviewRequester } from '@/modules/agents/approval/review-requester';
import { AgentBackgroundJobService } from '@/modules/agents/background/agent-background-job.service';
import type { AgentChatIntegration } from '@/modules/agents/integrations/agent-chat-integration';
import { ChatIntegrationRegistry } from '@/modules/agents/integrations/agent-chat-integration';
import type { AgentCredentialLookupService } from '@/modules/agents/integrations/agent-credential-lookup.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { slackHitl } from '@/modules/agents/integrations/platforms/slack/slack-hitl';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentHitlWorkflowRepository } from '@/modules/agents/repositories/agent-hitl-workflow.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { createAgent } from '../shared/db/agents';
import { createSuccessfulExecution } from '../shared/db/executions';
import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';

type ModelTurn = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type ModelPart = ModelTurn['stream'] extends ReadableStream<infer P> ? P : never;
const usage = {
	inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 1, text: 1, reasoning: 0 },
};
function scriptedModel(input: Record<string, unknown>) {
	const turns: ModelPart[][] = [
		[
			{ type: 'stream-start', warnings: [] },
			{ type: 'tool-call', toolCallId: 'call', toolName: 'save', input: JSON.stringify(input) },
			{ type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage },
		],
		[
			{ type: 'stream-start', warnings: [] },
			{ type: 'text-start', id: 'text' },
			{ type: 'text-delta', id: 'text', delta: 'Done' },
			{ type: 'text-end', id: 'text' },
			{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage },
		],
	];
	return new MockLanguageModelV3({
		doStream: async () => ({ stream: convertArrayToReadableStream(turns.shift() ?? []) }),
	});
}
async function drain(stream: AsyncIterable<StreamChunk>) {
	const chunks: StreamChunk[] = [];
	for await (const chunk of stream) chunks.push(chunk);
	expect(chunks.filter(({ type }) => type === 'error')).toEqual([]);

	expect(
		chunks.filter((chunk) => chunk.type === 'tool-execution-end' && chunk.isError),
		JSON.stringify(chunks),
	).toEqual([]);
	return chunks;
}

// Only delivery is replaced. The engine still parks and resumes the channel node.
const send = vi.fn<(request: { message: unknown; approve: string; reject: string }) => void>();
const deliveryBody = z.object({
	blocks: z.array(
		z.object({
			text: z.object({ text: z.string() }).optional(),
			elements: z
				.array(z.object({ action_id: z.string(), text: z.object({ text: z.string() }) }))
				.optional(),
		}),
	),
});
const channel: INodeType = {
	description: new AgentChannelApproval().description,
	async execute(this: IExecuteFunctions) {
		const request: IExecuteFunctions['helpers']['requestWithAuthentication'] = async (
			_credential,
			options,
		) => {
			const { blocks } = deliveryBody.parse(options.body);
			const buttons = blocks.flatMap((block) => block.elements ?? []);
			send({
				message: blocks.find((block) => block.text)?.text?.text,
				approve: buttons.find((button) => button.text.text === 'Approve')!.action_id,
				reject: buttons.find((button) => button.text.text === 'Deny')!.action_id,
			});
			return { ok: true };
		};
		const helpers = { ...this.helpers, requestWithAuthentication: request };
		const context = new Proxy(this, {
			get: (target, property) => (property === 'helpers' ? helpers : Reflect.get(target, property)),
		});
		return await new AgentChannelApproval().execute.call(context);
	},
};
const trigger: INodeType = {
	description: {
		name: 'agentDecisionTrigger',
		displayName: 'Agent review',
		group: ['trigger'],
		version: 1,
		defaults: { name: 'Agent review' },
		description: 'Start the test approval',
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
	async execute(this: IExecuteFunctions) {
		return [this.getInputData()];
	},
};
const nodes: INodeTypeData = {
	'n8n-nodes-base.agentChannelApproval': { type: channel, sourcePath: '' },
	'n8n-nodes-base.agentDecisionTrigger': { type: trigger, sourcePath: '' },
};

describe('Durable channel approval lifecycle', () => {
	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		registerApprovalRuntime();
		await utils.initNodeTypes(nodes);
		await utils.initBinaryDataService();
	});
	afterAll(async () => await testDb.terminate());
	beforeEach(() => send.mockClear());
	afterEach(() => vi.restoreAllMocks());

	it('rejects a credential outside the private execution owner project', async () => {
		const project = await createTeamProject();
		const otherProject = await createTeamProject();
		const agent = await createAgent({ name: 'Reviewer', projectId: project.id });
		const credential = await createCredentials(
			{ type: 'slackApi', name: 'Other channel', data: '' },
			otherProject,
		);
		const ownerId = await Container.get(AgentHitlWorkflowRepository).ensureExecutionOwner(
			project.id,
			agent.id,
		);
		const node = channelApprovalNode(
			slackHitl.createNode({
				id: generateNanoId(),
				name: 'Review',
				method: 'channel',
				channel: 'slack',
				credentialId: credential.id,
				recipient: { kind: 'user', id: 'U1' },
			}),
			'slack',
		);
		await expect(
			Container.get(CredentialsPermissionChecker).check(ownerId, [node]),
		).rejects.toThrow('does not have access');
	});

	it.each([
		{ label: 'single review', approved: true, destination: 'user', method: 'channel' },
		{ label: 'single review', approved: false, destination: 'user', method: 'channel' },
		{
			label: 'deferred resume',
			approved: true,
			destination: 'user',
			method: 'channel',
			deferResume: true,
		},
		{ label: 'single review', approved: true, destination: 'channel', method: 'channel' },
		{ label: 'single review', approved: false, destination: 'channel', method: 'channel' },
		{ label: 'single review', approved: true, destination: 'channel', method: 'workflow' },
		{ label: 'single review', approved: false, destination: 'channel', method: 'workflow' },
		{
			label: 'review sequence',
			approved: true,
			destination: 'channel',
			method: 'workflow',
			sequence: true,
		},
		{
			label: 'review sequence',
			approved: false,
			destination: 'channel',
			method: 'workflow',
			sequence: true,
		},
		{
			label: 'cancelled review',
			approved: false,
			destination: 'channel',
			method: 'channel',
			cancelled: true,
		},
		{
			label: 'cancelled review',
			approved: false,
			destination: 'channel',
			method: 'workflow',
			cancelled: true,
		},
	] as const)(
		'resumes a $method approval to a $destination with approved=$approved ($label)',
		async (scenario) => {
			const { approved, destination, method } = scenario;
			const sequence = 'sequence' in scenario;
			const project = await createTeamProject();
			const credential = await createCredentials(
				{ type: 'slackApi', name: 'Review channel', data: '' },
				project,
			);
			const agents = Container.get(AgentRepository);
			const agent = await createAgent({ name: 'Reviewer', projectId: project.id });
			const caller = await createWorkflowWithHistory({ name: 'Approval caller' }, project);
			const callerExecution = await createSuccessfulExecution(caller);
			const threadId = generateNanoId();
			const executions = Container.get(ExecutionPersistence);
			const jobs = Container.get(AgentBackgroundJobRepository);
			const registry = new ChatIntegrationRegistry();
			registry.register(
				mock<AgentChatIntegration>({
					type: 'slack',
					hitl: slackHitl,
					credentialTypes: ['slackApi'],
				}),
			);
			const channels = new AgentChannelHitlService(
				Container.get(AgentRepository),
				registry,
				mock<AgentCredentialLookupService>(),
				Container.get(OutboundHttp),
				executions,
				jobs,
				Container.get(InstanceSettings),
			);
			Container.set(AgentChannelHitlService, channels);
			const service = new AgentDecisionWorkflowService(
				Container.get(CallableWorkflowLoader),
				Container.get(SubworkflowPolicyChecker),
				Container.get(ActiveExecutions),
				Container.get(AgentBackgroundJobService),
				jobs,
				executions,
				mock<AgentsConfig>({ humanReviewEnabled: true }),
			);
			const config: AgentJsonConfig = {
				name: 'Reviewer',
				model: 'test',
				instructions: 'Review the request',
				hitlConfigurations: [
					{
						id: 'review_test',
						name: 'Review',
						method: 'channel',
						channel: 'slack',
						credentialId: credential.id,
						recipient: {
							kind: destination,
							id: destination === 'user' ? 'U_REVIEWER' : 'C_REVIEW',
						},
					},
				],
			};
			if (method === 'workflow') {
				const channelConfiguration = config.hitlConfigurations?.[0];
				if (channelConfiguration?.method !== 'channel')
					throw new Error('Expected a channel destination');
				const graph = channels.buildWorkflow(
					channelConfiguration,
					[{ type: 'slack', credentialId: credential.id }],
					generateNanoId(),
				);
				graph.nodes[1].parameters.parameters = {
					...(graph.nodes[1].parameters.parameters as object),
					message: '={{ $json.toolName + " requested by " + $json.requester.name }}',
				};
				const workflow = await createWorkflowWithHistory(
					{
						id: graph.id,
						name: 'Decision workflow',
						nodes: graph.nodes,
						connections: graph.connections,
						settings: graph.settings,
					},
					project,
				);
				await setActiveVersion(workflow.id, workflow.versionId);
				await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
					workflow.id,
					workflow.versionId,
				);
				config.hitlConfigurations = [
					{
						id: channelConfiguration.id,
						name: 'Decision workflow',
						method: 'workflow',
						workflowId: workflow.id,
					},
				];
			}
			if (sequence && config.hitlConfigurations?.[0])
				config.hitlConfigurations.push({
					...config.hitlConfigurations[0],
					id: 'review_second',
				});
			const handler = vi.fn().mockResolvedValue({ saved: true });
			const tool = new Tool('save')
				.description('Save a record')
				.input(z.object({ title: z.string() }))
				.handler(handler)
				.build();
			const wrapped = service.wrap(
				tool,
				{
					type: 'configuration',
					configurationIds: config.hitlConfigurations?.map(({ id }) => id) ?? [],
				},
				config,
				{
					agentId: agent.id,
					projectId: project.id,
					published: true,
					integrationType: 'slack',
					integrations: [{ type: 'slack', credentialId: credential.id }],
				},
			);
			const input = { title: 'A record' };
			const checkpoints = Container.get(N8NCheckpointStorage);
			const model = scriptedModel(input);
			const definitionHash = getAgentRuntimeDefinitionHash(config, {}, [
				{ type: 'slack', credentialId: credential.id },
			]);
			const buildAgent = () =>
				new RuntimeAgent('Reviewer')
					.instructions(config.instructions)
					.model(model)
					.tool(wrapped)
					.checkpoint(checkpoints.getStorage(agent.id, definitionHash));
			const first = await buildAgent().stream('Save the record', {
				persistence: {
					threadId,
					resourceId: 'resource',
					hostMetadata: {
						...encodeReviewRequester({ id: 'U_REQUESTER', name: 'Alex Example', source: 'slack' }),
						workflowCaller: JSON.stringify({
							workflowId: caller.id,
							executionId: callerExecution.id,
						}),
						...encodeAgentSandboxHostMetadata({
							projectId: project.id,
							principalHash: hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user' }),
						}),
					},
				},
			});
			await drain(first.stream);
			expect(await checkpoints.load(first.runId, agent.id)).toMatchObject({ status: 'suspended' });
			expect(send).not.toHaveBeenCalled();
			expect(await jobs.findByParentThread(threadId)).toEqual([]);
			const confirmed = await buildAgent().resume(
				'stream',
				{ approved: true },
				{
					runId: first.runId,
					toolCallId: 'call',
				},
			);
			await drain(confirmed.stream);
			expect(handler).not.toHaveBeenCalled();
			expect(send).toHaveBeenCalledOnce();
			expect(send.mock.calls[0][0].message).toContain(
				method === 'channel'
					? 'Requested by: Alex Example (U_REQUESTER)'
					: 'save requested by Alex Example',
			);
			const [job] = await jobs.findByParentThread(threadId);
			expect(job).toMatchObject({ kind: 'approval', status: 'running', parentRunId: first.runId });
			const childId = job.childExecutionId!;
			await expect(executions.hardDeleteById(childId)).rejects.toThrow('pending work');
			await expect(executions.hardDeleteById(callerExecution.id)).rejects.toThrow('pending work');
			await Container.get(AgentCheckpointRepository).update(
				{ runId: first.runId },
				{ updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
			);
			expect(await checkpoints.load(first.runId, agent.id)).toMatchObject({ status: 'suspended' });
			expect(await checkpoints.findSuspendedForThread(agent.id, threadId)).toMatchObject({
				status: 'suspended',
			});
			expect(await Container.get(ExecutionRetentionService).getRetainedExecutionIds()).toContain(
				childId,
			);

			const ownerId =
				method === 'channel'
					? await Container.get(AgentHitlWorkflowRepository).ensureExecutionOwner(
							project.id,
							agent.id,
						)
					: null;
			if (ownerId) {
				expect(ownerId).toMatch(/^[a-zA-Z0-9_-]{16}$/);
				expect(job.workflowId).toBe(ownerId);
				expect(await Container.get(SharedWorkflowRepository).countBy({ workflowId: ownerId })).toBe(
					0,
				);
				const admin = await createOwner();
				expect(
					await Container.get(WorkflowFinderService).findWorkflowForUser(ownerId, admin, [
						'workflow:read',
					]),
				).toBeNull();
				expect(
					await Container.get(WorkflowFinderService).findWorkflowForUser(ownerId, admin, [
						'workflow:delete',
					]),
				).toBeNull();
				expect(await Container.get(WorkflowRepository).findOneBy({ id: ownerId })).toMatchObject({
					isArchived: true,
					nodes: [],
				});
			} else {
				expect(job.workflowId).toBe(
					config.hitlConfigurations?.[0]?.method === 'workflow'
						? config.hitlConfigurations[0].workflowId
						: undefined,
				);
			}

			expect(await executions.findSingleExecution(childId)).toMatchObject({ status: 'waiting' });
			const event = mock<ActionEvent>({
				actionId:
					approved || sequence ? send.mock.calls[0][0].approve : send.mock.calls[0][0].reject,
				user: mock({ userId: 'U_REVIEWER' }),
				adapter: mock({ decodeThreadId: vi.fn().mockReturnValue({ channel: 'C_REVIEW' }) }),
			});
			if ('cancelled' in scenario) {
				await Container.get(AgentApprovalCleanupService).cleanupAgent(
					agent.id,
					project.id,
					ownerId,
				);
				expect(await jobs.findWorkflowJobByExecutionId(childId)).toMatchObject({
					status: 'cancelled',
					notifiedAt: expect.any(Date),
				});
				expect(handler).not.toHaveBeenCalled();
				expect(
					await channels.respond(
						agent.id,
						project.id,
						{ type: 'slack', credentialId: credential.id },
						event,
					),
				).toBe('unavailable');
				await expect(
					buildAgent().resume('stream', {}, { runId: first.runId, toolCallId: 'call' }),
				).rejects.toThrow();
				await expect(executions.hardDeleteById(callerExecution.id)).resolves.not.toThrow();
				return;
			}

			const coreTracker = Container.get(WaitTracker);
			const immediateResume =
				'deferResume' in scenario
					? vi
							.spyOn(coreTracker, 'startExecution')
							.mockRejectedValueOnce(new OperationalError('Unavailable'))
					: undefined;

			expect(
				await channels.respond(
					agent.id,
					project.id,
					{ type: 'slack', credentialId: credential.id },
					event,
				),
			).toBe(approved || sequence);
			if (immediateResume) {
				immediateResume.mockRestore();
				const saved = await executions.findSingleExecution(childId, {
					includeData: true,
					unflattenData: true,
				});
				expect(saved?.status).toBe('waiting');
				expect(saved?.data.executionData?.nodeExecutionStack[0].node.disabled).toBe(true);
				expect(
					(await Container.get(ExecutionRepository).getWaitingExecutions()).map(({ id }) => id),
				).toContain(childId);
				const opposite = { ...event, actionId: send.mock.calls[0][0].reject };
				expect(
					await channels.respond(
						agent.id,
						project.id,
						{ type: 'slack', credentialId: credential.id },
						opposite,
					),
				).toBe('unavailable');
				// A later poll uses only the durable execution ID, with no response held in memory.
				await coreTracker.startExecution(childId);
			}
			await Container.get(ActiveExecutions).getPostExecutePromise(childId);
			expect(await executions.findSingleExecution(childId)).toMatchObject({ status: 'success' });
			// Rebuild the Agent to prove that only the durable checkpoint carries the continuation.
			const resumed = await buildAgent().resume(
				'stream',
				{ type: 'workflow_finished', value: 'success' },
				{ runId: first.runId, toolCallId: 'call' },
			);
			let chunks = await drain(resumed.stream);
			if (sequence) {
				expect(handler).not.toHaveBeenCalled();
				expect(send).toHaveBeenCalledTimes(2);
				const secondJob = await jobs.findByParentThread(threadId);
				const nextJob = secondJob.find((entry) => entry.childExecutionId !== childId);
				if (!nextJob?.childExecutionId) throw new Error('Expected the second review execution');
				const secondEvent = mock<ActionEvent>({
					...event,
					actionId: approved ? send.mock.calls[1][0].approve : send.mock.calls[1][0].reject,
				});
				expect(
					await channels.respond(
						agent.id,
						project.id,
						{ type: 'slack', credentialId: credential.id },
						secondEvent,
					),
				).toBe(approved);
				await Container.get(ActiveExecutions).getPostExecutePromise(nextJob.childExecutionId);
				const final = await buildAgent().resume(
					'stream',
					{ type: 'workflow_finished', value: 'success' },
					{ runId: first.runId, toolCallId: 'call' },
				);
				chunks = await drain(final.stream);
			}

			expect(JSON.stringify(chunks)).toContain(approved ? 'saved' : 'declined');
			if (approved) expect(handler).toHaveBeenCalledWith(input, expect.any(Object));
			expect(handler).toHaveBeenCalledTimes(approved ? 1 : 0);
			expect(
				await channels.respond(
					agent.id,
					project.id,
					{ type: 'slack', credentialId: credential.id },
					event,
				),
			).toBe('unavailable');
			expect(send).toHaveBeenCalledTimes(sequence ? 2 : 1);
			await expect(
				buildAgent().resume('stream', {}, { runId: first.runId, toolCallId: 'call' }),
			).rejects.toThrow();
			expect(await jobs.findWorkflowJobByExecutionId(childId)).toMatchObject({
				status: 'completed',
				notifiedAt: expect.any(Date),
			});
			await Container.get(AgentApprovalCleanupService).cleanupAgent(agent.id, project.id, ownerId);
			if (ownerId) {
				expect(await executions.findSingleExecution(childId)).toBeUndefined();
				expect(await Container.get(WorkflowRepository).findOneBy({ id: ownerId })).toBeNull();
				expect(await agents.findOneBy({ id: agent.id })).toMatchObject({
					approvalWorkflowId: null,
				});
			} else
				expect(await executions.findSingleExecution(childId)).toMatchObject({ status: 'success' });
		},
	);
});
