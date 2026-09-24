import type {
	Agent as RuntimeAgent,
	CredentialProvider,
	ExecutionOptions,
	JSONValue,
	ResumeOptions,
	SerializableAgentState,
	StreamChunk,
} from '@n8n/agents';
import {
	N8N_CHAT_INTEGRATION_TYPE,
	type AgentBackgroundJobSignal,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { LockService } from '@n8n/backend-common';
import type { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { OperationalError, UserError } from 'n8n-workflow';
import type { InstanceSettings } from 'n8n-core';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ExternalHooks } from '@/external-hooks';
import type { Telemetry } from '@/telemetry';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import { CredentialsService } from '@/credentials/credentials.service';

import type { AgentBackgroundJobRepository } from '../repositories/agent-background-job.repository';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import {
	AgentChatExecutionService,
	AgentTurnAlreadyRunningError,
} from '../agent-chat-execution.service';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import type { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentRunTracingService } from '../agent-run-tracing.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentExecutionRecordingError } from '../agent-execution-recording.error';
import { AgentTestRunService } from '../agent-test-run.service';
import { AgentTurnExecutionService } from '../agent-turn-execution.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../agent-sandbox-principal';
import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import { AgentWakeService } from '../background/agent-wake.service';
import { SubAgentBackgroundRunner } from '../background/sub-agent-background-runner';
import type { AgentChatBridge } from '../integrations/agent-chat-bridge';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import { IntegrationMessageContextService } from '../integrations/integration-message-context.service';
import type { IntegrationMessageContext } from '../integrations/integration-tool-types';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { AgentThreadRepository } from '../repositories/agent-thread.repository';
import type { AgentResourceRepository } from '../repositories/agent-resource.repository';
import {
	encodeIntegrationMessageContext,
	readIntegrationMessageContext,
} from '../integrations/integration-message-context';
import type { ToolRegistry } from '../tool-registry';

const aiConfigMock = mock<AiConfig>({
	modelStreamIdleTimeoutMs: 90_000,
	modelStreamFirstOutputTimeoutMs: 180_000,
});

const backgroundJobSignal: AgentBackgroundJobSignal = {
	tasks: [{ id: 'job-1', title: 'Research', kind: 'subagent', status: 'completed' }],
};

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';
const user = mock<User>({ id: userId });
const userPrincipalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId });
const integrationPrincipalHash = hashAgentSandboxPrincipal({
	type: 'integration-thread',
	connectionId: 'credential-1',
	platform: 'slack',
	platformThreadId: 'thread-1',
});
const taskPrincipalHash = hashAgentSandboxPrincipal({ type: 'scheduled-task', taskId: 'task-1' });

const selectedContext: IntegrationMessageContext = {
	integrationConnectionId: 'slack:credential-1',
	platform: 'slack',
	target: { type: 'thread', threadId: 'slack:channel:1' },
	interactingUserId: 'selected-user',
	messageId: 'selected-message',
	updatedAt: '2026-09-18T10:00:00.000Z',
};

const schema: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

const telemetryContext = {
	runType: 'test' as const,
	configuration: {
		model: schema.model,
		channels: [],
		tool_types: [],
		tool_count: 0,
		num_skills: 0,
		memory_type: 'none' as const,
	},
};

function makeReadableStream(chunks: StreamChunk[]): ReadableStream<StreamChunk> {
	return new ReadableStream<StreamChunk>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(chunk);
			controller.close();
		},
	});
}

function makeFailingStream(error: Error): ReadableStream<StreamChunk> {
	const chunks: StreamChunk[] = [
		{ type: 'text-start', id: 'text-1' },
		{ type: 'text-delta', id: 'text-1', delta: 'partial answer' },
	];
	let index = 0;

	return new ReadableStream<StreamChunk>({
		pull(controller) {
			const chunk = chunks[index++];
			if (chunk) {
				controller.enqueue(chunk);
				return;
			}

			controller.error(error);
		},
	});
}

function makeRuntime(
	chunks: StreamChunk[] = [{ type: 'finish', finishReason: 'stop' }],
	mcpServerAttributions = new Map<string, string>(),
) {
	const toolRegistry: ToolRegistry = new Map();
	return {
		mcpServerAttributions,
		agent: {
			name: 'Runtime Agent',
			snapshot: { model: { provider: 'anthropic', name: 'claude-sonnet-4-5' } },
			stream: vi
				.fn()
				.mockResolvedValue({ runId: 'runtime-run-1', stream: makeReadableStream(chunks) }),
			resume: vi.fn().mockImplementation(async (_method, _data, options: ResumeOptions) => {
				await options.onResumeClaimed?.();
				return { runId: 'runtime-run-1', stream: makeReadableStream(chunks) };
			}),
			structuredOutput: vi.fn(),
			close: vi.fn(),
		} as unknown as RuntimeAgent & {
			stream: Mock;
			resume: Mock;
			structuredOutput: Mock;
		},
		toolRegistry,
		projectId,
		agentId,
		telemetryConfiguration: telemetryContext.configuration,
		toolAccessCheckedAt: Date.now(),
	};
}

function makeService(sandboxEnabled = false) {
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const executionService = mock<AgentExecutionService>();
	executionService.getAbortSignal.mockReturnValue(new AbortController().signal);
	const executionRepository = mock<AgentExecutionRepository>();
	const backgroundJobs = mock<AgentBackgroundJobService>();
	const backgroundJobRepository = mock<AgentBackgroundJobRepository>();
	const chatExecutionService = new AgentChatExecutionService(
		Container.get(LockService),
		executionRepository,
		executionService,
		checkpointStorage,
		mock<Publisher>(),
		mock<InstanceSettings>(),
		mock<AgentExecutionUpdateBroadcaster>(),
		backgroundJobs,
	);
	const telemetry = mock<Telemetry>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const contextService = new IntegrationMessageContextService(
		mock<AgentThreadRepository>(),
		mock<AgentResourceRepository>(),
		mockLogger(),
	);
	const integrationMessageContextService = Object.assign(contextService, {
		getLatest: vi.spyOn(contextService, 'getLatest'),
		setLatest: vi.spyOn(contextService, 'setLatest').mockResolvedValue(undefined),
	});
	const agentRunTracingService = mock<AgentRunTracingService>();
	const externalHooks = mock<ExternalHooks>();
	const agentSandboxRuntimeService = mock<AgentSandboxRuntimeService>({
		isEnabled: () => sandboxEnabled,
	});
	const agentRepository = mock<AgentRepository>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const bridge = mock<AgentChatBridge>();
	Container.set(ChatIntegrationService, chatIntegrationService);
	chatIntegrationService.getBridge.mockReturnValue(bridge);
	integrationMessageContextService.getLatest.mockResolvedValue({
		integrationConnectionId: 'slack:credential-1',
		platform: 'slack',
		target: { type: 'thread', threadId: 'slack:other-channel:2' },
		replyTarget: { type: 'thread', threadId: 'slack:channel-1:1' },
		updatedAt: new Date().toISOString(),
	});
	const wakeService = mock<AgentWakeService>();
	Container.set(AgentWakeService, wakeService);

	executionService.canUseDraftThread.mockResolvedValue(true);
	executionService.findThreadById.mockResolvedValue({
		id: 'thread-1',
		projectId,
		agentId,
		accessScope: 'project',
		ownerId: null,
	} as never);
	executionService.startExecutionRecording.mockResolvedValue('execution-1');
	executionService.finalizeExecution.mockResolvedValue('execution-1');
	agentRunTracingService.build.mockResolvedValue(undefined);

	const service = new AgentExecutionOrchestratorService(
		mockLogger(),
		checkpointStorage,
		executionService,
		new AgentTurnExecutionService(
			mockLogger(),
			executionService,
			chatExecutionService,
			mock<AgentMessageQueueService>(),
		),
		telemetry,
		runtimeCacheService,
		integrationMessageContextService,
		agentRunTracingService,
		externalHooks,
		agentSandboxRuntimeService,
		agentRepository,
		aiConfigMock,
		chatExecutionService,
		backgroundJobRepository,
		backgroundJobs,
	);

	return {
		service,
		backgroundJobRepository,
		backgroundJobs,
		chatExecutionService,
		executionRepository,
		checkpointStorage,
		executionService,
		telemetry,
		runtimeCacheService,
		integrationMessageContextService,
		agentRunTracingService,
		externalHooks,
		agentSandboxRuntimeService,
		agentRepository,
		wakeService,
		chatIntegrationService,
		bridge,
	};
}

async function collect(generator: AsyncGenerator<StreamChunk>) {
	const chunks: StreamChunk[] = [];
	for await (const chunk of generator) chunks.push(chunk);
	return chunks;
}

