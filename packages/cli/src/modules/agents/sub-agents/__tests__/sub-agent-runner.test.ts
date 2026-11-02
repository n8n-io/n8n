import type { AgentKnowledgeUsageTracker } from '../../agent-knowledge-usage-tracker';
import type { AgentMessageSteeringService } from '../../agent-message-steering.service';
import {
	encodeEpisodicScopeMetadata,
	EPISODIC_SCOPE_METADATA_KEY,
	INLINE_SUB_AGENT_ID,
	type BuiltAgent,
	type BuiltTelemetry,
	type CredentialProvider,
	type StreamChunk,
	type StreamResult,
	type ToolApprovalContext,
} from '@n8n/agents';
import type {
	ResolvedSubAgentSource,
	RunnableAgentJsonConfig,
	SubAgentSpawnRequest,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { Mocked } from 'vitest';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import type { AgentExecutionService } from '../../agent-execution.service';
import type { AgentMessageQueueService } from '../../agent-message-queue.service';
import type { AgentChatExecutionService } from '../../agent-chat-execution.service';
import { AgentTurnExecutionService } from '../../agent-turn-execution.service';
import type { AgentToolApprovalService } from '../../agent-tool-approval.service';
import { AgentRuntimeReconstructionService } from '../../agent-runtime-reconstruction.service';
import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../../agent-sandbox-principal';
import type { AgentSandboxRuntime } from '../../agent-sandbox-runtime.service';
import { AgentSpendLedger } from '../../budget-guardrail';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import type { SystemAgentUsageRelay } from '../../system-agents/system-agent-usage-relay';
import { SubAgentRunner } from '../sub-agent-runner';
import type {
	ResolvedSubAgentRuntimeSource,
	SubAgentSourceResolver,
} from '../sub-agent-source-resolver';

const aiConfigMock = mock<AiConfig>();
const toolApprovalService = mock<AgentToolApprovalService>();

const projectId = 'project-1';
const parentThreadId = 'parent-thread-1';
const parentAgentId = 'parent-agent-1';

const runnableConfig: RunnableAgentJsonConfig = {
	name: 'Helper Agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'credential-1',
	instructions: 'Help with delegated work.',
};

const source: ResolvedSubAgentSource = {
	sourceId: 'agent-1',
	config: runnableConfig,
};

const runtimeSource: ResolvedSubAgentRuntimeSource = {
	source,
	toolDescriptors: {
		tool_1: {
			name: 'lookup_customer',
			description: 'Look up a customer',
			systemInstruction: null,
			inputSchema: {
				type: 'object',
				properties: {},
			},
			outputSchema: null,
			hasSuspend: false,
			hasResume: false,
			hasToMessage: false,
			requireApproval: false,
			providerOptions: null,
		},
	},
	toolCodeByName: {
		lookup_customer: 'return input;',
	},
	skills: {
		skill_1: {
			name: 'Skill 1',
			description: 'Helps with tests',
			instructions: 'Skill body',
		},
	},
};

const spawnRequest: SubAgentSpawnRequest = {
	goal: 'Find the relevant API behavior.',
	context: 'Focus on auth endpoints.',
	expectedOutput: 'A concise summary.',
	source: {
		agentId: 'agent-1',
	},
	parentThreadId,
	taskPath: '/root/research_api_0',
};

const delegatedRequest = {
	subAgentId: 'agent-1',
	taskName: 'Research API',
	goal: spawnRequest.goal,
	context: spawnRequest.context,
	expectedOutput: spawnRequest.expectedOutput,
	taskPath: '/root/research_api_0' as const,
	childCount: 0,
};

const defaultStreamChunks: StreamChunk[] = [
	{ type: 'text-delta', id: 'text-1', delta: 'Child answer' },
	{
		type: 'finish',
		finishReason: 'stop',
		model: 'anthropic/claude-sonnet-4-5',
		usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 },
	},
];

