import type { Agent as RuntimeAgent, AgentExecutionCounter, StreamChunk } from '@n8n/agents';
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
	if (params.usePublishedVersion) {
		const parts = [params.agentId, 'published'];
		if (params.integrationType) parts.push(params.integrationType);
		return parts.join(':');
	}
	const parts = [params.agentId, 'draft'];
	if (params.n8nUserId) parts.push(params.n8nUserId);
	return parts.join(':');
}

export function builderRuntimeCacheKey(params: BuilderRuntimeCacheKeyParams): string {
	const { projectId, agentId, userId } = params;
	const parts = [agentId, 'builder', projectId, userId];
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

function getMaxIterationsChunks(): StreamChunk[] {
	const id = crypto.randomUUID();
	return [
		{ type: 'text-start', id },
		{
			type: 'text-delta',
			id,
			delta: 'The agent has reached the maximum number of iterations and has stopped.',
		},
		{ type: 'text-end', id },
	];
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
			if (key === agentId || key.startsWith(`${agentId}:`)) {
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

	requestAgentStreamSteer(streamKey: string, message: string): boolean {
		const aborted = this.abortLocalAgentStream(streamKey, message);
		this.publishAgentStreamAbort(streamKey, message);
		return aborted;
	}

	requestAgentStreamAbort(streamKey: string): boolean {
		const aborted = this.abortLocalAgentStream(streamKey);
		this.publishAgentStreamAbort(streamKey);
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
					// TODO: Persist partial assistant output on abort once the AI SDK exposes finalized
					// abortable stream output safely.
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

				for await (const value of streamAgentChunks(resultStream.stream)) {
					if (control?.wasAborted()) {
						return;
					}

					recorder.record(value);
					if (value.type === 'tool-call-suspended') {
						logger.info('Chat: tool-call-suspended chunk received', {
							agentId,
							toolCallId: value.toolCallId,
							toolName: value.toolName,
						});
					}
					if (value.type === 'finish' && value.finishReason === 'max-iterations') {
						for (const chunk of getMaxIterationsChunks()) {
							yield chunk;
						}
					}
					yield value;
				}

				if (control?.wasAborted()) {
					return;
				}

				const messageRecord = recorder.getMessageRecord();
				void agentExecutionService
					.recordMessage({
						threadId,
						agentId,
						agentName: agentInstance.name,
						projectId,
						userMessage: turnMessage,
						record: messageRecord,
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

	private abortLocalAgentStream(streamKey: string, steerMessage?: string): boolean {
		const stream = this.activeStreams.get(streamKey);
		if (!stream) return false;
		if (steerMessage !== undefined) stream.pendingSteerMessage = steerMessage;
		stream.controller.abort();
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