describe('background approvals', () => {
	afterEach(() => Container.reset());

	it.each([
		{ expectedMemory: { threadId: 'other-thread' } },
		{ expectedMemory: { resourceId: 'draft-chat:other-user' } },
		{ agentId: 'other-agent' },
		{ projectId: 'other-project' },
		{ toolCallId: 'old-gate' },
		{ user: mock<User>({ id: 'other-user' }) },
		{ usePublishedVersion: true, messageContext: structuredClone(selectedContext) },
	])('rejects a background approval from another Preview scope: %j', async (other) => {
		const { service, backgroundJobRepository, backgroundJobs, runtimeCacheService } =
			makeService(false);
		backgroundJobRepository.findById.mockResolvedValue(
			mock<AgentBackgroundJob>({
				id: 'job-1',
				parentAgentId: agentId,
				parentThreadId: 'thread-1',
				parentResourceId: 'draft-chat:user-1',
				parentPrincipalHash: userPrincipalHash,
				status: 'suspended',
			}),
		);
		backgroundJobs.getApproval.mockResolvedValue(
			mock<NonNullable<Awaited<ReturnType<AgentBackgroundJobService['getApproval']>>>>({
				token: 'gate-1',
				scope: { projectId, principalHash: userPrincipalHash },
			}),
		);
		await expect(
			collect(
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'background-job-job-1',
					toolCallId: 'gate-1',
					resumeData: { approved: true },
					usePublishedVersion: false,
					user,
					...other,
				}),
			),
		).rejects.toBeInstanceOf(UserError);
		expect(backgroundJobs.resume).not.toHaveBeenCalled();
		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it.each([
		{ ...selectedContext, platform: 'telegram' },
		{ ...selectedContext, integrationConnectionId: 'slack:other-credential' },
		{ ...selectedContext, target: { type: 'thread' as const, threadId: 'slack:other-channel:1' } },
		null,
	])('rejects a background approval from another channel: %j', async (messageContext) => {
		const { service, backgroundJobRepository, backgroundJobs } = makeService(false);
		backgroundJobRepository.findById.mockResolvedValue(
			mock<AgentBackgroundJob>({
				id: 'job-1',
				parentAgentId: agentId,
				parentThreadId: 'thread-1',
				parentResourceId: 'slack:user-1',
				parentPrincipalHash: integrationPrincipalHash,
				status: 'suspended',
			}),
		);
		backgroundJobs.getApproval.mockResolvedValue({
			...mock<NonNullable<Awaited<ReturnType<AgentBackgroundJobService['getApproval']>>>>(),
			token: 'gate-1',
			scope: { projectId, principalHash: integrationPrincipalHash },
			metadata: {
				jobId: 'job-1',
				taskPath: '/root/research_0',
				resumeContext: { agentId: 'child-1' },
				sharedWorkspace: false,
				messageContext: structuredClone(selectedContext),
			},
		});
		await expect(
			collect(
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'background-job-job-1',
					toolCallId: 'gate-1',
					resumeData: { approved: true },
					messageContext,
				}),
			),
		).rejects.toThrow('does not belong to this chat');
		expect(backgroundJobs.resume).not.toHaveBeenCalled();
	});

	it.each([false, true])('resumes only the waiting child with published=%s', async (published) => {
		const { service, backgroundJobRepository, backgroundJobs, runtimeCacheService } =
			makeService(true);
		const runner = mock<SubAgentBackgroundRunner>();
		Container.set(SubAgentBackgroundRunner, runner);
		Container.set(CredentialsService, mock<CredentialsService>());
		const principalHash = published ? integrationPrincipalHash : userPrincipalHash;
		const job = mock<AgentBackgroundJob>({
			id: 'job-1',
			parentAgentId: agentId,
			parentThreadId: 'thread-1',
			subAgentId: 'child-1',
			childThreadId: 'child-thread-1',
			parentResourceId: published ? 'slack:user-1' : 'draft-chat:user-1',
			parentPrincipalHash: principalHash,
			status: 'suspended',
		});
		backgroundJobRepository.findById.mockResolvedValue(job);
		const messageContext: IntegrationMessageContext = {
			...selectedContext,
			replyTarget: { type: 'thread', threadId: 'slack:reply-thread:1' },
		};
		backgroundJobs.getApproval.mockResolvedValue({
			...mock<NonNullable<Awaited<ReturnType<AgentBackgroundJobService['getApproval']>>>>(),
			token: 'gate-1',
			scope: { projectId, principalHash },
			metadata: {
				jobId: job.id,
				taskPath: '/root/research_0',
				resumeContext: { agentId: 'child-1' },
				sharedWorkspace: false,
				messageContext,
			},
		});
		const response = { approved: true };
		expect(
			await collect(
				service.resumeForChat({
					agentId,
					projectId,
					user,
					runId: 'background-job-job-1',
					toolCallId: 'gate-1',
					resumeData: response,
					usePublishedVersion: published,
					messageContext: {
						...selectedContext,
						target: { type: 'thread', threadId: 'slack:reply-thread:1' },
					},
				}),
			),
		).toEqual([]);
		expect(runner.resume).toHaveBeenCalledExactlyOnceWith(
			job,
			{ token: 'gate-1', resumeData: response },
			expect.objectContaining({
				projectId,
				parentAgentId: agentId,
				runType: published ? 'production' : 'test',
				workflowToolExecutionMode: published ? 'integrated' : 'manual',
			}),
		);
		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});
});

function makeCheckpoint(
	pendingToolCalls: SerializableAgentState['pendingToolCalls'] = {},
	persistence: SerializableAgentState['persistence'] = {
		threadId: 'thread-1',
		resourceId: 'draft-chat:user-1',
	},
): SerializableAgentState {
	return {
		status: 'suspended',
		persistence,
		messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
		pendingToolCalls,
	};
}

function delegatedPending(
	toolCallId: string,
	continuation: JSONValue,
): SerializableAgentState['pendingToolCalls'][string] {
	return {
		toolCallId,
		toolName: 'delegate_subagent',
		input: {},
		suspended: true,
		runId: 'run-1',
		resumeSchema: { type: 'object' },
		suspendPayload: { type: 'approval' },
		continuation,
	};
}