describe('SubAgentRunner', () => {
	let sourceResolver: Mocked<SubAgentSourceResolver>;
	let reconstructionService: Mocked<AgentRuntimeReconstructionService>;
	let runner: SubAgentRunner;
	let childAgent: Mocked<BuiltAgent>;
	let agentExecutionService: Mocked<AgentExecutionService>;
	let knowledgeUsageTracker: Mocked<AgentKnowledgeUsageTracker>;
	let logger: Mocked<Logger>;
	let checkpointStorage: Mocked<N8NCheckpointStorage>;
	let credentialProvider: Mocked<CredentialProvider>;
	let executionRepository: Mocked<AgentExecutionRepository>;
	let usageRelay: Mocked<SystemAgentUsageRelay>;
	let attachmentService: Mocked<AgentChatAttachmentService>;

	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();
		sourceResolver = mock<SubAgentSourceResolver>();
		sourceResolver.resolveForRuntime.mockResolvedValue(runtimeSource);
		reconstructionService = mock<AgentRuntimeReconstructionService>();
		Container.set(AgentRuntimeReconstructionService, reconstructionService);
		agentExecutionService = mock<AgentExecutionService>();
		agentExecutionService.getAbortSignal.mockReturnValue(new AbortController().signal);
		agentExecutionService.startExecutionRecording.mockImplementation(
			async (_params, startedAt) => ({
				executionId: 'agent-execution-1',
				startedAt,
				inputMessageIds: ['message-1'],
			}),
		);
		agentExecutionService.finalizeExecution.mockResolvedValue('agent-execution-1');
		checkpointStorage = mock<N8NCheckpointStorage>();
		knowledgeUsageTracker = mock<AgentKnowledgeUsageTracker>();
		logger = mock<Logger>();
		executionRepository = mock<AgentExecutionRepository>();
		usageRelay = mock<SystemAgentUsageRelay>();
		attachmentService = mock<AgentChatAttachmentService>();
		attachmentService.returnToParent.mockResolvedValue([]);
		executionRepository.findLinksForChildOf.mockResolvedValue(null);
		executionRepository.findFirstLinksInThread.mockResolvedValue(null);
		runner = new SubAgentRunner(
			sourceResolver,
			new AgentTurnExecutionService(
				logger,
				agentExecutionService,
				mock<AgentChatExecutionService>(),
				mock<AgentMessageQueueService>(),
				mock<AgentMessageSteeringService>(),
				toolApprovalService,
				knowledgeUsageTracker,
			),
			checkpointStorage,
			logger,
			aiConfigMock,
			toolApprovalService,
			executionRepository,
			usageRelay,
			attachmentService,
		);

		childAgent = mock<BuiltAgent>();
		childAgent.stream.mockResolvedValue(makeStreamResult(defaultStreamChunks));
		childAgent.resume.mockImplementation(async (_method, _data, options) => {
			await options.onResumeClaimed?.();
			return makeStreamResult(defaultStreamChunks);
		});
		childAgent.close.mockResolvedValue(undefined);
		reconstructionService.reconstructFromResolvedSource.mockResolvedValue({
			agent: childAgent as never,
			toolRegistry: new Map(),
			mcpServerAttributions: new Map(),
		});

		credentialProvider = mock<CredentialProvider>();
	});

	it('resolves reconstruction from the container at run time', async () => {
		await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
		});

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledTimes(1);
	});

	it('sends the knowledge use of the child run when it ends', async () => {
		await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
		});

		expect(knowledgeUsageTracker.sendRunUsage).toHaveBeenCalledTimes(1);
		expect(knowledgeUsageTracker.sendRunUsage).toHaveBeenCalledWith(
			'child-run-1',
			expect.objectContaining({ runType: 'production' }),
		);
	});

	it('grants the passed files to the child before it runs and returns the files it made', async () => {
		const made = { fileId: 'out-1', fileName: 'out.png', mimeType: 'image/png', sizeBytes: 3 };
		attachmentService.grantToSubAgent.mockImplementation(async () => {
			expect(childAgent.stream).not.toHaveBeenCalled();
		});
		attachmentService.returnToParent.mockResolvedValue([made]);

		const result = await runner.run(
			{ ...spawnRequest, fileIds: ['in-1'] },
			{ parentAgentId, projectId, credentialProvider, runType: 'test' },
		);

		expect(attachmentService.grantToSubAgent).toHaveBeenCalledWith(['in-1'], {
			projectId,
			parentThreadId,
			childThreadId: result.threadId,
		});
		expect(JSON.stringify(childAgent.stream.mock.calls[0][0])).toContain('FILES');
		expect(attachmentService.returnToParent).toHaveBeenCalledWith({
			projectId,
			parentThreadId,
			childThreadId: result.threadId,
		});
		expect(result.files).toEqual([made]);
	});

	it('does not run the child when a passed file cannot be granted', async () => {
		attachmentService.grantToSubAgent.mockRejectedValue(
			new UserError('File "other" not found in this conversation'),
		);

		await expect(
			runner.run(
				{ ...spawnRequest, fileIds: ['other'] },
				{ parentAgentId, projectId, credentialProvider, runType: 'test' },
			),
		).rejects.toThrow('File "other" not found in this conversation');
		expect(childAgent.stream).not.toHaveBeenCalled();
	});

	it('keeps the child answer when the output files cannot be listed', async () => {
		attachmentService.returnToParent.mockRejectedValue(new Error('db down'));

		const result = await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'test',
		});

		expect(result.status).toBe('completed');
		expect(result.files).toBeUndefined();
		expect(result.filesError).toBe('The files of the sub-agent could not be listed');
	});

	it.each([
		['a disabled decision', { disabled: true as const }],
		['a resolved scope', { writeScopeId: 'slack:T1:C1', readScopeIds: ['slack:T1:C1'] }],
	])(
		'keeps the parent turn episodic scope for the child: %s',
		async (_label, parentEpisodicScope) => {
			agentExecutionService.startExecutionRecording.mockImplementation(
				async (_params, startedAt) => ({
					executionId: 'agent-execution-1',
					startedAt,
					inputMessageIds: ['message-1'],
				}),
			);
			agentExecutionService.finalizeExecution.mockResolvedValue('agent-execution-1');

			await runner.run(
				{ ...spawnRequest, parentResourceId: 'task:task-1' },
				{
					parentAgentId,
					projectId,
					credentialProvider,
					runType: 'production',
					parentEpisodicScope,
				},
			);

			const options = childAgent.stream.mock.calls[0][1];
			expect(options?.persistence?.hostMetadata).toMatchObject(
				encodeEpisodicScopeMetadata(parentEpisodicScope),
			);
		},
	);

	it('leaves a task resource child on its own scope when the parent decided nothing', async () => {
		agentExecutionService.startExecutionRecording.mockImplementation(
			async (_params, startedAt) => ({
				executionId: 'agent-execution-1',
				startedAt,
				inputMessageIds: ['message-1'],
			}),
		);
		agentExecutionService.finalizeExecution.mockResolvedValue('agent-execution-1');

		await runner.run(
			{ ...spawnRequest, parentResourceId: 'task:task-1' },
			{ parentAgentId, projectId, credentialProvider, runType: 'production' },
		);

		expect(childAgent.stream.mock.calls[0][1]?.persistence?.hostMetadata).not.toHaveProperty(
			EPISODIC_SCOPE_METADATA_KEY,
		);
	});

	it('uses the captured job pause signal without an ancestor lookup', async () => {
		const shouldPause = vi.fn().mockResolvedValue(true);
		await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
			shouldPause,
		});

		expect(await childAgent.stream.mock.calls[0][1]?.shouldPause?.()).toBe(true);
	});

	it('rebuilds the child through the shared reconstruction service and runs it with a fresh prompt', async () => {
		agentExecutionService.startExecutionRecording.mockImplementation(
			async (_params, startedAt) => ({
				executionId: 'agent-execution-1',
				startedAt,
				inputMessageIds: ['message-1'],
			}),
		);
		agentExecutionService.finalizeExecution.mockResolvedValue('agent-execution-1');
		const result = await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
		});

		expect(result).toMatchObject({
			taskPath: '/root/research_api_0',
			threadId: expect.any(String),
			status: 'completed',
			result: expect.objectContaining({
				runId: 'child-run-1',
				finishReason: 'stop',
				usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 },
			}),
		});
		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith({
			config: runnableConfig,
			memoryOwnerAgentId: 'agent-1',
			projectId,
			credentialProvider,
			runType: 'production',
			toolDescriptors: runtimeSource.toolDescriptors,
			toolCodeByName: runtimeSource.toolCodeByName,
			skills: runtimeSource.skills,
			runtimeProfile: 'sub-agent',
			parentAgentIdForDelegation: parentAgentId,
			user: undefined,
		});
		expect(childAgent.close).toHaveBeenCalledTimes(1);
		expect(childAgent.stream).toHaveBeenCalledWith(
			[
				{
					id: 'message-1',
					role: 'user',
					content: [
						{
							type: 'text',
							text: expect.stringContaining('YOUR TASK:\nFind the relevant API behavior.'),
						},
					],
				},
			],
			expect.objectContaining({
				persistence: {
					resourceId: result.threadId,
					threadId: result.threadId,
					delegated: true,
					hostMetadata: { n8nExecutionId: 'agent-execution-1' },
				},
			}),
		);
		const [input] = childAgent.stream.mock.calls[0][0] as Array<{
			content: Array<{ text: string }>;
		}>;
		const childPrompt = input.content[0].text;
		expect(childPrompt).toContain('CONTEXT:\nFocus on auth endpoints.');
		expect(childPrompt).toContain('EXPECTED OUTPUT:\nA concise summary.');
		expect(agentExecutionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({ threadId: result.threadId, source: 'subagent' }),
			expect.any(Date),
		);
		expect(agentExecutionService.recordTimelineSnapshot).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId,
				agentId: 'agent-1',
				threadId: result.threadId,
				executionId: 'agent-execution-1',
			}),
		);
		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({
				threadId: result.threadId,
				agentId: 'agent-1',
				source: 'subagent',
				telemetry: {
					runType: 'production',
					configuration: expect.objectContaining({
						model: 'anthropic/claude-sonnet-4-5',
					}),
				},
			}),
		);
		const startedAt = agentExecutionService.startExecutionRecording.mock.calls[0][1];
		const finalizedRecord = agentExecutionService.finalizeExecution.mock.calls[0][1].record;
		expect(startedAt.getTime()).toBe(finalizedRecord.startTime);
	});

	it('appends the MCP registry attribution to the child answer and forwards it to the parent', async () => {
		reconstructionService.reconstructFromResolvedSource.mockResolvedValue({
			agent: childAgent as never,
			toolRegistry: new Map(),
			mcpServerAttributions: new Map([['Databricks Genie', 'Powered by Genie']]),
		});
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'Databricks_Genie_ask',
					output: 'rows',
					mcpServerName: 'Databricks Genie',
				},
				...defaultStreamChunks,
			]),
		);
		const onChunk = vi.fn();

		const result = await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
			onChunk,
		});

		expect(result.result.messages).toEqual([
			expect.objectContaining({
				content: [{ type: 'text', text: 'Child answer\n\nPowered by Genie' }],
			}),
		]);
		expect(onChunk).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'text-delta', delta: '\n\nPowered by Genie' }),
		);
		const finalizedRecord = agentExecutionService.finalizeExecution.mock.calls[0][1].record;
		expect(finalizedRecord.assistantResponse).toBe('Child answer\n\nPowered by Genie');
	});

	it('runs the child on a caller-supplied childThreadId instead of minting one', async () => {
		// The seam a background dispatcher relies on: its durable job row points
		// at this id, so orphan reconciliation only works if the run honors it.
		const result = await runner.run(
			{ ...spawnRequest, childThreadId: 'pre-minted-thread' },
			{
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(result.threadId).toBe('pre-minted-thread');
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(Array),
			expect.objectContaining({
				persistence: expect.objectContaining({ threadId: 'pre-minted-thread' }),
			}),
		);
	});

	it('records the child turn with the parent run type, not its own published state', async () => {
		const result = await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'test',
		});

		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({
				threadId: result.threadId,
				agentId: 'agent-1',
				telemetry: expect.objectContaining({ runType: 'test' }),
			}),
		);
	});

	it.each([
		{ runType: 'test' as const, usePublishedVersion: false },
		{ runType: 'production' as const, usePublishedVersion: true },
	])(
		'resolves the child draft for test runs and the published version for production ($runType)',
		async ({ runType, usePublishedVersion }) => {
			await runner.run(spawnRequest, { parentAgentId, projectId, credentialProvider, runType });

			expect(sourceResolver.resolveForRuntime).toHaveBeenCalledWith(spawnRequest.source, {
				projectId,
				usePublishedVersion,
			});
		},
	);

	it.each(['integrated', 'manual'] as const)(
		'reconstructs child workflow tools with the parent %s execution mode',
		async (workflowToolExecutionMode) => {
			await runner.run(spawnRequest, {
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
				workflowToolExecutionMode,
			});

			expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
				expect.objectContaining({ workflowToolExecutionMode }),
			);
		},
	);

	it('filters sub-agent tools by the delegating user access when the parent run has a user', async () => {
		const user = mock<User>({ id: 'user-1' });

		await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
			user,
		});

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
			expect.objectContaining({ user }),
		);
	});

	it('inherits the parent resource id as the child memory scope when provided', async () => {
		const result = await runner.run(
			{ ...spawnRequest, parentResourceId: 'draft-chat:user-1' },
			{
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(Array),
			expect.objectContaining({
				persistence: {
					resourceId: 'draft-chat:user-1',
					threadId: result.threadId,
					delegated: true,
					hostMetadata: { n8nExecutionId: 'agent-execution-1' },
				},
			}),
		);
		expect(result.threadId).toEqual(expect.any(String));
	});

	it('inherits the parent workspace principal on the initial run and resume', async () => {
		const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-1' });
		const result = await runner.run(
			{ ...spawnRequest, parentSandboxPrincipalHash: principalHash },
			{
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenLastCalledWith(
			expect.objectContaining({ sandboxPrincipalHash: principalHash }),
		);
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(Array),
			expect.objectContaining({
				persistence: expect.objectContaining({
					hostMetadata: {
						...encodeAgentSandboxHostMetadata({ projectId, principalHash }),
						n8nExecutionId: 'agent-execution-1',
					},
				}),
			}),
		);

		checkpointStorage.load.mockResolvedValue({
			status: 'suspended',
			persistence: {
				threadId: result.threadId,
				resourceId: result.threadId,
				delegated: true,
				hostMetadata: {
					...encodeAgentSandboxHostMetadata({ projectId, principalHash }),
					n8nExecutionId: 'agent-execution-1',
				},
			},
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			pendingToolCalls: {},
		});
		await runner.resumeForeground(
			{
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				childThreadId: result.threadId,
				resumeData: { approved: true },
				resumeContext: { agentId: 'agent-1', versionId: 'version-7' },
				parentThreadId,
			},
			{
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenLastCalledWith(
			expect.objectContaining({ sandboxPrincipalHash: principalHash }),
		);
	});

	it('threads the parent workspace handle into child reconstruction with the delegation thread id', async () => {
		const parentWorkspaceHandle = mock<AgentSandboxRuntime>();
		const result = await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
			parentWorkspaceHandle,
		});

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenLastCalledWith(
			expect.objectContaining({
				parentWorkspace: { handle: parentWorkspaceHandle, delegationThreadId: result.threadId },
			}),
		);

		await runner.resumeForeground(
			{
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				childThreadId: result.threadId,
				resumeData: { approved: true },
				resumeContext: { agentId: 'agent-1', versionId: 'version-7' },
				parentThreadId,
			},
			{
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
				parentWorkspaceHandle,
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenLastCalledWith(
			expect.objectContaining({
				parentWorkspace: { handle: parentWorkspaceHandle, delegationThreadId: result.threadId },
			}),
		);
	});

	it('uses the saved n8n agent id as memory owner and records parent linkage', async () => {
		sourceResolver.resolveForRuntime.mockResolvedValue({
			...runtimeSource,
			source: {
				sourceId: 'agent-2',
				versionId: 'version-1',
				config: {
					...runnableConfig,
					memory: { enabled: true, storage: 'n8n' },
				},
			},
		});

		const result = await runner.run(
			{
				...spawnRequest,
				source: { agentId: 'agent-2', versionId: 'version-1' },
			},
			{
				projectId,
				parentAgentId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
			expect.objectContaining({
				memoryOwnerAgentId: 'agent-2',
				runtimeProfile: 'sub-agent',
				parentAgentIdForDelegation: parentAgentId,
			}),
		);
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(Array),
			expect.objectContaining({
				persistence: {
					resourceId: result.threadId,
					threadId: result.threadId,
					delegated: true,
					hostMetadata: { n8nExecutionId: 'agent-execution-1' },
				},
			}),
		);
		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({
				threadId: result.threadId,
				agentId: 'agent-2',
				agentName: 'Helper Agent',
				projectId,
				source: 'subagent',
				threadMetadata: {
					parentThreadId,
					parentAgentId,
				},
			}),
		);
	});

	describe('execution links', () => {
		// Build the context in each test: `credentialProvider` is assigned in `beforeEach`.
		const runContext = () => ({
			projectId,
			parentAgentId,
			credentialProvider,
			runType: 'production' as const,
		});

		it('links a child to the parent turn that delegates it', async () => {
			executionRepository.findLinksForChildOf.mockResolvedValue({ parentExecutionId: 'turn-1' });

			await runner.run({ ...spawnRequest, parentExecutionId: 'turn-1' }, runContext());

			expect(executionRepository.findLinksForChildOf).toHaveBeenCalledWith('turn-1');
			expect(agentExecutionService.startExecutionRecording).toHaveBeenCalledWith(
				expect.objectContaining({
					source: 'subagent',
					executionLinks: { parentExecutionId: 'turn-1' },
				}),
				expect.any(Date),
			);
		});

		it('stores no links when the parent execution is unknown or missing', async () => {
			await runner.run(spawnRequest, runContext());
			await runner.run({ ...spawnRequest, parentExecutionId: 'deleted-turn' }, runContext());

			expect(executionRepository.findLinksForChildOf).toHaveBeenCalledTimes(1);
			for (const [params] of agentExecutionService.startExecutionRecording.mock.calls) {
				expect(params).not.toHaveProperty('executionLinks');
			}
		});

		it('runs the child without links when the link lookup fails', async () => {
			executionRepository.findLinksForChildOf.mockRejectedValue(new Error('database unavailable'));

			const result = await runner.run(
				{ ...spawnRequest, parentExecutionId: 'turn-1' },
				runContext(),
			);

			expect(result.status).toBe('completed');
			expect(agentExecutionService.startExecutionRecording.mock.calls[0][0]).not.toHaveProperty(
				'executionLinks',
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to resolve sub-agent execution links',
				expect.objectContaining({ error: 'database unavailable' }),
			);
		});

		it('keeps the links of the first child execution when a later turn resumes the child', async () => {
			executionRepository.findFirstLinksInThread.mockResolvedValue({ parentExecutionId: 'turn-1' });

			await runner.resumeForeground(
				{
					...delegatedRequest,
					childRunId: 'child-run-1',
					childToolCallId: 'tool-call-1',
					childThreadId: 'child-thread-1',
					resumeData: { approved: true },
					resumeContext: { agentId: 'agent-1' },
					parentThreadId,
				},
				runContext(),
			);

			expect(executionRepository.findFirstLinksInThread).toHaveBeenCalledWith('child-thread-1');
			expect(executionRepository.findLinksForChildOf).not.toHaveBeenCalled();
			expect(agentExecutionService.startExecutionRecording).toHaveBeenCalledWith(
				expect.objectContaining({
					threadId: 'child-thread-1',
					executionLinks: { parentExecutionId: 'turn-1' },
				}),
				expect.any(Date),
			);
		});

		describe('delegated run usage', () => {
			const finishUsage = {
				promptTokens: 150_000,
				completionTokens: 900,
				totalTokens: 150_900,
				cost: 0.21,
				inputTokenDetails: { noCache: 10_000, cacheRead: 130_000, cacheWrite: 10_000 },
				byPromptSize: [
					{
						promptTokensOver: 128_000,
						maxPromptTokens: 150_000,
						usage: { promptTokens: 150_000, completionTokens: 900, totalTokens: 150_900 },
					},
				],
			};

			function streamFinishing(usage: StreamChunk & { type: 'finish' }) {
				childAgent.stream.mockResolvedValue(makeStreamResult([usage]));
			}

			it('reports the full finish usage of the child with its parent link', async () => {
				executionRepository.findLinksForChildOf.mockResolvedValue({ parentExecutionId: 'turn-1' });
				streamFinishing({
					type: 'finish',
					finishReason: 'stop',
					model: 'anthropic/claude-haiku-5-5',
					usage: finishUsage,
				});

				await runner.run({ ...spawnRequest, parentExecutionId: 'turn-1' }, runContext());

				expect(usageRelay.reportDelegatedRun).toHaveBeenCalledTimes(1);
				expect(usageRelay.reportDelegatedRun).toHaveBeenCalledWith({
					executionId: 'agent-execution-1',
					threadId: expect.any(String),
					parentExecutionId: 'turn-1',
					status: 'completed',
					model: 'anthropic/claude-haiku-5-5',
					// Not the recorder's totals: the cache details and the split stay.
					usage: finishUsage,
				});
			});

			it('reports the usage after the execution record is stored', async () => {
				executionRepository.findLinksForChildOf.mockResolvedValue({ parentExecutionId: 'turn-1' });
				streamFinishing({ type: 'finish', finishReason: 'stop', usage: finishUsage });

				await runner.run({ ...spawnRequest, parentExecutionId: 'turn-1' }, runContext());

				const [finalizeOrder] = agentExecutionService.finalizeExecution.mock.invocationCallOrder;
				const [reportOrder] = usageRelay.reportDelegatedRun.mock.invocationCallOrder;
				expect(reportOrder).toBeGreaterThan(finalizeOrder);
			});

			it('still reports the usage when storing the execution record fails', async () => {
				executionRepository.findLinksForChildOf.mockResolvedValue({ parentExecutionId: 'turn-1' });
				streamFinishing({ type: 'finish', finishReason: 'stop', usage: finishUsage });
				agentExecutionService.finalizeExecution.mockRejectedValue(
					new Error('database unavailable'),
				);

				await runner
					.run({ ...spawnRequest, parentExecutionId: 'turn-1' }, runContext())
					.catch(() => {});

				expect(usageRelay.reportDelegatedRun).toHaveBeenCalledTimes(1);
			});

			it('reports nothing without a parent link or without usage', async () => {
				streamFinishing({ type: 'finish', finishReason: 'stop', usage: finishUsage });
				await runner.run(spawnRequest, runContext());

				executionRepository.findLinksForChildOf.mockResolvedValue({ parentExecutionId: 'turn-1' });
				streamFinishing({ type: 'finish', finishReason: 'stop' });
				await runner.run({ ...spawnRequest, parentExecutionId: 'turn-1' }, runContext());

				expect(usageRelay.reportDelegatedRun).not.toHaveBeenCalled();
			});

			it('reports an errored child with the usage it reached', async () => {
				executionRepository.findLinksForChildOf.mockResolvedValue({ parentExecutionId: 'turn-1' });
				childAgent.stream.mockResolvedValue(
					makeStreamResult([
						{ type: 'error', error: new Error('model failed') },
						{ type: 'finish', finishReason: 'error', usage: finishUsage },
					]),
				);

				await runner.run({ ...spawnRequest, parentExecutionId: 'turn-1' }, runContext());

				expect(usageRelay.reportDelegatedRun).toHaveBeenCalledWith(
					expect.objectContaining({ status: 'errored', usage: finishUsage }),
				);
			});

			it('reports the side calls of a linked child with its parent link', async () => {
				executionRepository.findLinksForChildOf.mockResolvedValue({ parentExecutionId: 'turn-1' });
				const sideCall = {
					task: 'observer' as const,
					model: 'anthropic/claude-haiku-5-5',
					usage: { promptTokens: 2000, completionTokens: 200, totalTokens: 2200 },
					cost: 0.003,
					reportId: 'report-1',
				};

				await runner.run({ ...spawnRequest, parentExecutionId: 'turn-1' }, runContext());
				const options = childAgent.stream.mock.calls[0][1];
				await options?.onSideCallUsage?.(sideCall);

				expect(usageRelay.reportDelegatedSideCall).toHaveBeenCalledWith({
					...sideCall,
					executionId: 'agent-execution-1',
					threadId: expect.any(String),
					parentExecutionId: 'turn-1',
				});
			});

			it('sets no side-call callback on a child without a parent link', async () => {
				await runner.run(spawnRequest, runContext());

				expect(childAgent.stream.mock.calls[0][1]).not.toHaveProperty('onSideCallUsage');
			});
		});
	});

	it('returns a child suspension with draft resume context', async () => {
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{ type: 'text-delta', id: 'text-1', delta: 'Choose an option' },
				{
					type: 'tool-call-suspended',
					runId: 'child-run-1',
					toolCallId: 'tool-call-1',
					toolName: 'approval_action',
					input: { action: 'publish' },
					suspendPayload: { type: 'approval', action: 'publish' },
					resumeSchema: {
						type: 'object',
						properties: { approved: { type: 'boolean' } },
					},
				},
				{ type: 'finish', finishReason: 'tool-calls' },
			]),
		);

		await expect(
			runner.run(spawnRequest, {
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
			}),
		).resolves.toMatchObject({
			status: 'suspended',
			resumeContext: { agentId: 'agent-1' },
			result: {
				runId: 'child-run-1',
				finishReason: 'tool-calls',
				pendingSuspend: [
					{
						runId: 'child-run-1',
						toolCallId: 'tool-call-1',
						toolName: 'approval_action',
						input: { action: 'publish' },
						suspendPayload: { type: 'approval', action: 'publish' },
						resumeSchema: {
							type: 'object',
							properties: { approved: { type: 'boolean' } },
						},
					},
				],
			},
		});
		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({ hitlStatus: 'suspended' }),
		);
		expect(childAgent.close).toHaveBeenCalledTimes(1);
	});

	it('reports a guardrail stop as a failure that carries the stop code', async () => {
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{ type: 'text-delta', id: 'text-1', delta: 'Partial answer' },
				{ type: 'finish', finishReason: 'guardrail', guardrail: { code: 'budget.session' } },
			]),
		);
		const onBudgetNotice = vi.fn();

		await expect(
			runner.run(spawnRequest, {
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
				onBudgetNotice,
			}),
		).resolves.toMatchObject({
			status: 'failed',
			result: {
				runId: 'child-run-1',
				finishReason: 'guardrail',
				guardrail: { code: 'budget.session' },
			},
		});
		expect(onBudgetNotice).toHaveBeenCalledWith({ code: 'budget.session' });
	});

	it('names the child as the budget owner on a monthly guardrail stop', async () => {
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{ type: 'text-delta', id: 'text-1', delta: 'Partial answer' },
				{ type: 'finish', finishReason: 'guardrail', guardrail: { code: 'budget.monthly' } },
			]),
		);
		const onBudgetNotice = vi.fn();

		await expect(
			runner.run(spawnRequest, {
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
				onBudgetNotice,
			}),
		).resolves.toMatchObject({
			status: 'failed',
			result: {
				runId: 'child-run-1',
				finishReason: 'guardrail',
				guardrail: { code: 'budget.monthly' },
			},
		});
		expect(onBudgetNotice).toHaveBeenCalledWith({
			code: 'budget.monthly',
			agentId: 'agent-1',
		});
	});

	it('does not emit a budget notice for a non-budget guardrail stop', async () => {
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{ type: 'text-delta', id: 'text-1', delta: 'Partial answer' },
				{ type: 'finish', finishReason: 'guardrail', guardrail: { code: 'budget.misconfigured' } },
			]),
		);
		const onBudgetNotice = vi.fn();

		await expect(
			runner.run(spawnRequest, {
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
				onBudgetNotice,
			}),
		).resolves.toMatchObject({
			status: 'failed',
			result: { finishReason: 'guardrail' },
		});
		expect(onBudgetNotice).not.toHaveBeenCalled();
	});

	it('forwards the budget notice sink into the child guardrail options', async () => {
		Container.set(AgentSpendLedger, mock<AgentSpendLedger>());
		const onBudgetNotice = vi.fn();

		await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
			rootSessionId: parentThreadId,
			rootSessionCapUsd: 5,
			onBudgetNotice,
		});

		const options = childAgent.stream.mock.calls[0]?.[1];
		const sink = options?.guardrails?.onNotice;
		expect(sink).toBeDefined();
		// A locally-originated notice gets this child's source id.
		sink?.({ code: 'budget.alert' });
		expect(onBudgetNotice).toHaveBeenCalledWith({ code: 'budget.alert', agentId: 'agent-1' });
		// A deeper child's stamp survives: the innermost owner wins.
		sink?.({ code: 'budget.alert', agentId: 'grandchild-1' });
		expect(onBudgetNotice).toHaveBeenCalledWith({
			code: 'budget.alert',
			agentId: 'grandchild-1',
		});
		// A session stop always spends the root bucket, so it carries no owner.
		sink?.({ code: 'budget.session', agentId: 'grandchild-1' });
		expect(onBudgetNotice).toHaveBeenCalledWith({ code: 'budget.session' });
		sink?.({ code: 'pii.block' });
		expect(onBudgetNotice).toHaveBeenCalledTimes(3);
	});

	it('installs the notice ferry even when the child has no budget bucket', async () => {
		Container.set(AgentSpendLedger, mock<AgentSpendLedger>());
		const onBudgetNotice = vi.fn();

		await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
			onBudgetNotice,
		});

		const options = childAgent.stream.mock.calls[0]?.[1];

		expect(options?.guardrails?.hooks).toHaveLength(0);
		expect(options?.guardrails?.onNotice).toBeDefined();
	});

	it('applies the self-delegation model while preserving the parent draft', async () => {
		const parentConfig: RunnableAgentJsonConfig = {
			...runnableConfig,
			model: 'openai/gpt-4o-mini',
			credential: 'parent-credential',
			instructions: 'Parent instructions.',
			memory: { enabled: true, storage: 'n8n' },
			tools: [{ type: 'custom', id: 'tool_1' }],
			skills: [{ type: 'skill', id: 'skill_1' }],
			config: { webSearch: { enabled: true } },
			providerTools: {
				'anthropic.web_search': { maxUses: 3 },
				'openai.image_generation': {},
			},
			subAgents: {
				modelsByDifficulty: {
					high: {
						model: 'anthropic/claude-sonnet-4-5',
						credential: 'high-credential',
					},
				},
			},
		};
		sourceResolver.resolveForRuntime.mockResolvedValue({
			...runtimeSource,
			source: { sourceId: parentAgentId, config: parentConfig },
		});

		await runner.run(
			{ ...spawnRequest, source: { agentId: parentAgentId } },
			{
				projectId,
				parentAgentId,
				credentialProvider,
				runType: 'production',
				selfDelegationDifficulty: 'high',
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
			expect.objectContaining({
				config: {
					...parentConfig,
					model: 'anthropic/claude-sonnet-4-5',
					credential: 'high-credential',
					providerTools: {
						'anthropic.web_search_20250305': { maxUses: 3 },
					},
				},
				toolDescriptors: runtimeSource.toolDescriptors,
				toolCodeByName: runtimeSource.toolCodeByName,
				skills: runtimeSource.skills,
			}),
		);
	});

	it.each(['saved', 'empty'])('resumes a paused child with its %s snapshot', async (snapshot) => {
		const pinnedRuntimeSource = {
			...runtimeSource,
			source: { ...source, versionId: 'version-7' },
		};
		const runtimeSnapshot = snapshot === 'empty' ? '' : JSON.stringify(pinnedRuntimeSource);
		const shouldPause = vi.fn().mockResolvedValue(true);
		sourceResolver.resolveForRuntime.mockResolvedValue(pinnedRuntimeSource);
		childAgent.resumePaused.mockImplementation(async (options) => {
			await options.onResumeClaimed?.();
			return makeStreamResult([{ type: 'finish', finishReason: 'paused' }]);
		});

		const resumeRequest = {
			...delegatedRequest,
			childRunId: 'child-run-1',
			childThreadId: 'child-thread-1',
			parentThreadId,
			resumeContext: { agentId: 'agent-1', versionId: 'version-7' },
		};
		const planTask = {
			planId: '00000000-0000-4000-a000-000000000001',
			planTaskId: '00000000-0000-4000-a000-000000000002',
		};
		const runContext = {
			planTask,
			projectId,
			parentAgentId,
			credentialProvider,
			runType: 'test' as const,
			runtimeSnapshot,
			shouldPause,
		};
		const result = await runner.resumePaused(resumeRequest, runContext);

		expect(sourceResolver.resolveForRuntime).toHaveBeenCalledWith(
			{ agentId: 'agent-1', versionId: 'version-7' },
			{ projectId, usePublishedVersion: false, runtimeSnapshot },
		);
		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
			expect.objectContaining({
				config: runnableConfig,
				memoryOwnerAgentId: 'agent-1',
				toolDescriptors: runtimeSource.toolDescriptors,
				toolCodeByName: runtimeSource.toolCodeByName,
				skills: runtimeSource.skills,
				runtimeProfile: 'sub-agent',
			}),
		);
		expect(childAgent.resumePaused).toHaveBeenCalledWith(
			expect.objectContaining({
				runId: 'child-run-1',
				hostMetadata: { n8nExecutionId: 'agent-execution-1', n8nPlanTask: planTask },
				shouldPause: expect.any(Function),
			}),
		);
		expect(await childAgent.resumePaused.mock.calls[0][0].shouldPause?.()).toBe(true);
		expect(shouldPause).toHaveBeenCalled();
		expect(result).toMatchObject({
			threadId: 'child-thread-1',
			status: 'paused',
			result: { finishReason: 'paused' },
		});

		const admissionError = new Error('Resume admission rejected');
		await expect(
			runner.resumePaused(resumeRequest, {
				...runContext,
				onResumeClaimed: async () => {
					throw admissionError;
				},
			}),
		).rejects.toBe(admissionError);
	});

	it('returns the files that the child made in all its runs after a resume', async () => {
		const made = [
			{ fileId: 'first-run', fileName: 'a.png', mimeType: 'image/png', sizeBytes: 1 },
			{ fileId: 'second-run', fileName: 'b.png', mimeType: 'image/png', sizeBytes: 2 },
		];
		attachmentService.returnToParent.mockResolvedValue(made);

		const result = await runner.resumeForeground(
			{
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				childThreadId: 'child-thread-1',
				resumeData: { approved: true },
				resumeContext: { agentId: 'agent-1' },
				parentThreadId,
			},
			{ projectId, parentAgentId, credentialProvider, runType: 'production' },
		);

		// The query is on the child thread, so it covers the runs before the pause too.
		expect(attachmentService.returnToParent).toHaveBeenCalledWith({
			projectId,
			parentThreadId,
			childThreadId: 'child-thread-1',
		});
		expect(attachmentService.grantToSubAgent).not.toHaveBeenCalled();
		expect(result.files).toEqual(made);
	});

	it('records a draft child resume in the same thread only after host admission', async () => {
		const approvalContext = { approvedKeys: new Set<string>(), onDecision: vi.fn() };
		toolApprovalService.createContext.mockResolvedValueOnce(approvalContext);
		const toolRegistry = new Map([
			['child_request', { kind: 'node' as const, nodeParameters: { method: 'GET' } }],
		]);
		reconstructionService.reconstructFromResolvedSource.mockResolvedValueOnce({
			agent: childAgent as never,
			toolRegistry,
			mcpServerAttributions: new Map(),
		});
		const resumeRequest = {
			...delegatedRequest,
			childRunId: 'child-run-1',
			childToolCallId: 'tool-call-1',
			childThreadId: 'child-thread-1',
			resumeData: { approved: true, scope: 'session' },
			resumeContext: { agentId: 'agent-1' },
			parentThreadId,
		};
		const runContext = {
			projectId,
			parentAgentId,
			credentialProvider,
			runType: 'production' as const,
		};
		const result = await runner.resumeForeground(resumeRequest, runContext);

		expect(sourceResolver.resolveForRuntime).toHaveBeenCalledWith(
			{ agentId: 'agent-1' },
			{ projectId, usePublishedVersion: true },
		);
		expect(childAgent.resume).toHaveBeenCalledWith(
			'stream',
			{ approved: true, scope: 'session' },
			expect.objectContaining({ runId: 'child-run-1', toolCallId: 'tool-call-1', approvalContext }),
		);
		expect(toolApprovalService.createContext).toHaveBeenCalledWith(
			expect.objectContaining({ threadId: 'child-thread-1', agentId: 'agent-1' }),
			toolRegistry,
		);
		expect(toolApprovalService.createContext.mock.invocationCallOrder[0]).toBeGreaterThan(
			agentExecutionService.startExecutionRecording.mock.invocationCallOrder[0],
		);
		expect(result).toMatchObject({
			taskPath: '/root/research_api_0',
			threadId: 'child-thread-1',
			status: 'completed',
			result: { runId: 'child-run-1', finishReason: 'stop' },
		});
		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({
				threadId: 'child-thread-1',
				agentId: 'agent-1',
				userMessage: null,
				hitlStatus: 'resumed',
				record: expect.objectContaining({
					timeline: expect.arrayContaining([
						expect.objectContaining({
							type: 'hitl-response',
							toolCallId: 'tool-call-1',
							response: { approved: true, scope: 'session' },
						}),
					]),
				}),
			}),
		);
		expect(childAgent.close).toHaveBeenCalledTimes(1);

		const admissionError = new Error('Resume admission rejected');
		await expect(
			runner.resumeForeground(resumeRequest, {
				...runContext,
				onResumeClaimed: async () => {
					throw admissionError;
				},
			}),
		).rejects.toBe(admissionError);
		expect(agentExecutionService.finalizeExecution).toHaveBeenLastCalledWith(
			'agent-execution-1',
			expect.objectContaining({
				hitlStatus: undefined,
				record: expect.objectContaining({
					timeline: expect.not.arrayContaining([
						expect.objectContaining({ type: 'hitl-response' }),
					]),
				}),
			}),
		);
	});

	it('resumes and cancels self-delegation from the parent-owned checkpoint', async () => {
		const request = {
			...delegatedRequest,
			subAgentId: INLINE_SUB_AGENT_ID,
			difficulty: 'high' as const,
			childRunId: 'child-run-1',
			childToolCallId: 'tool-call-1',
			childThreadId: 'child-thread-1',
			resumeData: { approved: true },
			resumeContext: { agentId: parentAgentId },
			parentThreadId,
		};

		const result = await runner.resumeForeground(
			request,
			{
				projectId,
				parentAgentId,
				credentialProvider,
				runType: 'production',
				selfDelegationDifficulty: 'high',
			},
			parentAgentId,
		);
		await runner.cancelForeground({ ...request, reason: 'Parent run aborted' }, parentAgentId);

		expect(sourceResolver.resolveForRuntime).toHaveBeenCalledWith(
			{ agentId: parentAgentId },
			{ projectId, usePublishedVersion: true },
		);
		expect(result.threadId).toBe('child-thread-1');
		expect(checkpointStorage.delete).toHaveBeenCalledWith('child-run-1', parentAgentId);
	});

	it('accepts a legacy pinned resume context', async () => {
		await runner.resumeForeground(
			{
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				childThreadId: 'child-thread-1',
				resumeData: { approved: true },
				resumeContext: { agentId: 'agent-1', versionId: 'version-7' },
			},
			{
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(sourceResolver.resolveForRuntime).toHaveBeenCalledWith(
			{ agentId: 'agent-1', versionId: 'version-7' },
			{ projectId, usePublishedVersion: true },
		);
	});

	it.each([{ agentId: 'agent-1' }, { agentId: 'agent-1', versionId: 'version-7' }])(
		'cancels a child checkpoint from resume context %#',
		async (resumeContext) => {
			await runner.cancelForeground({
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				resumeContext,
				reason: 'Parent run aborted',
			});

			expect(checkpointStorage.delete).toHaveBeenCalledWith('child-run-1', 'agent-1');
			expect(sourceResolver.resolveForRuntime).not.toHaveBeenCalled();
			expect(reconstructionService.reconstructFromResolvedSource).not.toHaveBeenCalled();
			expect(childAgent.resume).not.toHaveBeenCalled();
		},
	);

	it.each([
		{ agentId: 'other-agent' },
		{ agentId: 'agent-1', versionId: '' },
		{ versionId: 'version-7' },
	])('rejects invalid resume context %#', async (resumeContext) => {
		await expect(
			runner.cancelForeground({
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				resumeContext,
				reason: 'Parent run aborted',
			}),
		).rejects.toThrow('Configured sub-agent resume context is missing or invalid');
		expect(checkpointStorage.delete).not.toHaveBeenCalled();
	});

	it('marks the run as failed when the child result contains an error', async () => {
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{ type: 'error', error: new Error('failed') },
				{ type: 'finish', finishReason: 'error' },
			]),
		);

		await expect(
			runner.run(spawnRequest, {
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
			}),
		).resolves.toMatchObject({
			status: 'failed',
		});
		expect(childAgent.close).toHaveBeenCalledTimes(1);
	});

	it.each(['startExecutionRecording', 'finalizeExecution'] as const)(
		'requires child recording through %s',
		async (operation) => {
			const cause = new Error('recording unavailable');
			agentExecutionService[operation].mockRejectedValue(cause);
			await expect(
				runner.run(spawnRequest, {
					parentAgentId,
					projectId,
					credentialProvider,
					runType: 'production',
				}),
			).rejects.toMatchObject({
				phase: operation === 'startExecutionRecording' ? 'create' : 'finalize',
				executionStarted: operation === 'finalizeExecution',
				cause,
			});
			if (operation === 'startExecutionRecording') {
				expect(childAgent.stream).not.toHaveBeenCalled();
				expect(agentExecutionService.finalizeExecution).not.toHaveBeenCalled();
			} else {
				expect(agentExecutionService.finalizeExecution).toHaveBeenCalledOnce();
				expect(childAgent.close).toHaveBeenCalledOnce();
			}
		},
	);

	it('records a failed child initialization without invoking the SDK', async () => {
		const error = new Error('child initialization failed');
		reconstructionService.reconstructFromResolvedSource.mockRejectedValue(error);
		await expect(
			runner.run(spawnRequest, {
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production',
			}),
		).rejects.toBe(error);
		expect(childAgent.stream).not.toHaveBeenCalled();
		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({ record: expect.objectContaining({ error: error.message }) }),
		);
	});

	it.each(['run', 'resume'] as const)(
		'does not %s a child when cancelled during the grant lookup',
		async (operation) => {
			const parentAbort = new AbortController();
			const grantLookup = createDeferredPromise<ToolApprovalContext>();
			toolApprovalService.createContext.mockReturnValueOnce(grantLookup.promise);
			const context = {
				parentAgentId,
				projectId,
				credentialProvider,
				runType: 'production' as const,
				abortSignal: parentAbort.signal,
			};
			const execution =
				operation === 'run'
					? runner.run(spawnRequest, context)
					: runner.resumeForeground(
							{
								...delegatedRequest,
								childRunId: 'child-run-1',
								childToolCallId: 'tool-call-1',
								childThreadId: 'child-thread-1',
								resumeData: { approved: true, scope: 'session' },
								resumeContext: { agentId: 'agent-1' },
								parentThreadId,
							},
							context,
						);

			await vi.waitFor(() => expect(toolApprovalService.createContext).toHaveBeenCalled());
			parentAbort.abort();
			grantLookup.resolve({ approvedKeys: new Set(), onDecision: vi.fn() });

			await expect(execution).rejects.toMatchObject({ name: 'AbortError' });
			expect(childAgent.stream).not.toHaveBeenCalled();
			expect(childAgent.resume).not.toHaveBeenCalled();
			expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
				'agent-execution-1',
				expect.objectContaining({
					hitlStatus: undefined,
					record: expect.objectContaining({
						finishReason: 'cancelled',
						error: null,
						timeline: expect.not.arrayContaining([
							expect.objectContaining({ type: 'hitl-response' }),
						]),
					}),
				}),
			);
			expect(childAgent.close).toHaveBeenCalledOnce();
		},
	);

	it('aborts the child run when the parent run is cancelled', async () => {
		const parentAbort = new AbortController();
		childAgent.stream.mockImplementation(
			async (_input, options) =>
				await new Promise<StreamResult>((resolve) => {
					const settle = () =>
						resolve(
							makeStreamResult([
								{ type: 'error', error: new Error('aborted') },
								{ type: 'finish', finishReason: 'error' },
							]),
						);
					if (options?.abortSignal?.aborted) settle();
					else options?.abortSignal?.addEventListener('abort', settle, { once: true });
				}),
		);

		const run = runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
			abortSignal: parentAbort.signal,
		});

		await vi.waitFor(() => expect(childAgent.stream).toHaveBeenCalled());
		parentAbort.abort();

		await expect(run).resolves.toMatchObject({ status: 'failed' });
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(Array),
			expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
		);
	});

	it('derives sub-agent telemetry from the parent context and passes it to the child stream', async () => {
		const parentTelemetry: BuiltTelemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
			functionId: 'parent-agent',
			metadata: { agent_id: 'agent-1', thread_id: 'parent-thread-1' },
		};

		await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
			telemetry: parentTelemetry,
		});

		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(Array),
			expect.objectContaining({
				telemetry: {
					...parentTelemetry,
					functionId: undefined,
					metadata: { thread_id: 'parent-thread-1', source: 'sub-agent' },
					rootAnchored: false,
				},
			}),
		);
	});

	it('omits telemetry from the child stream call when the parent context has none', async () => {
		await runner.run(spawnRequest, {
			parentAgentId,
			projectId,
			credentialProvider,
			runType: 'production',
		});

		const options = childAgent.stream.mock.calls[0]?.[1];
		expect(options).not.toHaveProperty('telemetry');
	});
});

function makeStreamResult(chunks: StreamChunk[]): StreamResult {
	return {
		runId: 'child-run-1',
		stream: new ReadableStream<StreamChunk>({
			start(controller) {
				for (const chunk of chunks) {
					controller.enqueue(chunk);
				}
				controller.close();
			},
		}),
		getState: () => {
			throw new Error('not implemented');
		},
	};
}
