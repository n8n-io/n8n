import {
	type BuiltAgent,
	type BuiltTelemetry,
	type CredentialProvider,
	type StreamChunk,
	type StreamResult,
} from '@n8n/agents';
import type {
	ResolvedSubAgentSource,
	RunnableAgentJsonConfig,
	SubAgentSpawnRequest,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../../agent-execution.service';
import { AgentRuntimeReconstructionService } from '../../agent-runtime-reconstruction.service';
import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../../agent-sandbox-principal';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import { SubAgentForegroundRunner } from '../sub-agent-foreground-runner';
import type {
	ResolvedSubAgentRuntimeSource,
	SubAgentSourceResolver,
} from '../sub-agent-source-resolver';

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
	executionMode: 'foreground',
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

describe('SubAgentForegroundRunner', () => {
	let sourceResolver: Mocked<SubAgentSourceResolver>;
	let reconstructionService: Mocked<AgentRuntimeReconstructionService>;
	let runner: SubAgentForegroundRunner;
	let childAgent: Mocked<BuiltAgent>;
	let agentExecutionService: Mocked<AgentExecutionService>;
	let logger: Mocked<Logger>;
	let checkpointStorage: Mocked<N8NCheckpointStorage>;
	let credentialProvider: Mocked<CredentialProvider>;

	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();
		sourceResolver = mock<SubAgentSourceResolver>();
		sourceResolver.resolveForRuntime.mockResolvedValue(runtimeSource);
		reconstructionService = mock<AgentRuntimeReconstructionService>();
		Container.set(AgentRuntimeReconstructionService, reconstructionService);
		agentExecutionService = mock<AgentExecutionService>();
		agentExecutionService.startExecutionRecording.mockResolvedValue('agent-execution-1');
		agentExecutionService.finalizeExecution.mockResolvedValue('agent-execution-1');
		checkpointStorage = mock<N8NCheckpointStorage>();
		logger = mock<Logger>();
		runner = new SubAgentForegroundRunner(
			sourceResolver,
			agentExecutionService,
			checkpointStorage,
			logger,
		);

		childAgent = mock<BuiltAgent>();
		childAgent.stream.mockResolvedValue(makeStreamResult(defaultStreamChunks));
		childAgent.close.mockResolvedValue(undefined);
		reconstructionService.reconstructFromResolvedSource.mockResolvedValue({
			agent: childAgent as never,
			toolRegistry: new Map(),
		});

		credentialProvider = mock<CredentialProvider>();
	});

	it('resolves reconstruction from the container at run time', async () => {
		await runner.runForeground(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'production',
		});

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledTimes(1);
	});

	it('rebuilds the child through the shared reconstruction service and runs it with a fresh prompt', async () => {
		agentExecutionService.startExecutionRecording.mockResolvedValue('agent-execution-1');
		agentExecutionService.finalizeExecution.mockResolvedValue('agent-execution-1');
		const result = await runner.runForeground(spawnRequest, {
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
			parentAgentIdForDelegation: undefined,
			user: undefined,
		});
		expect(childAgent.close).toHaveBeenCalledTimes(1);
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.stringContaining('YOUR TASK:\nFind the relevant API behavior.'),
			expect.objectContaining({
				persistence: {
					resourceId: result.threadId,
					threadId: result.threadId,
					delegated: true,
				},
			}),
		);
		const childPrompt = childAgent.stream.mock.calls[0]?.[0] as string;
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

	it('records the child turn with the parent run type, not its own published state', async () => {
		const result = await runner.runForeground(spawnRequest, {
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

	it.each(['integrated', 'manual'] as const)(
		'reconstructs child workflow tools with the parent %s execution mode',
		async (workflowToolExecutionMode) => {
			await runner.runForeground(spawnRequest, {
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

		await runner.runForeground(spawnRequest, {
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
		const result = await runner.runForeground(
			{ ...spawnRequest, parentResourceId: 'draft-chat:user-1' },
			{
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				persistence: {
					resourceId: 'draft-chat:user-1',
					threadId: result.threadId,
					delegated: true,
				},
			}),
		);
		expect(result.threadId).toEqual(expect.any(String));
	});

	it('inherits the parent workspace principal on the initial run and resume', async () => {
		const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-1' });
		const result = await runner.runForeground(
			{ ...spawnRequest, parentSandboxPrincipalHash: principalHash },
			{
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenLastCalledWith(
			expect.objectContaining({ sandboxPrincipalHash: principalHash }),
		);
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				persistence: expect.objectContaining({
					hostMetadata: encodeAgentSandboxHostMetadata({ projectId, principalHash }),
				}),
			}),
		);

		checkpointStorage.load.mockResolvedValue({
			status: 'suspended',
			persistence: {
				threadId: result.threadId,
				resourceId: result.threadId,
				delegated: true,
				hostMetadata: encodeAgentSandboxHostMetadata({ projectId, principalHash }),
			},
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			pendingToolCalls: {},
		});
		childAgent.resume.mockResolvedValue(makeStreamResult(defaultStreamChunks));
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
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenLastCalledWith(
			expect.objectContaining({ sandboxPrincipalHash: principalHash }),
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

		const result = await runner.runForeground(
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
			expect.any(String),
			expect.objectContaining({
				persistence: {
					resourceId: result.threadId,
					threadId: result.threadId,
					delegated: true,
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

	it('returns a child suspension with pinned resume context', async () => {
		sourceResolver.resolveForRuntime.mockResolvedValue({
			...runtimeSource,
			source: { ...runtimeSource.source, versionId: 'version-7' },
		});
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
			runner.runForeground(spawnRequest, {
				projectId,
				credentialProvider,
				runType: 'production',
			}),
		).resolves.toMatchObject({
			status: 'suspended',
			resumeContext: { agentId: 'agent-1', versionId: 'version-7' },
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

	it('resumes the exact pinned child checkpoint in the same thread', async () => {
		childAgent.resume.mockResolvedValue(makeStreamResult(defaultStreamChunks));

		const result = await runner.resumeForeground(
			{
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				childThreadId: 'child-thread-1',
				resumeData: { approved: true },
				resumeContext: { agentId: 'agent-1', versionId: 'version-7' },
				parentThreadId,
			},
			{
				projectId,
				parentAgentId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(sourceResolver.resolveForRuntime).toHaveBeenCalledWith(
			{ agentId: 'agent-1', versionId: 'version-7' },
			{ projectId },
		);
		expect(childAgent.resume).toHaveBeenCalledWith(
			'stream',
			{ approved: true },
			expect.objectContaining({ runId: 'child-run-1', toolCallId: 'tool-call-1' }),
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
			}),
		);
		expect(childAgent.close).toHaveBeenCalledTimes(1);
	});

	it('cancels the exact pinned child checkpoint without reconstructing the child', async () => {
		await runner.cancelForeground({
			...delegatedRequest,
			childRunId: 'child-run-1',
			childToolCallId: 'tool-call-1',
			resumeContext: { agentId: 'agent-1', versionId: 'version-7' },
			reason: 'Parent run aborted',
		});

		expect(checkpointStorage.delete).toHaveBeenCalledWith('child-run-1', 'agent-1');
		expect(sourceResolver.resolveForRuntime).not.toHaveBeenCalled();
		expect(reconstructionService.reconstructFromResolvedSource).not.toHaveBeenCalled();
		expect(childAgent.resume).not.toHaveBeenCalled();
	});

	it('marks the run as failed when the child result contains an error', async () => {
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{ type: 'error', error: new Error('failed') },
				{ type: 'finish', finishReason: 'error' },
			]),
		);

		await expect(
			runner.runForeground(spawnRequest, {
				projectId,
				credentialProvider,
				runType: 'production',
			}),
		).resolves.toMatchObject({
			status: 'failed',
		});
		expect(childAgent.close).toHaveBeenCalledTimes(1);
	});

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

		const run = runner.runForeground(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'production',
			abortSignal: parentAbort.signal,
		});

		parentAbort.abort();

		await expect(run).resolves.toMatchObject({ status: 'failed' });
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
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

		await runner.runForeground(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'production',
			telemetry: parentTelemetry,
		});

		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				telemetry: {
					...parentTelemetry,
					functionId: undefined,
					metadata: { agent_id: 'agent-1', thread_id: 'parent-thread-1', source: 'sub-agent' },
					rootAnchored: false,
				},
			}),
		);
	});

	it('omits telemetry from the child stream call when the parent context has none', async () => {
		await runner.runForeground(spawnRequest, {
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