describe('AgentExecutionOrchestratorService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		Container.reset();
	});

	describe.each(['start', 'resume'] as const)('%s turn lifecycle', (operation) => {
		function makeTurn({
			abortSignal,
			previewChat = false,
			automaticPreviewContinuation = false,
			announceExecution = true,
		}: {
			abortSignal?: AbortSignal;
			previewChat?: boolean;
			automaticPreviewContinuation?: boolean;
			announceExecution?: boolean;
		} = {}) {
			const fixtures = makeService();
			const runtime = makeRuntime();
			fixtures.runtimeCacheService.getRuntime.mockResolvedValue(runtime);
			fixtures.checkpointStorage.getStatus.mockResolvedValue({
				status: 'active',
				checkpoint: makeCheckpoint(),
			});
			const onExecutionRecorded = vi.fn();
			const onExecutionStarted = vi.fn();
			const stream =
				operation === 'start'
					? fixtures.service.executeForChat({
							agentId,
							projectId,
							user,
							message: 'hello',
							memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
							sessionMode: 'existing',
							onExecutionRecorded,
							...(announceExecution ? { onExecutionStarted } : {}),
							previewChat,
							abortSignal,
						})
					: fixtures.service.resumeForChat({
							user,
							usePublishedVersion: false,
							agentId,
							projectId,
							runId: 'run-1',
							toolCallId: 'tc-1',
							resumeData: { approved: true },
							onExecutionRecorded,
							...(announceExecution ? { onExecutionStarted } : {}),
							previewChat,
							automaticPreviewContinuation,
							abortSignal,
						});
			return {
				...fixtures,
				runtime,
				stream,
				onExecutionRecorded,
				onExecutionStarted,
				sdkStart: operation === 'start' ? runtime.agent.stream : runtime.agent.resume,
			};
		}

		it('announces the recorded execution before the SDK starts', async () => {
			const { stream, onExecutionStarted, sdkStart, executionService } = makeTurn({
				previewChat: true,
			});
			onExecutionStarted.mockImplementation(() => {
				expect(executionService.startExecutionRecording).toHaveBeenCalledOnce();
				expect(sdkStart).not.toHaveBeenCalled();
			});
			await collect(stream);
			expect(onExecutionStarted).toHaveBeenCalledExactlyOnceWith('execution-1', 'thread-1');
		});

		it('rejects a competing preview without creating an execution or claiming a resume', async () => {
			const { stream, onExecutionStarted, sdkStart, executionService, runtimeCacheService } =
				makeTurn({ previewChat: true });
			executionService.startExecutionRecording.mockRejectedValue(
				new AgentTurnAlreadyRunningError(),
			);
			await expect(collect(stream)).rejects.toBeInstanceOf(AgentTurnAlreadyRunningError);
			expect(onExecutionStarted).not.toHaveBeenCalled();
			expect(sdkStart).not.toHaveBeenCalled();
			expect(executionService.startExecutionRecording).toHaveBeenCalledOnce();
			expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledOnce();
		});

		if (operation === 'resume') {
			it('admits one automatic preview continuation for a suspended run', async () => {
				const started = createDeferredPromise<AbortSignal>();
				const release = createDeferredPromise();
				const {
					service,
					stream,
					runtime,
					chatExecutionService,
					checkpointStorage,
					executionService,
					executionRepository,
					onExecutionStarted,
				} = makeTurn({
					previewChat: true,
					automaticPreviewContinuation: true,
					announceExecution: false,
				});
				executionRepository.existsRunningByThread.mockResolvedValue(true);
				runtime.agent.resume.mockImplementation(
					async (_method, _data, options: ResumeOptions & ExecutionOptions) => {
						await options.onResumeClaimed?.();
						checkpointStorage.getStatus.mockResolvedValue({
							status: 'active',
							checkpoint: { ...makeCheckpoint(), status: 'running' },
						});
						if (!options.abortSignal) throw new Error('Expected an execution abort signal.');
						started.resolve(options.abortSignal);
						await release.promise;
						return {
							runId: 'runtime-run-1',
							stream: makeReadableStream([{ type: 'finish', finishReason: 'stop' }]),
						};
					},
				);
				const result = collect(stream);
				const signal = await started.promise;
				executionService.startExecutionRecording.mockRejectedValue(
					new AgentTurnAlreadyRunningError(),
				);
				const resumeAgain = async () =>
					await collect(
						service.resumeForChat({
							user,
							usePublishedVersion: false,
							agentId,
							projectId,
							runId: 'run-1',
							toolCallId: 'tc-1',
							resumeData: { approved: true },
							previewChat: true,
							automaticPreviewContinuation: true,
						}),
					);

				await expect(resumeAgain()).rejects.toBeInstanceOf(AgentTurnAlreadyRunningError);

				await chatExecutionService.handleCancel({
					projectId,
					agentId,
					threadId: 'thread-1',
					executionId: 'execution-1',
					userId,
				});

				expect(executionService.startExecutionRecording).toHaveBeenCalledTimes(2);
				expect(runtime.agent.resume).toHaveBeenCalledOnce();
				expect(onExecutionStarted).not.toHaveBeenCalled();
				expect(signal.aborted).toBe(true);
				release.resolve();
				await result;
				await expect(resumeAgain()).rejects.toBeInstanceOf(AgentTurnAlreadyRunningError);
				expect(executionService.startExecutionRecording).toHaveBeenCalledTimes(3);
				expect(runtime.agent.resume).toHaveBeenCalledOnce();
				expect(executionService.finalizeExecution).toHaveBeenCalledWith(
					'execution-1',
					expect.objectContaining({
						record: expect.objectContaining({ finishReason: 'cancelled', error: null }),
					}),
				);
			});
		}

		it('records cancellation when Stop follows acceptance before the SDK starts', async () => {
			const { stream, onExecutionStarted, sdkStart, executionService, chatExecutionService } =
				makeTurn({ previewChat: true });
			onExecutionStarted.mockImplementation(() => {
				void chatExecutionService.handleCancel({
					projectId,
					agentId,
					threadId: 'thread-1',
					executionId: 'execution-1',
					userId,
				});
			});
			await expect(collect(stream)).rejects.toMatchObject({ name: 'AbortError' });
			expect(sdkStart).not.toHaveBeenCalled();
			expect(executionService.finalizeExecution).toHaveBeenCalledWith(
				'execution-1',
				expect.objectContaining({
					record: expect.objectContaining({ finishReason: 'cancelled', error: null }),
				}),
			);
		});

		it.each(['startExecutionRecording', 'finalizeExecution'] as const)(
			'reports the recording phase when %s fails',
			async (recordingOperation) => {
				const { stream, sdkStart, executionService, onExecutionRecorded, runtimeCacheService } =
					makeTurn();
				const error = new Error('recording unavailable');
				executionService[recordingOperation].mockRejectedValue(error);
				const creationFailed = recordingOperation === 'startExecutionRecording';

				await expect(collect(stream)).rejects.toMatchObject({
					phase: creationFailed ? 'create' : 'finalize',
					executionStarted: !creationFailed,
					cause: error,
					...(!creationFailed ? { executionId: 'execution-1' } : {}),
				});

				expect(onExecutionRecorded).not.toHaveBeenCalled();
				expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledTimes(1);
				if (creationFailed) {
					expect(sdkStart).not.toHaveBeenCalled();
					expect(executionService.finalizeExecution).not.toHaveBeenCalled();
				} else {
					expect(executionService.startExecutionRecording.mock.invocationCallOrder[0]).toBeLessThan(
						sdkStart.mock.invocationCallOrder[0],
					);
				}
				expect(executionService.startExecutionRecording).toHaveBeenCalledOnce();
				expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
					expect.objectContaining({ sessionMode: 'existing' }),
					expect.any(Date),
				);
			},
		);

		it('finalizes the failed attempt and releases the runtime when the SDK rejects', async () => {
			const {
				stream,
				sdkStart,
				executionService,
				runtimeCacheService,
				runtime,
				onExecutionRecorded,
			} = makeTurn();
			const error = new Error('SDK setup failed');
			sdkStart.mockRejectedValue(error);

			await expect(collect(stream)).rejects.toBe(error);

			expect(executionService.finalizeExecution).toHaveBeenCalledExactlyOnceWith(
				'execution-1',
				expect.objectContaining({
					userMessage: operation === 'start' ? 'hello' : null,
					hitlStatus: undefined,
					record: expect.objectContaining({ error: 'SDK setup failed', finishReason: 'error' }),
				}),
			);
			expect(executionService.finalizeExecution.mock.calls[0][1].record.timeline).not.toEqual(
				expect.arrayContaining([expect.objectContaining({ type: 'hitl-response' })]),
			);
			expect(onExecutionRecorded).toHaveBeenCalledWith('execution-1');
			expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledExactlyOnceWith(
				runtime.agent,
			);
		});

		it('retains the SDK error when finalization also fails', async () => {
			const { stream, sdkStart, executionService, runtimeCacheService } = makeTurn();
			const executionError = new Error('SDK rejected the attempt');
			const cause = new Error('database unavailable');
			sdkStart.mockRejectedValue(executionError);
			executionService.finalizeExecution.mockRejectedValue(cause);

			await expect(collect(stream)).rejects.toMatchObject({
				phase: 'finalize',
				executionId: 'execution-1',
				executionStarted: operation === 'start',
				executionError,
				cause,
			});
			expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledOnce();
		});

		it.each(['before recording', 'after recording'] as const)(
			'does not invoke the SDK when cancelled %s',
			async (when) => {
				const controller = new AbortController();
				const { stream, sdkStart, executionService, runtimeCacheService } = makeTurn({
					abortSignal: controller.signal,
				});
				if (when === 'before recording') {
					controller.abort();
				} else {
					executionService.startExecutionRecording.mockImplementation(async () => {
						controller.abort();
						return 'execution-1';
					});
				}

				await expect(collect(stream)).rejects.toMatchObject({ name: 'AbortError' });
				expect(sdkStart).not.toHaveBeenCalled();
				if (when === 'before recording') {
					expect(executionService.startExecutionRecording).not.toHaveBeenCalled();
				} else {
					expect(executionService.finalizeExecution).toHaveBeenCalledWith(
						'execution-1',
						expect.objectContaining({
							hitlStatus: undefined,
							record: expect.objectContaining({ finishReason: 'cancelled', error: null }),
						}),
					);
				}
				expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledTimes(
					when === 'before recording' ? 0 : 1,
				);
			},
		);

		it('releases the runtime when preparation fails after acquisition', async () => {
			const fixtures = makeTurn();
			const error = new Error('preparation failed');
			if (operation === 'start') {
				fixtures.integrationMessageContextService.setLatest.mockRejectedValue(error);
			} else {
				Object.defineProperty(fixtures.agentRunTracingService, 'enabled', { value: true });
				fixtures.executionService.findLatestSuspendedRun.mockRejectedValue(error);
			}

			await expect(collect(fixtures.stream)).rejects.toBe(error);

			expect(fixtures.sdkStart).not.toHaveBeenCalled();
			expect(fixtures.executionService.startExecutionRecording).toHaveBeenCalledTimes(
				operation === 'start' ? 1 : 0,
			);
			if (operation === 'start')
				expect(fixtures.executionService.finalizeExecution).toHaveBeenCalledOnce();
			expect(fixtures.runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledExactlyOnceWith(
				fixtures.runtime.agent,
			);
		});

		it('settles prepared execution after finalization and runtime release', async () => {
			const {
				service,
				executionService,
				checkpointStorage,
				runtimeCacheService,
				runtime,
				onExecutionRecorded,
			} = makeTurn();
			const testRunService = new AgentTestRunService(
				executionService,
				mock<AgentValidationService>(),
				service,
				checkpointStorage,
			);
			const finalization = createDeferredPromise<string>();
			executionService.finalizeExecution.mockReturnValue(finalization.promise);
			const onChunk = vi.fn();
			const input = { agentId, projectId, user, onChunk, onExecutionRecorded };
			let settled = false;
			const execution = (
				operation === 'start'
					? testRunService.executePreparedDraftRun({
							...input,
							message: 'hello',
							sessionId: 'thread-1',
						})
					: testRunService.resumePreparedDraftRun({
							...input,
							runId: 'run-1',
							toolCallId: 'tc-1',
							resumeData: { approved: true },
						})
			).then((result) => {
				settled = true;
				expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledWith(runtime.agent);
				return result;
			});
			await vi.waitFor(() => expect(executionService.finalizeExecution).toHaveBeenCalled());

			expect(onChunk).toHaveBeenCalledWith({ type: 'finish', finishReason: 'stop' });
			expect(settled).toBe(false);
			expect(onExecutionRecorded).not.toHaveBeenCalled();
			expect(runtimeCacheService.releaseRuntimeLease).not.toHaveBeenCalled();

			finalization.resolve('finalized-execution');
			await expect(execution).resolves.toEqual({
				status: 'completed',
				response: '',
				executionId: 'finalized-execution',
			});
			expect(onExecutionRecorded).toHaveBeenCalledWith('finalized-execution');
		});

		it('cancels an early-closed stream and finalizes before callbacks and lease release', async () => {
			const {
				stream,
				sdkStart,
				executionService,
				onExecutionRecorded,
				wakeService,
				runtimeCacheService,
				runtime,
			} = makeTurn();
			const cancel = vi.fn();
			const sdkStream = new ReadableStream<StreamChunk>({
				start(controller) {
					controller.enqueue({ type: 'text-start', id: 'text-1' });
					controller.enqueue({ type: 'text-delta', id: 'text-1', delta: 'partial answer' });
				},
				cancel,
			});
			sdkStart.mockResolvedValue({ stream: sdkStream });
			const finalization = createDeferredPromise<string>();
			executionService.finalizeExecution.mockReturnValue(finalization.promise);

			expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
			await stream.next();
			await stream.next();
			const closing = stream.return(undefined);
			await vi.waitFor(() => expect(executionService.finalizeExecution).toHaveBeenCalled());

			expect(cancel).toHaveBeenCalledTimes(1);
			expect(sdkStream.locked).toBe(false);
			expect(onExecutionRecorded).not.toHaveBeenCalled();
			expect(wakeService.onParentTurnFinished).not.toHaveBeenCalled();
			expect(runtimeCacheService.releaseRuntimeLease).not.toHaveBeenCalled();
			expect(executionService.finalizeExecution).toHaveBeenCalledWith(
				'execution-1',
				expect.objectContaining({
					record: expect.objectContaining({
						assistantResponse: 'partial answer',
						finishReason: 'cancelled',
						error: null,
					}),
				}),
			);

			finalization.resolve('finalized-execution');
			await closing;

			expect(onExecutionRecorded).toHaveBeenCalledWith('finalized-execution');
			expect(onExecutionRecorded.mock.invocationCallOrder[0]).toBeLessThan(
				wakeService.onParentTurnFinished.mock.invocationCallOrder[0],
			);
			expect(wakeService.onParentTurnFinished.mock.invocationCallOrder[0]).toBeLessThan(
				runtimeCacheService.releaseRuntimeLease.mock.invocationCallOrder[0],
			);
			expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledExactlyOnceWith(
				runtime.agent,
			);
		});
	});

	it.each([false, true])(
		'settles headless errors after finalization and runtime release (persistence failure: %s)',
		async (failFinalization) => {
			const { service, executionService, runtimeCacheService, checkpointStorage } = makeService();
			const executionError = new Error('model failed');
			const usage = { promptTokens: 2, completionTokens: 3, totalTokens: 5, cost: 0.01 };
			const runtime = makeRuntime([
				{ type: 'error', error: executionError },
				{ type: 'finish', finishReason: 'error', model: 'mock-model', usage },
			]);
			runtimeCacheService.getRuntime.mockResolvedValue(runtime);
			const validation = mock<AgentValidationService>();
			validation.validateAgentIsRunnable.mockResolvedValue({ missing: [] });
			const testRun = new AgentTestRunService(
				executionService,
				validation,
				service,
				checkpointStorage,
			);
			const finalization = createDeferredPromise<string>();
			executionService.finalizeExecution.mockReturnValue(finalization.promise);
			const outcome = testRun
				.executeDraftRun({
					agentId,
					projectId,
					message: 'hello',
					user,
					credentialProvider: mock<CredentialProvider>(),
				})
				.catch((error: unknown) => error);
			const settled = vi.fn();
			void outcome.then(settled);
			await vi.waitFor(() => expect(executionService.finalizeExecution).toHaveBeenCalled());
			expect(settled).not.toHaveBeenCalled();
			expect(runtimeCacheService.releaseRuntimeLease).not.toHaveBeenCalled();

			if (failFinalization) finalization.reject(new Error('database unavailable'));
			else finalization.resolve('execution-1');
			const error = await outcome;
			if (failFinalization) {
				expect(error).toBeInstanceOf(AgentExecutionRecordingError);
				expect(error).toMatchObject({
					phase: 'finalize',
					executionId: 'execution-1',
					executionError,
				});
			} else {
				expect(error).toBe(executionError);
			}
			expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledWith(runtime.agent);
			expect(executionService.finalizeExecution).toHaveBeenCalledWith(
				'execution-1',
				expect.objectContaining({
					record: expect.objectContaining({
						model: 'mock-model',
						usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
						totalCost: 0.01,
					}),
				}),
			);
		},
	);

	it('starts durable recording before consuming timeline events and finalizes the same row', async () => {
		const { service, executionService } = makeService();
		executionService.startExecutionRecording.mockResolvedValue('execution-running');
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const runtime = makeRuntime([
			{ type: 'text-delta', id: 'text-1', delta: 'Working' },
			{ type: 'finish', finishReason: 'stop' },
		]);

		await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				mcpServerAttributions: runtime.mcpServerAttributions,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({ threadId: 'thread-1', userMessage: 'hello' }),
			expect.any(Date),
		);
		expect(executionService.startExecutionRecording.mock.invocationCallOrder[0]).toBeLessThan(
			executionService.recordTimelineSnapshot.mock.invocationCallOrder[0],
		);
		expect(executionService.recordTimelineSnapshot).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId,
				agentId,
				threadId: 'thread-1',
				executionId: 'execution-running',
			}),
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-running',
			expect.objectContaining({
				record: expect.objectContaining({ assistantResponse: 'Working' }),
			}),
		);
		const startedAt = executionService.startExecutionRecording.mock.calls[0][1];
		const finalizedRecord = executionService.finalizeExecution.mock.calls[0][1].record;
		expect(startedAt.getTime()).toBe(finalizedRecord.startTime);
	});

	const genieResult: StreamChunk = {
		type: 'tool-result',
		toolCallId: 'tc-1',
		toolName: 'Databricks_Genie_ask',
		output: 'rows',
		mcpServerName: 'Databricks Genie',
	};
	const genieAttribution = new Map([['Databricks Genie', 'Powered by Genie']]);

	it('appends the MCP registry attribution on its own line when a tool of that server returned', async () => {
		const { service, executionService } = makeService();
		executionService.startExecutionRecording.mockResolvedValue('execution-running');
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const runtime = makeRuntime(
			[
				genieResult,
				{ type: 'text-delta', id: 'text-1', delta: 'Answer' },
				{ type: 'finish', finishReason: 'stop' },
			],
			genieAttribution,
		);

		const chunks = await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				mcpServerAttributions: runtime.mcpServerAttributions,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		const attributionIndex = chunks.findIndex(
			(chunk) => chunk.type === 'text-delta' && chunk.delta === '\n\nPowered by Genie',
		);
		const finishIndex = chunks.findIndex((chunk) => chunk.type === 'finish');
		expect(attributionIndex).toBeGreaterThan(-1);
		expect(attributionIndex).toBeLessThan(finishIndex);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-running',
			expect.objectContaining({
				record: expect.objectContaining({ assistantResponse: 'Answer\n\nPowered by Genie' }),
			}),
		);
	});

	it('appends no attribution when the reply is reasoning only, with no text', async () => {
		const { service, executionService } = makeService();
		executionService.startExecutionRecording.mockResolvedValue('execution-running');
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const runtime = makeRuntime(
			[
				genieResult,
				{ type: 'reasoning-start', id: 'reasoning-1' },
				{ type: 'reasoning-delta', id: 'reasoning-1', delta: 'Check the result.' },
				{ type: 'reasoning-end', id: 'reasoning-1' },
				{ type: 'finish', finishReason: 'stop' },
			],
			genieAttribution,
		);

		const chunks = await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				mcpServerAttributions: runtime.mcpServerAttributions,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		expect(chunks.some((chunk) => chunk.type === 'text-delta')).toBe(false);
	});

	it('appends no attribution when no tool of that server returned a result', async () => {
		const { service, executionService } = makeService();
		executionService.startExecutionRecording.mockResolvedValue('execution-running');
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const runtime = makeRuntime(
			[
				// Same name prefix as an attributed server, but not one of its tools
				{ type: 'tool-result', toolCallId: 'tc-0', toolName: 'web_search', output: [] },
				{ ...genieResult, isError: true },
				{ type: 'text-delta', id: 'text-1', delta: 'Answer' },
				{ type: 'finish', finishReason: 'stop' },
			],
			new Map([...genieAttribution, ['web', 'Powered by Web']]),
		);

		const chunks = await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				mcpServerAttributions: runtime.mcpServerAttributions,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		expect(chunks.filter((chunk) => chunk.type === 'text-delta')).toHaveLength(1);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-running',
			expect.objectContaining({
				record: expect.objectContaining({ assistantResponse: 'Answer' }),
			}),
		);
	});

	it('skips the attribution the model already echoed into its reply', async () => {
		const { service, executionService } = makeService();
		executionService.startExecutionRecording.mockResolvedValue('execution-running');
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const runtime = makeRuntime(
			[
				genieResult,
				{ type: 'text-delta', id: 'text-1', delta: 'Answer\n\nPowered by Genie' },
				{ type: 'finish', finishReason: 'stop' },
			],
			genieAttribution,
		);

		await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				mcpServerAttributions: runtime.mcpServerAttributions,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		const finalizedRecord = executionService.finalizeExecution.mock.calls[0][1].record;
		expect(finalizedRecord.assistantResponse).toBe('Answer\n\nPowered by Genie');
	});

	it('attributes an approval-gated tool on the resumed segment, not on the suspended one', async () => {
		const { service, executionService, checkpointStorage, runtimeCacheService } = makeService();
		executionService.startExecutionRecording.mockResolvedValue('execution-running');
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const suspended = makeRuntime(
			[
				// A sibling Genie tool already returned; the suspended segment is not the reply
				{ ...genieResult, toolCallId: 'tc-0' },
				{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'Databricks_Genie_ask', input: {} },
				{
					type: 'tool-call-suspended',
					toolCallId: 'tc-1',
					toolName: 'Databricks_Genie_ask',
					runId: 'run-1',
				},
				{ type: 'finish', finishReason: 'tool-calls' },
			],
			genieAttribution,
		);

		const suspendedChunks = await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: suspended.agent,
				toolRegistry: suspended.toolRegistry,
				mcpServerAttributions: suspended.mcpServerAttributions,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);
		expect(suspendedChunks.some((chunk) => chunk.type === 'text-delta')).toBe(false);

		const resumed = makeRuntime(
			[
				genieResult,
				{ type: 'text-delta', id: 'text-1', delta: 'Answer' },
				{ type: 'finish', finishReason: 'stop' },
			],
			genieAttribution,
		);
		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'resource-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(resumed);

		const resumedChunks = await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { approved: true },
			}),
		);
		expect(
			resumedChunks.some(
				(chunk) => chunk.type === 'text-delta' && chunk.delta === '\n\nPowered by Genie',
			),
		).toBe(true);
	});

	it('streams chat responses and records suspended executions', async () => {
		const { service, executionService, wakeService } = makeService();
		const abortController = new AbortController();
		const runtime = makeRuntime([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: 'Choose one' },
			{
				type: 'tool-call-suspended',
				toolCallId: 'tc-1',
				toolName: 'ask_questions',
				runId: 'run-1',
			},
		]);

		const chunks = await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				mcpServerAttributions: runtime.mcpServerAttributions,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
				abortSignal: abortController.signal,
			}),
		);

		expect(chunks.at(-1)?.type).toBe('tool-call-suspended');
		expect(wakeService.onParentTurnFinished).toHaveBeenCalledWith('thread-1');
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({
				persistence: {
					threadId: 'thread-1',
					resourceId: 'resource-1',
					hostMetadata: expect.objectContaining(
						encodeAgentSandboxHostMetadata({
							projectId,
							principalHash: userPrincipalHash,
						}),
					),
				},
				executionCounter: expect.any(Object),
				abortSignal: expect.any(AbortSignal),
				modelStreamIdleTimeoutMs: 90_000,
				modelStreamFirstOutputTimeoutMs: 180_000,
			}),
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				threadId: 'thread-1',
				userMessage: 'hello',
				hitlStatus: 'suspended',
				record: expect.objectContaining({ assistantResponse: 'Choose one' }),
			}),
		);
	});

	it('awaits finalization and notifies onExecutionRecorded with the returned id', async () => {
		const { service, executionService } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		const onExecutionRecorded = vi.fn();

		await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				mcpServerAttributions: runtime.mcpServerAttributions,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
				onExecutionRecorded,
			}),
		);

		expect(executionService.finalizeExecution).toHaveBeenCalled();
		expect(onExecutionRecorded).toHaveBeenCalledWith('execution-1');
	});

	it('still records the message when onExecutionRecorded is omitted', async () => {
		const { service, executionService } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				mcpServerAttributions: runtime.mcpServerAttributions,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		expect(executionService.finalizeExecution).toHaveBeenCalled();
	});

	it('executes in-app chat against the draft runtime with the caller source', async () => {
		const {
			service,
			runtimeCacheService,
			executionService,
			integrationMessageContextService,
			agentRunTracingService,
			externalHooks,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.executeForChat({
				agentId,
				projectId,
				message: 'hello',
				user,
				memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
				source: 'instance-ai',
			}),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			user,
			sandboxPrincipalHash: userPrincipalHash,
		});
		expect(integrationMessageContextService.setLatest).toHaveBeenCalledWith(
			'thread-1',
			'draft-chat:user-1',
			expect.objectContaining({
				integrationConnectionId: N8N_CHAT_INTEGRATION_TYPE,
				platform: N8N_CHAT_INTEGRATION_TYPE,
				target: { type: 'dm', userId, threadId: 'thread-1' },
				interactingUserId: userId,
				updatedAt: expect.any(String),
			}),
		);
		expect(
			integrationMessageContextService.setLatest.mock.invocationCallOrder[0] ?? 0,
		).toBeLessThan(runtime.agent.stream.mock.invocationCallOrder[0] ?? 0);
		expect(externalHooks.run).not.toHaveBeenCalled();
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				source: 'instance-ai',
				taskId: undefined,
				telemetry: {
					userId,
					runType: 'test',
					configuration: runtime.telemetryConfiguration,
				},
			}),
		);
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({
				source: 'instance-ai',
				threadId: 'thread-1',
				modelId: 'anthropic/claude-sonnet-4-5',
			}),
		);
	});

	it.each(['chat', 'wake'] as const)(
		'rejects an inaccessible draft %s before runtime acquisition',
		async (operation) => {
			const { service, executionService, runtimeCacheService } = makeService();
			executionService.canUseDraftThread.mockResolvedValue(false);
			const result =
				operation === 'chat'
					? collect(
							service.executeForChat({
								agentId,
								projectId,
								message: 'hello',
								user,
								memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
							}),
						)
					: service.executeForWake({
							backgroundJobSignal,
							agentId,
							projectId,
							message: 'Wake',
							memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
							identity: { type: 'draft', user, principalHash: userPrincipalHash },
							abortSignal: new AbortController().signal,
						});

			await expect(result).rejects.toThrow('Session not found');
			expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
			expect(executionService.startExecutionRecording).not.toHaveBeenCalled();
		},
	);

	it('adds full tool configuration to preview approval payloads only', async () => {
		const { service, runtimeCacheService } = makeService();
		const approvalChunk: StreamChunk = {
			type: 'tool-call-suspended',
			toolCallId: 'tc-1',
			toolName: 'check_ledger',
			runId: 'run-1',
			suspendPayload: {
				type: 'approval',
				toolName: 'check_ledger',
				args: {},
			},
		};
		const previewRuntime = makeRuntime([approvalChunk]);
		previewRuntime.toolRegistry = new Map([
			[
				'check_ledger',
				{
					kind: 'node',
					nodeType: 'n8n-nodes-base.dataTableTool',
					nodeParameters: { resource: 'row', operation: 'get', returnAll: true },
				},
			],
		]);
		const publishedRuntime = makeRuntime([approvalChunk]);
		publishedRuntime.toolRegistry = previewRuntime.toolRegistry;
		runtimeCacheService.getRuntime
			.mockResolvedValueOnce(previewRuntime)
			.mockResolvedValueOnce(publishedRuntime);

		const previewChunks = await collect(
			service.executeForChat({
				agentId,
				projectId,
				message: 'check the ledger',
				user,
				memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
			}),
		);
		const publishedChunks = await collect(
			service.executeForChatPublished({
				agentId,
				projectId,
				message: 'check the ledger',
				memory: { threadId: 'thread-2', resourceId: 'platform-user-1' },
				integrationType: 'slack',
				sandboxPrincipalHash: integrationPrincipalHash,
			}),
		);

		expect(previewChunks[0]).toMatchObject({
			type: 'tool-call-suspended',
			suspendPayload: {
				type: 'approval',
				details: {
					toolName: 'check_ledger',
					input: {},
					node: {
						type: 'n8n-nodes-base.dataTableTool',
						parameters: { resource: 'row', operation: 'get', returnAll: true },
					},
				},
			},
		});
		expect(publishedChunks[0]).toEqual(approvalChunk);
	});

	it('executes published integration chat with integration-scoped runtime', async () => {
		const {
			service,
			runtimeCacheService,
			executionService,
			agentRunTracingService,
			externalHooks,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.executeForChatPublished({
				agentId,
				projectId,
				message: 'from slack',
				modelMessage: '[alice (platform-user-1)]: from slack',
				author: { id: 'platform-user-1', name: 'alice' },
				memory: { threadId: 'thread-1', resourceId: 'platform-user-1' },
				integrationType: 'slack',
				sandboxPrincipalHash: integrationPrincipalHash,
			}),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: 'slack',
			usePublishedVersion: true,
			sandboxPrincipalHash: integrationPrincipalHash,
		});
		// The model sees the labelled text; the transcript keeps the plain text and the author.
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'[alice (platform-user-1)]: from slack',
			expect.anything(),
		);
		expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({
				userMessage: 'from slack',
				author: { id: 'platform-user-1', name: 'alice' },
			}),
			expect.any(Date),
		);
		expect(externalHooks.run).toHaveBeenCalledWith('agent.preExecute', [agentId]);
		expect(externalHooks.run).toHaveBeenCalledTimes(1);
		expect(externalHooks.run.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
			runtimeCacheService.getRuntime.mock.invocationCallOrder[0] ?? 0,
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				source: 'slack',
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
			}),
		);
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'slack' }),
		);
	});

	it.each(['none', 'startExecutionRecording', 'finalizeExecution'] as const)(
		'reports preview initialization failures with the recording outcome (%s)',
		async (failure) => {
			const { service, runtimeCacheService, executionService, agentRepository } = makeService();
			const executionError = new Error('runtime initialization failed');
			const cause = new Error('recording unavailable');
			runtimeCacheService.getRuntime.mockRejectedValue(executionError);
			agentRepository.findByIdAndProjectId.mockResolvedValue({
				id: agentId,
				name: 'Support Agent',
				schema,
				integrations: [],
			} as unknown as Agent);
			if (failure !== 'none') executionService[failure].mockRejectedValue(cause);
			const onExecutionRecorded = vi.fn();
			const result = collect(
				service.executeForChat({
					agentId,
					projectId,
					user,
					message: 'Hello',
					memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
					onExecutionRecorded,
				}),
			);
			if (failure === 'none') {
				await expect(result).rejects.toBe(executionError);
				expect(onExecutionRecorded).toHaveBeenCalledWith('execution-1');
			} else {
				await expect(result).rejects.toMatchObject({
					phase: failure === 'startExecutionRecording' ? 'create' : 'finalize',
					executionStarted: false,
					executionError,
					cause,
				});
				expect(onExecutionRecorded).not.toHaveBeenCalled();
			}
			expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
				expect.objectContaining({ access: { accessScope: 'user', ownerId: user.id } }),
				expect.any(Date),
			);
		},
	);

	it('does not record a runtime failure when cancellation arrives during agent lookup', async () => {
		const { service, runtimeCacheService, executionService, agentRepository } = makeService();
		const controller = new AbortController();
		const agent = createDeferredPromise<Agent | null>();
		runtimeCacheService.getRuntime.mockRejectedValue(new Error('runtime initialization failed'));
		agentRepository.findByIdAndProjectId.mockReturnValue(agent.promise);

		const result = collect(
			service.executeForChat({
				agentId,
				projectId,
				user,
				message: 'Hello',
				memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
				abortSignal: controller.signal,
			}),
		);
		await vi.waitFor(() => expect(agentRepository.findByIdAndProjectId).toHaveBeenCalled());
		controller.abort();
		agent.resolve(null);

		await expect(result).rejects.toMatchObject({ name: 'AbortError' });
		expect(executionService.startExecutionRecording).not.toHaveBeenCalled();
	});

	it('does not mark an unclaimed resume error stream as an accepted human response', async () => {
		const { service, runtimeCacheService, executionService, checkpointStorage } = makeService();
		const runtime = makeRuntime();
		runtime.agent.resume.mockResolvedValue({
			stream: makeReadableStream([
				{ type: 'error', error: new Error('claim unavailable') },
				{ type: 'finish', finishReason: 'error' },
			]),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint(),
		});
		await collect(
			service.resumeForChat({
				user,
				usePublishedVersion: false,
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { approved: true },
			}),
		);
		const { record, hitlStatus } = executionService.finalizeExecution.mock.calls[0][1];
		expect(hitlStatus).toBeUndefined();
		expect(record.error).toBe('claim unavailable');
		expect(record.timeline).not.toContainEqual(expect.objectContaining({ type: 'hitl-response' }));
	});

	it.each([false, true])(
		'installs a captured context before starting, including when metadata writes fail: %s',
		async (writeFails) => {
			const { service, runtimeCacheService, integrationMessageContextService } = makeService();
			const runtime = makeRuntime();
			runtimeCacheService.getRuntime.mockResolvedValue(runtime);
			if (writeFails)
				integrationMessageContextService.setLatest.mockRejectedValue(
					new Error('database unavailable'),
				);
			const memory = { threadId: 'task-run-1', resourceId: 'task:task-1' };
			const contextConversation = { threadId: 'platform-thread', resourceId: 'selected-user' };
			await collect(
				service.executeForChatPublished({
					agentId,
					projectId,
					message: 'hello',
					memory,
					contextConversation,
					messageContext: selectedContext,
					integrationType: 'slack',
					sandboxPrincipalHash: taskPrincipalHash,
				}),
			);
			expect(runtime.agent.stream).toHaveBeenCalledWith(
				'hello',
				expect.objectContaining({
					persistence: {
						...memory,
						hostMetadata: {
							...encodeAgentSandboxHostMetadata({ projectId, principalHash: taskPrincipalHash }),
							...encodeIntegrationMessageContext(selectedContext),
							n8nExecutionId: 'execution-1',
						},
					},
				}),
			);
			expect(integrationMessageContextService.setLatest).toHaveBeenCalledWith(
				'platform-thread',
				'selected-user',
				selectedContext,
			);
			expect(integrationMessageContextService.setLatest).toHaveBeenCalledWith(
				'task-run-1',
				'task:task-1',
				selectedContext,
			);
			expect(integrationMessageContextService.setLatest.mock.invocationCallOrder[1]).toBeLessThan(
				runtime.agent.stream.mock.invocationCallOrder[0],
			);
		},
	);

	it.each(['new', 'existing'] as const)(
		'preserves %s intent when recording a failed runtime build',
		async (sessionMode) => {
			const { service, runtimeCacheService, executionService, agentRepository } = makeService();
			const buildError = new UserError('Credential "OpenAI" not found');
			runtimeCacheService.getRuntime.mockRejectedValue(buildError);
			// A plain object: `mock<Agent>()` proxies nested fields, which breaks the
			// telemetry builder's array handling of `schema`.
			agentRepository.findByIdAndProjectId.mockResolvedValue({
				id: agentId,
				name: 'Support Agent (draft)',
				schema: { ...schema, name: 'Support Agent (draft)' },
				activeVersion: { schema },
				integrations: [],
			} as unknown as Agent);

			await expect(
				collect(
					service.executeForChatPublished({
						agentId,
						projectId,
						message: 'from slack',
						memory: { threadId: 'thread-1', resourceId: 'platform-user-1' },
						sessionMode,
						integrationType: 'slack',
						sandboxPrincipalHash: integrationPrincipalHash,
					}),
				),
			).rejects.toBe(buildError);

			expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId,
					agentName: 'Support Agent',
					threadId: 'thread-1',
					userMessage: 'from slack',
					source: 'slack',
					sessionMode,
					telemetry: expect.objectContaining({ runType: 'production' }),
				}),
				expect.any(Date),
			);
			expect(executionService.finalizeExecution).toHaveBeenCalledWith(
				'execution-1',
				expect.objectContaining({
					record: expect.objectContaining({
						finishReason: 'error',
						error: 'Credential "OpenAI" not found',
					}),
				}),
			);
		},
	);

	it('rethrows the build error without recording when the agent no longer exists', async () => {
		const { service, runtimeCacheService, executionService, agentRepository } = makeService();
		const buildError = new Error('boom');
		runtimeCacheService.getRuntime.mockRejectedValue(buildError);
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(
			collect(
				service.executeForTaskPublished({
					agentId,
					projectId,
					message: 'run task',
					memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
					taskId: 'task-1',
					taskVersionId: 'version-1',
				}),
			),
		).rejects.toBe(buildError);

		expect(executionService.startExecutionRecording).not.toHaveBeenCalled();
	});

	it('executes published scheduled tasks with task-scoped runtime and metadata', async () => {
		const {
			service,
			runtimeCacheService,
			executionService,
			agentRunTracingService,
			externalHooks,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.executeForTaskPublished({
				agentId,
				projectId,
				message: 'run task',
				memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
				taskId: 'task-1',
				taskVersionId: 'version-1',
			}),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: 'task',
			usePublishedVersion: true,
			sandboxPrincipalHash: taskPrincipalHash,
			allowBackgroundTasks: false,
		});
		expect(externalHooks.run).toHaveBeenCalledWith('agent.preExecute', [agentId]);
		expect(externalHooks.run).toHaveBeenCalledTimes(1);
		expect(externalHooks.run.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
			runtimeCacheService.getRuntime.mock.invocationCallOrder[0] ?? 0,
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				source: 'task',
				taskId: 'task-1',
				taskVersionId: 'version-1',
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
			}),
		);
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'task' }),
		);
	});

	it('does not execute a published scheduled task when the agent quota hook rejects it', async () => {
		const { service, runtimeCacheService, externalHooks } = makeService();
		const quotaError = new UserError('Execution quota exhausted');
		externalHooks.run.mockRejectedValue(quotaError);

		await expect(
			collect(
				service.executeForTaskPublished({
					agentId,
					projectId,
					message: 'run task',
					memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
					taskId: 'task-1',
					taskVersionId: 'version-1',
				}),
			),
		).rejects.toBe(quotaError);

		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('does not run the quota hook for manually started scheduled tasks', async () => {
		const { service, runtimeCacheService, externalHooks, executionService } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.executeForTaskNow({
				agentId,
				projectId,
				user,
				message: 'run task manually',
				memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
				taskId: 'task-1',
			}),
		);

		expect(externalHooks.run).not.toHaveBeenCalled();
		expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({ access: { accessScope: 'project', ownerId: null } }),
			expect.any(Date),
		);
		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith(
			expect.objectContaining({
				sandboxPrincipalHash: userPrincipalHash,
				allowBackgroundTasks: false,
			}),
		);
	});

	it('requests pending job results after a chat turn and ignores request errors', async () => {
		const first = makeService();
		first.runtimeCacheService.getRuntime.mockResolvedValue(makeRuntime());

		await collect(
			first.service.executeForChat({
				agentId,
				projectId,
				message: 'hello',
				user,
				memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
			}),
		);

		expect(first.wakeService.onParentTurnFinished).toHaveBeenCalledWith('thread-1');

		const failing = makeService();
		failing.runtimeCacheService.getRuntime.mockResolvedValue(makeRuntime());
		failing.wakeService.onParentTurnFinished.mockRejectedValue(
			new Error('wake service unavailable'),
		);

		await expect(
			collect(
				failing.service.executeForChat({
					agentId,
					projectId,
					message: 'hello',
					user,
					memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
				}),
			),
		).resolves.toEqual(expect.any(Array));
	});

	it('records the background signal before the model produces any output', async () => {
		const { service, runtimeCacheService, executionService } = makeService();
		const runtime = makeRuntime();
		let streamController!: ReadableStreamDefaultController<StreamChunk>;
		vi.mocked(runtime.agent.stream).mockResolvedValue({
			stream: new ReadableStream<StreamChunk>({
				start(controller) {
					streamController = controller;
				},
			}),
			runId: 'run-1',
			getState: vi.fn(),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		const wake = service.executeForWake({
			backgroundJobSignal,
			agentId,
			projectId,
			message: '<background-jobs-settled>internal result</background-jobs-settled>',
			memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
			identity: { type: 'draft', user, principalHash: userPrincipalHash },
			abortSignal: new AbortController().signal,
		});
		try {
			await vi.waitFor(() =>
				expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
					expect.objectContaining({
						userMessage: null,
						initialTimeline: [
							{
								type: 'background-task-signal',
								timestamp: expect.any(Number),
								signal: backgroundJobSignal,
							},
						],
					}),
					expect.any(Date),
				),
			);
			expect(executionService.finalizeExecution).not.toHaveBeenCalled();
		} finally {
			streamController.enqueue({ type: 'text-delta', id: 'text-1', delta: 'Done' });
			streamController.enqueue({ type: 'finish', finishReason: 'stop' });
			streamController.close();
			await wake;
		}
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				record: expect.objectContaining({
					timeline: [
						expect.objectContaining({
							type: 'background-task-signal',
							signal: backgroundJobSignal,
						}),
						expect.objectContaining({ type: 'text', content: 'Done' }),
					],
				}),
			}),
		);
	});

	it.each(['startExecutionRecording', 'finalizeExecution'] as const)(
		'does not deliver wake output when %s fails',
		async (operation) => {
			const { service, runtimeCacheService, executionService, bridge } = makeService();
			const runtime = makeRuntime();
			runtimeCacheService.getRuntime.mockResolvedValue(runtime);
			executionService[operation].mockRejectedValue(new Error('recording unavailable'));
			await expect(
				service.executeForWake({
					agentId,
					projectId,
					message: 'Wake',
					backgroundJobSignal,
					memory: { threadId: 'thread-1', resourceId: 'user-1' },
					identity: {
						type: 'published',
						integrationType: 'slack',
						principalHash: integrationPrincipalHash,
					},
					abortSignal: new AbortController().signal,
				}),
			).rejects.toBeInstanceOf(AgentExecutionRecordingError);
			expect(bridge.deliverWakeResponse).not.toHaveBeenCalled();
			expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledWith(runtime.agent);
		},
	);

	it('runs a draft wake without a chat client and hides its input from execution history', async () => {
		const { service, runtimeCacheService, executionService, externalHooks, wakeService, bridge } =
			makeService();
		const runtime = makeRuntime([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: 'Handled the background result.' },
			{ type: 'finish', finishReason: 'stop' },
		]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		const abortSignal = new AbortController().signal;

		await service.executeForWake({
			backgroundJobSignal,
			agentId,
			projectId,
			message: '<background-jobs-settled>[]</background-jobs-settled>',
			memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
			identity: { type: 'draft', user, principalHash: userPrincipalHash },
			abortSignal,
		});

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			usePublishedVersion: false,
			user,
			sandboxPrincipalHash: userPrincipalHash,
		});
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'<background-jobs-settled>[]</background-jobs-settled>',
			expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
		);
		expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({ userMessage: null, sessionMode: 'existing' }),
			expect.any(Date),
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				userMessage: null,
				record: expect.objectContaining({
					assistantResponse: 'Handled the background result.',
				}),
			}),
		);
		expect(bridge.deliverWakeResponse).not.toHaveBeenCalled();
		// Draft wakes skip the quota hook and do not trigger another wake.
		expect(externalHooks.run).not.toHaveBeenCalled();
		expect(wakeService.onParentTurnFinished).not.toHaveBeenCalled();
	});

	it.each(['draft', 'published'] as const)(
		'records a failed %s wake without delivering its output',
		async (type) => {
			const { service, runtimeCacheService, executionService, wakeService, bridge } = makeService();
			const cause = new Error('provider unavailable');
			runtimeCacheService.getRuntime.mockResolvedValue(
				makeRuntime([
					{ type: 'error', error: cause },
					{ type: 'finish', finishReason: 'error' },
				]),
			);

			await expect(
				service.executeForWake({
					backgroundJobSignal,
					agentId,
					projectId,
					message: '<background-jobs-settled>[]</background-jobs-settled>',
					memory: {
						threadId: 'thread-1',
						resourceId: type === 'draft' ? 'draft-chat:user-1' : 'integration:slack:user-1',
					},
					identity:
						type === 'draft'
							? { type, user, principalHash: userPrincipalHash }
							: { type, integrationType: 'slack', principalHash: integrationPrincipalHash },
					abortSignal: new AbortController().signal,
				}),
			).rejects.toBeInstanceOf(OperationalError);

			expect(executionService.finalizeExecution).toHaveBeenCalledWith(
				'execution-1',
				expect.objectContaining({ userMessage: null }),
			);
			expect(wakeService.onParentTurnFinished).not.toHaveBeenCalled();
			expect(bridge.deliverWakeResponse).not.toHaveBeenCalled();
		},
	);

	it('delivers a published wake through the stored connection and reply thread', async () => {
		const {
			service,
			runtimeCacheService,
			externalHooks,
			chatIntegrationService,
			bridge,
			integrationMessageContextService,
		} = makeService();
		const messageContext = {
			...selectedContext,
			replyTarget: { type: 'thread' as const, threadId: 'slack:channel-1:1' },
		};
		integrationMessageContextService.getLatest
			.mockResolvedValueOnce(messageContext)
			.mockRejectedValueOnce(new Error('Unexpected second context read'));
		const chunks: StreamChunk[] = [
			{ type: 'text-delta', id: 'text-1', delta: 'The job is done.' },
			{ type: 'finish', finishReason: 'stop' },
		];
		const runtime = makeRuntime(chunks);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await service.executeForWake({
			backgroundJobSignal,
			agentId,
			projectId,
			message: '<background-jobs-settled>[]</background-jobs-settled>',
			memory: { threadId: 'thread-1', resourceId: 'integration:slack:user-1' },
			identity: {
				type: 'published',
				integrationType: 'slack',
				principalHash: integrationPrincipalHash,
			},
			abortSignal: new AbortController().signal,
		});

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: 'slack',
			usePublishedVersion: true,
			sandboxPrincipalHash: integrationPrincipalHash,
		});
		expect(externalHooks.run).toHaveBeenCalledWith('agent.preExecute', [agentId]);
		expect(chatIntegrationService.getBridge).toHaveBeenCalledWith(agentId, 'slack', 'credential-1');
		expect(bridge.deliverWakeResponse).toHaveBeenCalledWith('slack:channel-1:1', chunks);
		expect(
			readIntegrationMessageContext(runtime.agent.stream.mock.calls[0][1].persistence),
		).toEqual(messageContext);
	});

	it('rejects a wake when chat delivery fails and releases the runtime', async () => {
		const { service, executionService, runtimeCacheService, bridge } = makeService();
		const runtime = makeRuntime();
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		const error = new Error('Slack is unavailable');
		bridge.deliverWakeResponse.mockImplementation(async () => {
			expect(executionService.finalizeExecution).toHaveBeenCalled();
			expect(runtimeCacheService.releaseRuntimeLease).not.toHaveBeenCalled();
			throw error;
		});

		await expect(
			service.executeForWake({
				backgroundJobSignal,
				agentId,
				projectId,
				message: '<background-jobs-settled>[]</background-jobs-settled>',
				memory: { threadId: 'thread-1', resourceId: 'integration:slack:user-1' },
				identity: {
					type: 'published',
					integrationType: 'slack',
					principalHash: integrationPrincipalHash,
				},
				abortSignal: new AbortController().signal,
			}),
		).rejects.toBe(error);

		expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledWith(runtime.agent);
	});

	it.each(['context', 'connection'] as const)(
		'does not start a wake when its reply %s is missing',
		async (missing) => {
			const {
				service,
				runtimeCacheService,
				integrationMessageContextService,
				chatIntegrationService,
				bridge,
			} = makeService();
			if (missing === 'context') integrationMessageContextService.getLatest.mockResolvedValue(null);
			else chatIntegrationService.getBridge.mockReturnValue(undefined);

			await expect(
				service.executeForWake({
					backgroundJobSignal,
					agentId,
					projectId,
					message: '<background-jobs-settled>[]</background-jobs-settled>',
					memory: { threadId: 'thread-1', resourceId: 'integration:slack:user-1' },
					identity: {
						type: 'published',
						integrationType: 'slack',
						principalHash: integrationPrincipalHash,
					},
					abortSignal: new AbortController().signal,
				}),
			).rejects.toBeInstanceOf(OperationalError);

			expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
			expect(bridge.deliverWakeResponse).not.toHaveBeenCalled();
		},
	);

	it('adds the max-iterations assistant text before the finish chunk and persists it', async () => {
		const { service, executionService } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'max-iterations' }]);

		const chunks = await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				mcpServerAttributions: runtime.mcpServerAttributions,
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		const generatedTextIndex = chunks.findIndex(
			(chunk) =>
				chunk.type === 'text-delta' && chunk.delta.includes('maximum number of iterations'),
		);
		const finishIndex = chunks.findIndex((chunk) => chunk.type === 'finish');

		expect(generatedTextIndex).toBeGreaterThan(-1);
		expect(generatedTextIndex).toBeLessThan(finishIndex);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				record: expect.objectContaining({
					assistantResponse: expect.stringContaining('maximum number of iterations'),
				}),
			}),
		);
	});

	it('records a failed execution when the stream reader errors before finish', async () => {
		const { service, executionService } = makeService();
		const streamError = new Error('reader failed while consuming stream');
		const runtime = makeRuntime();
		runtime.agent.stream.mockResolvedValue({ stream: makeFailingStream(streamError) });

		await expect(
			collect(
				service.streamChatResponse({
					access: { accessScope: 'user', ownerId: userId },
					agentInstance: runtime.agent,
					toolRegistry: runtime.toolRegistry,
					mcpServerAttributions: runtime.mcpServerAttributions,
					agentId,
					message: 'hello',
					memory: { threadId: 'thread-1', resourceId: 'resource-1' },
					projectId,
					telemetry: telemetryContext,
					sandboxPrincipalHash: userPrincipalHash,
				}),
			),
		).rejects.toThrow('reader failed while consuming stream');

		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				threadId: 'thread-1',
				agentId,
				userMessage: 'hello',
				record: expect.objectContaining({
					assistantResponse: 'partial answer',
					finishReason: 'error',
					error: 'reader failed while consuming stream',
				}),
			}),
		);
	});

	it('persists an aborted chat stream as cancelled without discarding partial output', async () => {
		const { service, executionService } = makeService();
		const abortController = new AbortController();
		const runtime = makeRuntime([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: 'partial answer' },
			{ type: 'error', error: new Error('This operation was aborted') },
			{ type: 'finish', finishReason: 'error' },
		]);
		const stream = service.streamChatResponse({
			access: { accessScope: 'user', ownerId: userId },
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			mcpServerAttributions: runtime.mcpServerAttributions,
			agentId,
			message: 'hello',
			memory: { threadId: 'thread-1', resourceId: 'resource-1' },
			projectId,
			telemetry: telemetryContext,
			sandboxPrincipalHash: userPrincipalHash,
			abortSignal: abortController.signal,
			onExecutionRecorded: vi.fn(),
		});

		await stream.next();
		await stream.next();
		abortController.abort();
		await collect(stream);

		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				userMessage: 'hello',
				record: expect.objectContaining({
					assistantResponse: 'partial answer',
					finishReason: 'cancelled',
					error: null,
					timeline: [expect.objectContaining({ type: 'text', content: 'partial answer' })],
				}),
			}),
		);
	});

	it('maps persisted execution history to chat DTOs', async () => {
		const { service, executionService } = makeService();
		const createdAt = new Date('2026-04-26T10:00:00.000Z');
		executionService.getThreadDetail.mockResolvedValue({
			thread: { id: 'thread-1' },
			executions: [
				{
					id: 'execution-1',
					userMessage: 'Hi',
					createdAt,
					timeline: [{ type: 'text', content: 'Hello', timestamp: 100 }],
				},
			],
		} as never);

		await expect(
			service.getConversationHistory({ threadId: 'thread-1', projectId, agentId, userId }),
		).resolves.toEqual({
			activeExecutionId: null,
			messages: [
				{
					id: 'execution-1:user',
					executionId: 'execution-1',
					role: 'user',
					content: [{ type: 'text', text: 'Hi' }],
					createdAt: createdAt.toISOString(),
				},
				{
					id: 'execution-1:assistant',
					executionId: 'execution-1',
					role: 'assistant',
					content: [{ type: 'text', text: 'Hello' }],
					createdAt: createdAt.toISOString(),
				},
			],
		});
	});

	it('returns the running execution before it has any recorded output', async () => {
		const { service, executionService } = makeService();
		executionService.getThreadDetail.mockResolvedValue({
			thread: { id: 'thread-1' },
			executions: [
				{
					id: 'execution-1',
					status: 'running',
					userMessage: null,
					createdAt: new Date(),
					timeline: [],
				},
			],
		} as never);
		await expect(
			service.getConversationHistory({ threadId: 'thread-1', projectId, agentId, userId }),
		).resolves.toEqual({ messages: [], activeExecutionId: 'execution-1' });
	});

	it('rejects expired checkpoints and resumes active checkpoints without passing resourceId', async () => {
		const {
			service,
			checkpointStorage,
			runtimeCacheService,
			executionService,
			externalHooks,
			wakeService,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		checkpointStorage.getStatus.mockResolvedValueOnce({ status: 'expired' });
		await expect(
			collect(
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'expired-run',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
				}),
			),
		).rejects.toThrow(UserError);
		expect(checkpointStorage.getStatus).toHaveBeenLastCalledWith('expired-run', agentId);

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		const abortController = new AbortController();
		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
				abortSignal: abortController.signal,
			}),
		);
		expect(checkpointStorage.getStatus).toHaveBeenLastCalledWith('run-1', agentId);

		expect(runtime.agent.resume).toHaveBeenCalledWith(
			'stream',
			{ value: 'yes' },
			expect.objectContaining({
				runId: 'run-1',
				toolCallId: 'tc-1',
				abortSignal: expect.any(AbortSignal),
			}),
		);
		expect(externalHooks.run).not.toHaveBeenCalled();
		// After the resumed turn, request any job results that arrived during the approval wait.
		expect(wakeService.onParentTurnFinished).toHaveBeenCalledWith('thread-1');
		expect(JSON.stringify(runtime.agent.resume.mock.calls[0])).not.toContain('platform-user-1');
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				threadId: 'thread-1',
				userMessage: null,
				hitlStatus: 'resumed',
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
				record: expect.objectContaining({
					timeline: [
						expect.objectContaining({
							type: 'hitl-response',
							toolCallId: 'tc-1',
							response: { value: 'yes' },
						}),
					],
				}),
			}),
		);
	});

	it.each(['private', 'deleted'] as const)(
		'rejects a %s thread on the project checkpoint path',
		async (state) => {
			const { service, checkpointStorage, executionService, runtimeCacheService } = makeService();
			checkpointStorage.getStatus.mockResolvedValue({
				status: 'active',
				checkpoint: {
					persistence: { threadId: 'thread-1', resourceId: 'task:task-1' },
				},
			} as never);
			executionService.findThreadById.mockResolvedValue(
				state === 'deleted'
					? null
					: mock<AgentExecutionThread>({
							projectId,
							agentId,
							accessScope: 'user',
							ownerId: userId,
						}),
			);

			await expect(
				collect(
					service.resumeForChat({
						agentId,
						projectId,
						runId: 'run-1',
						toolCallId: 'tc-1',
						resumeData: { approved: true },
						usePublishedVersion: true,
						integrationType: 'task',
					}),
				),
			).rejects.toThrow('does not belong to this chat');
			expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
			expect(executionService.startExecutionRecording).not.toHaveBeenCalled();
		},
	);

	it.each([false, true])(
		'installs an interaction on the checkpoint memory only after a successful claim: %s',
		async (claimed) => {
			const { service, runtimeCacheService, checkpointStorage, integrationMessageContextService } =
				makeService();
			const previous: IntegrationMessageContext = {
				...selectedContext,
				interactingUserId: 'original-user',
				messageId: 'original-message',
				agentUserId: 'bot',
				subject: { type: 'issue', id: 'issue-1' },
			};
			const memory = { threadId: 'task-run-1', resourceId: 'task:task-1' };
			checkpointStorage.getStatus.mockResolvedValue({
				status: 'active',
				checkpoint: makeCheckpoint(
					{},
					{
						...memory,
						hostMetadata: encodeIntegrationMessageContext(previous),
					},
				),
			});
			const runtime = makeRuntime();
			runtimeCacheService.getRuntime.mockResolvedValue(runtime);
			runtime.agent.resume.mockImplementation(async (_method, _data, options: ResumeOptions) => {
				expect(integrationMessageContextService.setLatest).not.toHaveBeenCalled();
				expect(
					readIntegrationMessageContext({ ...memory, hostMetadata: options.hostMetadata }),
				).toEqual({
					...selectedContext,
					agentUserId: 'bot',
					subject: { type: 'issue', id: 'issue-1' },
				});
				if (!claimed) throw new Error('Already handled');
				await options.onResumeClaimed?.();
				return {
					runId: 'run-1',
					stream: makeReadableStream([{ type: 'finish', finishReason: 'stop' }]),
				};
			});
			const result = collect(
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { approved: true },
					messageContext: selectedContext,
					contextConversation: { threadId: 'platform-thread', resourceId: 'selected-user' },
				}),
			);
			if (claimed) {
				await result;
				expect(integrationMessageContextService.setLatest).toHaveBeenCalledWith(
					'task-run-1',
					'task:task-1',
					expect.objectContaining({
						interactingUserId: 'selected-user',
						subject: previous.subject,
					}),
				);
			} else {
				await expect(result).rejects.toThrow('Already handled');
				expect(integrationMessageContextService.setLatest).not.toHaveBeenCalled();
			}
			expect(integrationMessageContextService.getLatest).not.toHaveBeenCalled();
			expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledWith(runtime.agent);
		},
	);

	it('reconstructs a resumed runtime from the persisted sandbox scope', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService(true);
		const runtime = makeRuntime();
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: {
				persistence: {
					threadId: 'thread-1',
					resourceId: 'platform-user-1',
					hostMetadata: encodeAgentSandboxHostMetadata({
						projectId,
						principalHash: integrationPrincipalHash,
					}),
				},
			},
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith(
			expect.objectContaining({ sandboxPrincipalHash: integrationPrincipalHash }),
		);
	});

	it('rejects a draft resume when the checkpoint principal differs from the caller', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService(true);
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint(
				{},
				{
					threadId: 'thread-1',
					resourceId: 'draft-chat:user-1',
					hostMetadata: encodeAgentSandboxHostMetadata({
						projectId,
						principalHash: hashAgentSandboxPrincipal({
							type: 'n8n-user',
							userId: 'user-2',
						}),
					}),
				},
			),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(makeRuntime());

		await expect(
			collect(
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					user,
					usePublishedVersion: false,
					integrationType: N8N_CHAT_INTEGRATION_TYPE,
				}),
			),
		).rejects.toThrow('unavailable');
		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('rejects an old checkpoint without sandbox scope when workspaces are enabled', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService(true);
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);

		await expect(
			collect(
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					integrationType: 'slack',
				}),
			),
		).rejects.toThrow('unavailable');
		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('persists an aborted resumed stream as cancelled without discarding partial output', async () => {
		const { service, checkpointStorage, runtimeCacheService, executionService } = makeService();
		const abortController = new AbortController();
		const runtime = makeRuntime([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: 'partial resumed answer' },
			{ type: 'error', error: new Error('This operation was aborted') },
			{ type: 'finish', finishReason: 'error' },
		]);
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'resource-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		const stream = service.resumeForChat({
			agentId,
			projectId,
			runId: 'run-1',
			toolCallId: 'tc-1',
			resumeData: { value: 'yes' },
			abortSignal: abortController.signal,
			onExecutionRecorded: vi.fn(),
		});

		await stream.next();
		await stream.next();
		abortController.abort();
		await collect(stream);

		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				userMessage: null,
				hitlStatus: 'resumed',
				record: expect.objectContaining({
					assistantResponse: 'partial resumed answer',
					finishReason: 'cancelled',
					error: null,
					timeline: [
						expect.objectContaining({
							type: 'hitl-response',
							toolCallId: 'tc-1',
							response: { value: 'yes' },
						}),
						expect.objectContaining({ type: 'text', content: 'partial resumed answer' }),
					],
				}),
			}),
		);
	});

	it('atomically cancels only suspended checkpoints owned by the preview user', async () => {
		const { service, checkpointStorage } = makeService();
		const checkpoint = makeCheckpoint();
		checkpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint });
		checkpointStorage.cancelSuspended.mockResolvedValue(true);

		await expect(
			service.cancelChatRun({
				agentId,
				runId: 'run-1',
				resourceId: 'draft-chat:user-1',
			}),
		).resolves.toBe(true);
		expect(checkpointStorage.getStatus).toHaveBeenLastCalledWith('run-1', agentId);
		expect(checkpointStorage.cancelSuspended).toHaveBeenCalledWith('run-1', checkpoint, agentId);

		checkpointStorage.cancelSuspended.mockClear();
		await expect(
			service.cancelChatRun({
				agentId,
				runId: 'run-1',
				resourceId: 'draft-chat:another-user',
			}),
		).resolves.toBe(false);
		expect(checkpointStorage.cancelSuspended).not.toHaveBeenCalled();
	});

	it('does not resume a checkpoint outside the expected draft memory scope', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService();
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint(),
		});

		for (const expectedMemory of [
			{ threadId: 'another-thread', resourceId: 'draft-chat:user-1' },
			{ threadId: 'thread-1', resourceId: 'draft-chat:another-user' },
		]) {
			await expect(
				collect(
					service.resumeForChat({
						agentId,
						projectId,
						runId: 'run-1',
						toolCallId: 'tool-call-1',
						resumeData: { approved: true },
						expectedMemory,
					}),
				),
			).rejects.toThrow('Checkpoint run-1 does not belong to this chat');
		}

		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('does not directly cancel or resume a delegated child checkpoint', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService();
		const checkpoint = makeCheckpoint(
			{},
			{
				threadId: 'child-thread-1',
				resourceId: 'draft-chat:user-1',
				delegated: true,
			},
		);
		checkpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint });

		await expect(
			service.cancelChatRun({
				agentId,
				runId: 'child-run-1',
				resourceId: 'draft-chat:user-1',
			}),
		).resolves.toBe(false);
		expect(checkpointStorage.cancelSuspended).not.toHaveBeenCalled();
		expect(checkpointStorage.delete).not.toHaveBeenCalled();

		await expect(
			collect(
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'child-run-1',
					toolCallId: 'child-tool-call-1',
					resumeData: { approved: true },
				}),
			),
		).rejects.toThrow('Delegated actions must be resumed through their parent agent');
		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('expires configured and inline child checkpoints when cancelling a suspended parent', async () => {
		const { service, checkpointStorage } = makeService();
		const checkpoint = makeCheckpoint({
			configured: delegatedPending('configured', {
				runId: 'configured-child-run',
				toolCallId: 'configured-child-call',
				taskPath: '/root/configured_0',
				subAgentId: 'configured-agent',
				childCount: 0,
				threadId: 'configured-child-thread',
				resumeContext: {
					agentId: 'configured-agent',
				},
			}),
			inline: delegatedPending('inline', {
				runId: 'inline-child-run',
				toolCallId: 'inline-child-call',
				taskPath: '/root/inline_1',
				subAgentId: 'inline',
				childCount: 1,
				resumeContext: {
					agentId,
				},
			}),
		});
		checkpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint });
		checkpointStorage.cancelSuspended.mockResolvedValue(true);

		await expect(
			service.cancelChatRun({
				agentId,
				runId: 'run-1',
				resourceId: 'draft-chat:user-1',
			}),
		).resolves.toBe(true);

		expect(checkpointStorage.delete).toHaveBeenCalledTimes(3);
		expect(checkpointStorage.delete).toHaveBeenCalledWith(
			'configured-child-run',
			'configured-agent',
		);
		expect(checkpointStorage.delete).toHaveBeenCalledWith('inline-child-run', agentId);
		expect(checkpointStorage.delete).toHaveBeenCalledWith('run-1', agentId);
	});

	it('retries child cleanup from retained parent checkpoint references', async () => {
		const { service, checkpointStorage } = makeService();
		const checkpoint = makeCheckpoint({
			delegated: delegatedPending('delegated', {
				runId: 'child-run-1',
				toolCallId: 'child-tool-call-1',
				taskPath: '/root/inline_0',
				subAgentId: 'inline',
				childCount: 0,
			}),
		});
		checkpointStorage.getStatus
			.mockResolvedValueOnce({ status: 'active', checkpoint })
			.mockResolvedValueOnce({ status: 'expired', checkpoint });
		checkpointStorage.cancelSuspended.mockResolvedValue(true);
		checkpointStorage.delete
			.mockRejectedValueOnce(new Error('child checkpoint unavailable'))
			.mockResolvedValue(undefined);

		const request = {
			agentId,
			runId: 'run-1',
			resourceId: 'draft-chat:user-1',
		};
		await expect(service.cancelChatRun(request)).rejects.toThrow('child checkpoint unavailable');
		await expect(service.cancelChatRun(request)).resolves.toBe(true);

		expect(checkpointStorage.cancelSuspended).toHaveBeenCalledOnce();
		expect(checkpointStorage.delete).toHaveBeenNthCalledWith(1, 'child-run-1', agentId);
		expect(checkpointStorage.delete).toHaveBeenNthCalledWith(2, 'child-run-1', agentId);
		expect(checkpointStorage.delete).toHaveBeenNthCalledWith(3, 'run-1', agentId);
	});

	it('passes tracing telemetry returned by AgentRunTracingService into stream() and resume()', async () => {
		const { service, checkpointStorage, runtimeCacheService, agentRunTracingService } =
			makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		const fakeTelemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
		};
		agentRunTracingService.build.mockResolvedValue(fakeTelemetry as never);

		await collect(
			service.streamChatResponse({
				access: { accessScope: 'user', ownerId: userId },
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				mcpServerAttributions: runtime.mcpServerAttributions,
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({ telemetry: fakeTelemetry }),
		);

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
		);
		expect(runtime.agent.resume).toHaveBeenCalledWith(
			'stream',
			{ value: 'yes' },
			expect.objectContaining({ telemetry: fakeTelemetry }),
		);
	});

	it('recovers the original run source from the latest suspended execution when resuming', async () => {
		const {
			service,
			checkpointStorage,
			runtimeCacheService,
			executionService,
			agentRunTracingService,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		executionService.findLatestSuspendedRun.mockResolvedValueOnce({ source: 'telegram' } as never);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'telegram',
			}),
		);

		expect(executionService.findLatestSuspendedRun).toHaveBeenCalledWith('thread-1');
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'telegram' }),
		);
		expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'telegram' }),
			expect.any(Date),
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({ source: 'telegram' }),
		);
	});

	it('falls back to source "unknown" when no suspended execution is found on resume', async () => {
		const {
			service,
			checkpointStorage,
			runtimeCacheService,
			executionService,
			agentRunTracingService,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		executionService.findLatestSuspendedRun.mockResolvedValueOnce(null);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
		);

		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'unknown' }),
		);
	});

	it('skips the suspended-run lookup on resume when tracing is disabled', async () => {
		const {
			service,
			checkpointStorage,
			runtimeCacheService,
			executionService,
			agentRunTracingService,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		Object.defineProperty(agentRunTracingService, 'enabled', { value: false });
		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
		);

		expect(executionService.findLatestSuspendedRun).not.toHaveBeenCalled();
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'unknown' }),
		);
	});

	it('records resumed chat executions as suspended when they suspend again', async () => {
		const { service, checkpointStorage, runtimeCacheService, executionService, wakeService } =
			makeService();
		const runtime = makeRuntime([
			{
				type: 'tool-call-suspended',
				toolCallId: 'tc-2',
				toolName: 'ask_questions',
				runId: 'run-2',
			},
		]);

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
		);

		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({ threadId: 'thread-1', userMessage: null, hitlStatus: 'suspended' }),
		);
		expect(wakeService.onParentTurnFinished).not.toHaveBeenCalled();
		expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledExactlyOnceWith(runtime.agent);
	});
});
