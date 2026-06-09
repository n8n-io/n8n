import {
	createSavePartialResponseAbortReason,
	type Agent as RuntimeAgent,
	type AgentExecutionCounter,
	type StreamChunk,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { AgentExecutionService } from './agent-execution.service';
import { ExecutionRecorder } from './execution-recorder';
import type { ToolRegistry } from './tool-registry';
import { streamAgentChunks } from './utils/agent-stream';

import { Publisher } from '@/scaling/pubsub/publisher.service';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { TtlMap } from '@/utils/ttl-map';

export type CachedAgentRuntime = {
	agent: RuntimeAgent;
	agentId: string;
	toolRegistry: ToolRegistry;
	projectId: string;
};

type ActiveAgentStream = {
	controller: AbortController;
	pendingSteerMessage?: string;
};

export type AgentStreamControl = {
	readonly signal: AbortSignal;
	wasAborted: () => boolean;
	takePendingSteerMessage: () => string | undefined;
	cleanup: () => void;
};

export type AgentStreamMemoryScope = {
	threadId: string;
	resourceId: string;
};

export type AgentStreamResponseConfig = {
	agentInstance: RuntimeAgent;
	toolRegistry: ToolRegistry;
	agentId: string;
	userId?: string;
	message: string;
	memory: AgentStreamMemoryScope;
	projectId: string;
	streamKey?: string;
	source?: string;
	taskId?: string;
	taskVersionId?: string;
	executionCounter: AgentExecutionCounter;
};

export type ResumeStreamResponseConfig = {
	agentInstance: RuntimeAgent;
	toolRegistry: ToolRegistry;
	agentId: string;
	projectId: string;
	runId: string;
	toolCallId: string;
	resumeData: unknown;
	memory: AgentStreamMemoryScope;
	streamKey?: string;
	executionCounter: AgentExecutionCounter;
};

type InitialMessageTurnConfig = {
	message: string;
	initialTurn?: never;
};

type InitialStreamTurnConfig = {
	initialTurn: (control: AgentStreamControl | undefined) => AsyncIterable<StreamChunk>;
	message?: never;
};

export type SteerableTurnsConfig = (InitialMessageTurnConfig | InitialStreamTurnConfig) & {
	streamKey?: string;
	streamTurn: (
		message: string,
		control: AgentStreamControl | undefined,
	) => AsyncIterable<StreamChunk>;
};

export type RuntimeCacheKeyParams = {
	agentId: string;
	n8nUserId?: string;
	integrationType?: string;
	usePublishedVersion?: boolean;
};
export type BuilderRuntimeCacheKeyParams = {
	projectId: string;
	agentId: string;
	userId: string;
};

export function agentRuntimeCacheKey(params: RuntimeCacheKeyParams): string {
	const parts = ['agent', params.agentId];
	if (params.usePublishedVersion) {
		parts.push('published');
		if (params.integrationType) parts.push(params.integrationType);
		return parts.join(':');
	}
	parts.push('draft');
	if (params.n8nUserId) parts.push(params.n8nUserId);
	return parts.join(':');
}

export function builderRuntimeCacheKey(params: BuilderRuntimeCacheKeyParams): string {
	const { projectId, agentId, userId } = params;
	const parts = ['builder', agentId, projectId, userId];
	return parts.join(':');
}

export function testChatAgentStreamKey(
	projectId: string,
	agentId: string,
	userId: string,
	threadId: string,
): string {
	return `chat:${projectId}:${agentId}:${userId}:${threadId}`;
}

export function integrationAgentStreamKey(
	projectId: string,
	agentId: string,
	integrationType: string | undefined,
	threadId: string,
): string {
	return `integration:${projectId}:${agentId}:${integrationType ?? 'unknown'}:${threadId}`;
}

function* getMaxIterationsChunks(): Generator<StreamChunk> {
	const id = crypto.randomUUID();
	yield { type: 'text-start', id };
	yield {
		type: 'text-delta',
		id,
		delta: 'The agent has reached the maximum number of iterations and has stopped.',
	};
	yield { type: 'text-end', id };
}

async function* processAgentStream(
	stream: ReadableStream<StreamChunk>,
	recorder: ExecutionRecorder,
	control: AgentStreamControl | undefined,
	onChunk?: (value: StreamChunk) => void,
): AsyncGenerator<StreamChunk> {
	for await (const value of streamAgentChunks(stream)) {
		if (control?.wasAborted()) return;
		recorder.record(value);
		onChunk?.(value);
		if (value.type === 'finish' && value.finishReason === 'max-iterations') {
			yield* getMaxIterationsChunks();
		}
		yield value;
	}
}

@Service()
export class AgentsRuntimeService {
	private readonly runtimes = new TtlMap<string, CachedAgentRuntime>(
		30 * Time.minutes.toMilliseconds,
	);

	private readonly activeStreams = new Map<string, ActiveAgentStream>();

	constructor(
		private readonly logger: Logger,
		private readonly publisher: Publisher,
		private readonly globalConfig: GlobalConfig,
		private readonly agentExecutionService: AgentExecutionService,
	) {}

	async getOrCreateRuntime(
		cacheKey: string,
		factory: () => Promise<CachedAgentRuntime>,
	): Promise<CachedAgentRuntime> {
		const cached = this.runtimes.get(cacheKey);
		if (cached) return cached;

		const runtime = await factory();
		this.runtimes.set(cacheKey, runtime);
		const cachedRuntime = this.runtimes.get(cacheKey);
		if (!cachedRuntime) throw new Error(`Agent ${runtime.agentId} failed to reconstruct`);
		return cachedRuntime;
	}

	clearRuntimes(agentId: string, options: { skipBroadcast?: boolean } = {}): void {
		for (const key of this.runtimes.keys()) {
			// clear only built agents, don't clear builder runtimes
			if (key === agentId || key.startsWith(`agent:${agentId}:`)) {
				const entry = this.runtimes.get(key);
				this.runtimes.delete(key);
				if (entry) this.closeAgentResources(entry.agent, agentId);
			}
		}

		if (options.skipBroadcast) return;
		if (!this.globalConfig.multiMainSetup.enabled) return;

		void this.publisher
			.publishCommand({
				command: 'agent-config-changed',
				payload: { agentId },
			})
			.catch((error) => {
				this.logger.warn(
					`[AgentsRuntimeService] Failed to publish agent-config-changed for ${agentId}`,
					{
						error: error instanceof Error ? error.message : String(error),
					},
				);
			});
	}

	@OnPubSubEvent('agent-config-changed', { instanceType: 'main' })
	handleAgentConfigChanged(payload: PubSubCommandMap['agent-config-changed']): void {
		this.clearRuntimes(payload.agentId, { skipBroadcast: true });
	}

	createAgentStreamControl(streamKey: string): AgentStreamControl {
		const stream: ActiveAgentStream = { controller: new AbortController() };
		this.activeStreams.set(streamKey, stream);

		return {
			signal: stream.controller.signal,
			wasAborted: () => stream.controller.signal.aborted,
			takePendingSteerMessage: () => {
				const { pendingSteerMessage } = stream;
				stream.pendingSteerMessage = undefined;
				return pendingSteerMessage;
			},
			cleanup: () => {
				if (this.activeStreams.get(streamKey) === stream) {
					this.activeStreams.delete(streamKey);
				}
			},
		};
	}

	/**
	 * Aborts the local agent stream and publishes a command to abort the stream in multi-main mode.
	 * @param streamKey - The key of the agent stream to abort.
	 * @param steerMessage - The optional message to steer the agent with.
	 * @returns True if **local** agent stream was aborted, false otherwise.
	 */
	requestAgentStreamAbort(streamKey: string, steerMessage?: string): boolean {
		const aborted = this.abortLocalAgentStream(streamKey, steerMessage);
		this.publishAgentStreamAbort(streamKey, steerMessage);
		return aborted;
	}

	private publishAgentStreamAbort(streamKey: string, steerMessage?: string): void {
		if (!this.globalConfig.multiMainSetup.enabled) return;

		void this.publisher
			.publishCommand({
				command: 'agent-stream-abort',
				payload: { streamKey, ...(steerMessage !== undefined ? { steerMessage } : {}) },
			})
			.catch((error) => {
				this.logger.warn(
					`[AgentsRuntimeService] Failed to publish agent-stream-abort for ${streamKey}`,
					{
						error: error instanceof Error ? error.message : String(error),
					},
				);
			});
	}

	@OnPubSubEvent('agent-stream-abort', { instanceType: 'main' })
	handleAgentStreamAbort(payload: PubSubCommandMap['agent-stream-abort']): void {
		this.abortLocalAgentStream(payload.streamKey, payload.steerMessage);
	}

	async *streamSteerableTurns(config: SteerableTurnsConfig): AsyncGenerator<StreamChunk> {
		let isInitialTurn = true;
		let nextMessage: string | undefined;

		while (isInitialTurn || nextMessage !== undefined) {
			const control = config.streamKey
				? this.createAgentStreamControl(config.streamKey)
				: undefined;

			try {
				if (isInitialTurn) {
					isInitialTurn = false;
					if (config.initialTurn) {
						yield* config.initialTurn(control);
					} else {
						yield* config.streamTurn(config.message, control);
					}
				} else {
					const turnMessage = nextMessage;
					nextMessage = undefined;
					if (turnMessage !== undefined) {
						yield* config.streamTurn(turnMessage, control);
					}
				}
			} finally {
				control?.cleanup();
			}

			if (control?.wasAborted()) {
				const steerMessage = control.takePendingSteerMessage();
				if (steerMessage !== undefined) {
					nextMessage = steerMessage;
				}
			}
		}
	}

	async *streamAgentResponse(config: AgentStreamResponseConfig): AsyncGenerator<StreamChunk> {
		const {
			agentInstance,
			toolRegistry,
			agentId,
			message,
			memory,
			projectId,
			streamKey,
			source,
			taskId,
			taskVersionId,
			executionCounter,
		} = config;
		const { threadId, resourceId } = memory;
		const { logger, agentExecutionService } = this;

		yield* this.streamSteerableTurns({
			message,
			streamKey,
			async *streamTurn(turnMessage: string, control: AgentStreamControl | undefined) {
				const recorder = new ExecutionRecorder(toolRegistry);
				const resultStream = await agentInstance.stream(turnMessage, {
					persistence: { threadId, resourceId },
					executionCounter,
					abortSignal: control?.signal,
				});

				yield* processAgentStream(resultStream.stream, recorder, control, (value) => {
					if (value.type === 'tool-call-suspended') {
						logger.info('Chat: tool-call-suspended chunk received', {
							agentId,
							toolCallId: value.toolCallId,
							toolName: value.toolName,
						});
					}
				});

				if (control?.wasAborted()) return;

				void agentExecutionService
					.recordMessage({
						threadId,
						agentId,
						agentName: agentInstance.name,
						projectId,
						userMessage: turnMessage,
						record: recorder.getMessageRecord(),
						hitlStatus: recorder.suspended ? 'suspended' : undefined,
						source,
						taskId,
						taskVersionId,
					})
					.catch((error) => {
						logger.warn('Failed to record agent execution', {
							agentId,
							threadId,
							error: error instanceof Error ? error.message : String(error),
						});
					});
			},
		});
	}

	/**
	 * Resume a suspended agent tool call and yield the resulting stream chunks.
	 *
	 * Mirrors `streamAgentResponse` but starts with a `resume()` initial turn
	 * instead of a `stream()` call. After the initial resume completes, any
	 * mid-stream steer that aborts the SSE connection kicks off a fresh
	 * `streamTurn` — identical to the steer behaviour in `streamAgentResponse`.
	 *
	 * Execution is recorded for both the initial resumed turn (`hitlStatus:
	 * 'resumed'`) and any subsequent steer turns.
	 */
	async *streamResumeResponse(config: ResumeStreamResponseConfig): AsyncGenerator<StreamChunk> {
		const {
			agentInstance,
			toolRegistry,
			agentId,
			runId,
			toolCallId,
			resumeData,
			memory,
			projectId,
			streamKey,
			executionCounter,
		} = config;
		const { threadId, resourceId } = memory;
		const { logger, agentExecutionService } = this;

		const streamAndRecordTurn = async function* ({
			stream,
			control,
			userMessage,
			hitlStatus,
			warningMessage,
		}: {
			stream: ReadableStream<StreamChunk>;
			control: AgentStreamControl | undefined;
			userMessage: string;
			hitlStatus?: (recorder: ExecutionRecorder) => 'resumed' | 'suspended' | undefined;
			warningMessage: string;
		}): AsyncGenerator<StreamChunk> {
			const recorder = new ExecutionRecorder(toolRegistry);
			yield* processAgentStream(stream, recorder, control);

			if (control?.wasAborted()) return;

			void agentExecutionService
				.recordMessage({
					threadId,
					agentId,
					agentName: agentInstance.name,
					projectId,
					userMessage,
					record: recorder.getMessageRecord(),
					hitlStatus: typeof hitlStatus === 'function' ? hitlStatus(recorder) : hitlStatus,
				})
				.catch((error) => {
					logger.warn(warningMessage, {
						agentId,
						threadId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
		};

		yield* this.streamSteerableTurns({
			streamKey,
			async *initialTurn(control) {
				const resultStream = await agentInstance.resume('stream', resumeData, {
					runId,
					toolCallId,
					executionCounter,
					abortSignal: control?.signal,
				});

				yield* streamAndRecordTurn({
					stream: resultStream.stream,
					control,
					userMessage: '',
					hitlStatus: () => 'resumed',
					warningMessage: 'Failed to record resumed agent execution',
				});
			},
			async *streamTurn(turnMessage, control) {
				const resultStream = await agentInstance.stream(turnMessage, {
					persistence: { threadId, resourceId },
					executionCounter,
					abortSignal: control?.signal,
				});

				yield* streamAndRecordTurn({
					stream: resultStream.stream,
					control,
					userMessage: turnMessage,
					hitlStatus: (recorder) => (recorder.suspended ? 'suspended' : undefined),
					warningMessage: 'Failed to record agent execution after steer',
				});
			},
		});
	}

	private abortLocalAgentStream(streamKey: string, steerMessage?: string): boolean {
		const stream = this.activeStreams.get(streamKey);
		if (!stream) return false;
		if (steerMessage !== undefined) stream.pendingSteerMessage = steerMessage;
		stream.controller.abort(
			steerMessage !== undefined ? createSavePartialResponseAbortReason() : undefined,
		);
		return true;
	}

	private closeAgentResources(agent: { close(): Promise<void> }, agentId: string): void {
		agent.close().catch((error) => {
			this.logger.warn('[AgentsRuntimeService] Failed to close agent resources on eviction', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}
}
