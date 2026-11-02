import { isCancellation, type JSONObject } from '@n8n/agents';
import {
	ASSISTANT_TRACE_EVENT,
	type AssistantTracePayload,
	type InstanceAiEvent,
	type InstanceAiFileAttachment,
	type InstanceAiResourceAttachment,
	type InstanceAiThreadArtifactsContext,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	continueInstanceAiTraceContext,
	createInstanceAiTraceContext,
	emitBuilderMetric,
	orchestratorAgentId,
	parseSuspension,
	releaseTraceClient,
	type InstanceAiTraceContext,
	type ModelConfig,
	type ServiceProxyConfig,
	type SuspensionInfo,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';

import { N8N_VERSION, WORKFLOW_SDK_VERSION } from '@/constants';
import type {
	AgentExecutionStreamChunk,
	SteeredMessageEvent,
	SystemAgentResumeTurn,
	SystemAgentTurn,
	SystemAgentTurnOutcome,
} from '@/modules/agents/system-agents/system-agent.types';

import { InstanceAiBrowserSessionService } from '../browser/instance-ai-browser-session.service';
import {
	buildRunTraceMetadata,
	runTraceSignalOf,
	type RunTraceSignal,
} from '../run-trace-metadata';
import { buildResumeTraceInput } from '../tracing/resume-trace-input';
import {
	buildSuspensionTraceMetadata,
	buildSuspensionTraceOutputs,
} from '../tracing/suspension-trace';
import { buildAssistantTurnTraceInput } from '../turn-setup/assistant-turn-trace-input';

/** Checkpoint host metadata key that carries the trace of a turn to its resume. */
const ASSISTANT_TRACE_METADATA_KEY = 'assistantTrace';

/** The first chunks that the user sees: answer text, visible reasoning or a tool call. */
const RESPONSE_CHUNK_TYPES: ReadonlySet<string> = new Set([
	'text-delta',
	'reasoning-delta',
	'tool-input-start',
	// Some providers send a complete tool call without a `tool-input-start`.
	'tool-call',
]);

/** Tells Assistant agent traces apart from traces of the current Assistant runtime. */
const RUNTIME_TRACE_METADATA = { assistant_runtime: 'agents' };

/** The ids of a turn's trace that its resume links to. */
interface AssistantTraceAnchor {
	langsmithTraceId: string;
	rootRunId: string;
	actorRunId: string;
	otelTraceId?: string;
	actorSpanId?: string;
	/** The message group of the trace turn. A steering message gives the run a new one. */
	messageGroupId?: string;
}

/** Read a stored trace anchor. Returns `undefined` when the value is not one. */
function readAssistantTraceAnchor(value: unknown): AssistantTraceAnchor | undefined {
	if (!isRecord(value)) return undefined;
	const { langsmithTraceId, rootRunId, actorRunId, otelTraceId, actorSpanId, messageGroupId } =
		value;
	if (
		typeof langsmithTraceId !== 'string' ||
		typeof rootRunId !== 'string' ||
		typeof actorRunId !== 'string'
	) {
		return undefined;
	}
	return {
		langsmithTraceId,
		rootRunId,
		actorRunId,
		...(typeof otelTraceId === 'string' ? { otelTraceId } : {}),
		...(typeof actorSpanId === 'string' ? { actorSpanId } : {}),
		...(typeof messageGroupId === 'string' ? { messageGroupId } : {}),
	};
}

/** The `continued_from_*` metadata that links a resume beat to the beat it continues. */
function continuedFromMetadata(anchor: AssistantTraceAnchor | undefined): Record<string, string> {
	if (!anchor) return {};
	const traceId = anchor.otelTraceId ?? anchor.langsmithTraceId;
	return {
		continued_from_trace_id: traceId,
		continued_from_run_id: anchor.rootRunId,
		resumed_from_trace_id: traceId,
		...(anchor.actorSpanId ? { resumed_from_span_id: anchor.actorSpanId } : {}),
		resumed_from_activation_id: anchor.actorRunId,
	};
}

type TraceStatus = 'completed' | 'suspended' | 'error' | 'cancelled';

interface TraceFinishOptions {
	/** Why the turn stopped, for a turn that the host closes, such as at shutdown. */
	reason?: string;
	/**
	 * What closed the turn. Defaults to `orchestrator`, the end of the agent run.
	 * Set it only when the host closes the turn.
	 */
	completionSource?: string;
}

/** How the host closes the trace of a turn that still runs at shutdown. */
const SHUTDOWN_FINISH: TraceFinishOptions = {
	reason: 'service_shutdown',
	completionSource: 'service_cleanup',
};

function traceStatusOf(status: SystemAgentTurnOutcome['status']): TraceStatus {
	return status === 'errored' ? 'error' : status;
}

/**
 * The message of a resume that cancels the waiting tool call: the user typed
 * a message instead of answering the card.
 */
function steeringMessageOf(turn: SystemAgentResumeTurn): string | undefined {
	return isCancellation(turn.resumeData) ? turn.resumeData.message : undefined;
}

interface AssistantTraceScope {
	threadId: string;
	runId: string;
	messageGroupId: string;
	userId: string;
	proxyConfig?: ServiceProxyConfig;
}

/** What the trace of a turn records besides the turn itself. */
export interface AssistantTraceTurnSetup {
	runId: string;
	/** The chat message group of the turn. */
	messageGroupId: string;
	proxyConfig?: ServiceProxyConfig;
	fileAttachments: InstanceAiFileAttachment[];
	contextAttachments: InstanceAiResourceAttachment[];
	threadArtifacts?: InstanceAiThreadArtifactsContext;
}

/** The inputs of a trace root, and of the orchestrator span under it. */
interface AssistantTraceInputs {
	input: Record<string, unknown>;
	orchestratorInputs: Record<string, unknown>;
	metadata?: Record<string, unknown>;
}

/**
 * The LangSmith trace of one Assistant agent turn. It has the same shape as a
 * turn of the current Assistant runtime: a `turn` or `resume` root, an
 * `agent: orchestrator` child, and the agent's model and tool spans under it.
 * Tracing is best effort: a failure is logged and never stops the turn.
 */
export class AssistantTurnTrace {
	private readonly signals: RunTraceSignal[] = [];

	private sawText = false;

	private outputText = '';

	private suspension: SuspensionInfo | undefined;

	private finished = false;

	private firstResponseRecorded = false;

	private steeredMessageCount = 0;

	constructor(
		readonly context: InstanceAiTraceContext,
		private readonly runId: string,
		private readonly logger: Logger,
		/** The inputs of the `agent: orchestrator` span of a new turn. */
		private readonly orchestratorInputs: Record<string, unknown> = {},
		/** Called once, after the trace finished. */
		private readonly onFinished?: () => void,
	) {}

	/** The ids that the client and the feedback use to find the trace. */
	get payload(): AssistantTracePayload {
		const { rootRun } = this.context;
		return {
			...(rootRun.otelTraceId ? { traceId: rootRun.otelTraceId } : {}),
			langsmithTraceId: rootRun.traceId,
			langsmithRunId: rootRun.id,
		};
	}

	/** The checkpoint host metadata that links a resume of this turn to its trace. */
	hostMetadata(): JSONObject {
		return { [ASSISTANT_TRACE_METADATA_KEY]: this.anchor() };
	}

	/** The ids that a resume of this turn links to. */
	private anchor(): JSONObject {
		const { rootRun, actorRun } = this.context;
		const messageGroupId = rootRun.metadata?.message_group_id;
		return {
			langsmithTraceId: rootRun.traceId,
			rootRunId: rootRun.id,
			actorRunId: actorRun.id,
			...(rootRun.otelTraceId ? { otelTraceId: rootRun.otelTraceId } : {}),
			...(actorRun.otelSpanId ? { actorSpanId: actorRun.otelSpanId } : {}),
			...(typeof messageGroupId === 'string' ? { messageGroupId } : {}),
		};
	}

	/** Records the turn input build as a `prepare: prompt` child of the root. */
	async tracePromptBuild<T>(
		inputs: Record<string, unknown>,
		build: () => Promise<T>,
		outputsOf: (result: T) => Record<string, unknown>,
	): Promise<T> {
		const run = await this.context.startChildRun(this.context.messageRun, {
			name: 'prepare: prompt',
			canonicalName: 'instance-ai.prompt_build',
			tags: ['prompt'],
			metadata: { agent_role: 'prompt_build' },
			inputs,
		});
		let result: T;
		try {
			result = await build();
		} catch (error) {
			await this.context.failRun(run, error, { final_status: 'error' });
			throw error;
		}
		await this.context.finishRun(run, {
			outputs: outputsOf(result),
			metadata: { final_status: 'completed' },
		});
		return result;
	}

	/** Starts the `agent: orchestrator` child of a new turn. A resume already has one. */
	async startOrchestratorRun(): Promise<void> {
		const { context } = this;
		if (context.actorRun.id !== context.rootRun.id) return;
		const actorRun = await context.startChildRun(context.rootRun, {
			name: 'agent: orchestrator',
			canonicalName: 'instance-ai.agent.orchestrator',
			tags: ['orchestrator'],
			metadata: {
				agent_role: 'orchestrator',
				agent_id: orchestratorAgentId(this.runId),
				execution_mode: 'foreground',
				trace_kind: context.traceKind,
			},
			inputs: this.orchestratorInputs,
		});
		context.actorRun = actorRun;
		context.orchestratorRun = actorRun;
	}

	/** Runs the turn with the orchestrator span active, so its spans nest under it. */
	async withContext<T>(run: () => Promise<T>): Promise<T> {
		return await this.context.withActiveSpan(this.context.actorRun, run);
	}

	/** Collects what the user could see, the reply text and the suspension of the turn. */
	observeChunk(chunk: AgentExecutionStreamChunk): void {
		if (RESPONSE_CHUNK_TYPES.has(chunk.type)) this.recordFirstResponse();
		switch (chunk.type) {
			case 'text-delta':
				this.outputText += chunk.delta;
				// Only the first visible text decides the first visible state.
				if (!this.sawText && chunk.delta.trim().length > 0) {
					this.sawText = true;
					this.signals.push({ kind: 'text', text: chunk.delta });
				}
				break;
			case 'tool-call':
				this.signals.push({ kind: 'tool-call', toolName: chunk.toolName });
				break;
			case 'tool-call-suspended':
				this.suspension = parseSuspension(chunk) ?? undefined;
				this.signals.push({ kind: 'hitl', toolName: chunk.toolName });
				break;
			case 'message-steered':
				this.recordSteeredMessage(chunk);
				break;
			case 'subagent-started':
				this.signals.push({ kind: 'task-card' });
				break;
			default:
				break;
		}
	}

	/**
	 * Records a message that the user steered into the running turn. The runtime
	 * adds it to the input of the next model call, so it is part of this turn,
	 * not a new one.
	 */
	private recordSteeredMessage(event: SteeredMessageEvent): void {
		this.steeredMessageCount++;
		const { message } = event;
		const text = message.content
			.filter((part) => part.type === 'text' && part.text)
			.map((part) => part.text)
			.join('\n');
		const fileCount = message.content.filter((part) => part.type === 'file').length;
		const recorded = { message: text, ...(fileCount > 0 ? { fileCount } : {}) };
		const { context } = this;
		const record = async () => {
			const run = await context.startChildRun(context.actorRun, {
				name: 'user: steered message',
				canonicalName: 'instance-ai.steered_message',
				runType: 'chain',
				tags: ['steered-message'],
				metadata: { queue_id: event.queueId, message_id: message.id },
				inputs: recorded,
			});
			await context.finishRun(run, { outputs: recorded });
		};
		const recording = record().catch((error: unknown) => {
			this.logger.warn('Failed to trace a steered Assistant message', {
				runId: this.runId,
				error: getErrorMessage(error),
			});
		});
		// The turn can finish before the span exports, so keep the trace open for it.
		context.keepOpenUntilSettled?.(recording);
	}

	/**
	 * Records the `first_response` builder metric on the first chunk that the
	 * user sees, like the stream runner of the current Assistant runtime.
	 */
	private recordFirstResponse(): void {
		if (this.firstResponseRecorded) return;
		this.firstResponseRecorded = true;
		const phase = this.context.traceKind === 'orchestrator_resume' ? 'resume' : 'message';
		// Not awaited: the span must not delay the first chunk for the user.
		void emitBuilderMetric(this.context, 'first_response', { success: true, phase });
	}

	/** Collects the visible events that the Assistant tools publish, such as task cards. */
	observeEvent(event: InstanceAiEvent): void {
		const signal = runTraceSignalOf(event);
		if (signal) this.signals.push(signal);
	}

	/** Finishes the orchestrator and root spans with the outcome of the turn. Runs once. */
	async finish(
		outcome: Pick<SystemAgentTurnOutcome, 'status' | 'error'>,
		modelId?: ModelConfig,
		options: TraceFinishOptions = {},
	) {
		if (this.finished) return;
		this.finished = true;
		const { context, runId } = this;
		const status = traceStatusOf(outcome.status);
		const error =
			status === 'error'
				? outcome.error !== undefined
					? getErrorMessage(outcome.error)
					: 'Assistant turn failed'
				: undefined;
		const modelMetadata = modelId !== undefined ? { model_id: modelId } : {};

		let outputs: Record<string, unknown>;
		let actorMetadata: Record<string, unknown>;
		let rootMetadata: Record<string, unknown>;
		if (status === 'suspended') {
			outputs = buildSuspensionTraceOutputs(runId, this.suspension);
			actorMetadata = { final_status: status, ...buildSuspensionTraceMetadata(this.suspension) };
			rootMetadata = actorMetadata;
		} else {
			outputs = {
				status,
				runId,
				...(this.outputText ? { response: this.outputText } : {}),
				...(options.reason ? { reason: options.reason } : {}),
			};
			actorMetadata = { final_status: status, ...modelMetadata };
			const runMetadata = buildRunTraceMetadata(this.signals, {
				status: status === 'error' ? 'error' : status,
			});
			// The user did not cancel a turn that the host closes. The current runtime
			// also leaves out the cancellation type then.
			if (options.completionSource) delete runMetadata.cancellation_type;
			rootMetadata = {
				...actorMetadata,
				completion_source: options.completionSource ?? 'orchestrator',
				...runMetadata,
			};
		}
		if (this.steeredMessageCount > 0) {
			rootMetadata = { ...rootMetadata, steered_message_count: this.steeredMessageCount };
		}

		try {
			if (context.actorRun.id !== context.rootRun.id && context.actorRun.endTime === undefined) {
				await context.finishRun(context.actorRun, {
					outputs,
					metadata: actorMetadata,
					...(error ? { error } : {}),
				});
			}
			if (context.rootRun.endTime === undefined) {
				await context.finishRun(context.rootRun, {
					outputs,
					metadata: rootMetadata,
					...(error ? { error } : {}),
				});
			}
		} catch (finishError) {
			this.logger.warn('Failed to finish the Assistant agent turn trace', {
				runId,
				error: getErrorMessage(finishError),
			});
		} finally {
			releaseTraceClient(context.rootRun.traceId);
			this.onFinished?.();
		}
	}
}

/**
 * Creates the LangSmith traces of Assistant agent turns. Returns `undefined`
 * when tracing is off or the trace cannot be created, so the turn runs
 * without a trace.
 */
@Service()
export class AssistantTurnTracer {
	private readonly logger: Logger;

	/** Traces of turns that run in this process and have not finished yet. */
	private readonly openTraces = new Set<AssistantTurnTrace>();

	/** Set when shutdown starts. A turn that starts after it runs without a trace. */
	private closing = false;

	constructor(
		logger: Logger,
		private readonly browserSessionService: InstanceAiBrowserSessionService,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/**
	 * Starts the trace of a turn and sends its ids to the chat, so a debug
	 * export of the thread can link to it. A new turn and a message that the
	 * user types while a card waits start a `turn` root. A card answer
	 * continues the trace of the turn that it resumes.
	 */
	async startForTurn(
		turn: SystemAgentTurn,
		setup: AssistantTraceTurnSetup,
	): Promise<AssistantTurnTrace | undefined> {
		if (this.closing) return undefined;
		const anchor =
			turn.type === 'resume'
				? readAssistantTraceAnchor(turn.checkpointHostMetadata[ASSISTANT_TRACE_METADATA_KEY])
				: undefined;
		const scope: AssistantTraceScope = {
			threadId: turn.thread.id,
			runId: setup.runId,
			// A resume after a steering message continues the trace turn of that message.
			messageGroupId: anchor?.messageGroupId ?? setup.messageGroupId,
			userId: turn.user.id,
			...(setup.proxyConfig ? { proxyConfig: setup.proxyConfig } : {}),
		};
		const trace = await this.createForTurn(turn, scope, anchor, setup);
		if (!trace) return undefined;
		try {
			turn.emitHostEvent(ASSISTANT_TRACE_EVENT, trace.payload, { key: 'turn' });
		} catch (error) {
			this.logger.warn('Failed to send the Assistant trace ids to the chat', {
				threadId: turn.thread.id,
				error: getErrorMessage(error),
			});
		}
		return trace;
	}

	private async createForTurn(
		turn: SystemAgentTurn,
		scope: AssistantTraceScope,
		anchor: AssistantTraceAnchor | undefined,
		setup: AssistantTraceTurnSetup,
	): Promise<AssistantTurnTrace | undefined> {
		if (turn.type === 'start') {
			return await this.startTurn(scope, {
				input: buildAssistantTurnTraceInput({
					message: turn.message,
					fileAttachments: setup.fileAttachments,
					contextAttachments: setup.contextAttachments,
					threadArtifacts: setup.threadArtifacts,
					messageGroupId: scope.messageGroupId,
				}),
				orchestratorInputs: { message: turn.message },
			});
		}
		const steeringMessage = steeringMessageOf(turn);
		if (steeringMessage !== undefined) {
			// The current runtime starts a new run for a message that the user sends
			// while a card waits, so its trace shows a new turn. Do the same here,
			// with a message group of its own, although the runtime resumes the run.
			const messageGroupId = `mg_${nanoid()}`;
			return await this.startTurn(
				{ ...scope, messageGroupId },
				{
					input: buildAssistantTurnTraceInput({
						message: steeringMessage,
						fileAttachments: [],
						contextAttachments: [],
						messageGroupId,
					}),
					orchestratorInputs: { message: steeringMessage },
					metadata: { cancelled_tool_call_id: turn.toolCallId },
				},
			);
		}
		return await this.resumeTurn(scope, anchor, {
			input: { toolCallId: turn.toolCallId, ...buildResumeTraceInput(turn.resumeData) },
			orchestratorInputs: { toolCallId: turn.toolCallId },
			metadata: {
				pending_tool_call_id: turn.toolCallId,
				...(isRecord(turn.resumeData) && typeof turn.resumeData.approved === 'boolean'
					? { approved: turn.resumeData.approved }
					: {}),
			},
		});
	}

	/** The trace of a new turn: a `turn` root. */
	private async startTurn(
		scope: AssistantTraceScope,
		{ input, orchestratorInputs, metadata }: AssistantTraceInputs,
	): Promise<AssistantTurnTrace | undefined> {
		return await this.create(scope, orchestratorInputs, async () => {
			return await createInstanceAiTraceContext({
				...this.commonOptions(scope),
				input,
				metadata: { ...metadata, ...RUNTIME_TRACE_METADATA },
			});
		});
	}

	/**
	 * The trace of a resumed turn: a `resume: approval` root that links to the
	 * beat it continues and keeps the turn's message group.
	 */
	private async resumeTurn(
		scope: AssistantTraceScope,
		anchor: AssistantTraceAnchor | undefined,
		{ input, orchestratorInputs, metadata }: AssistantTraceInputs,
	): Promise<AssistantTurnTrace | undefined> {
		return await this.create(scope, orchestratorInputs, async () => {
			return await continueInstanceAiTraceContext(undefined, {
				...this.commonOptions(scope),
				input,
				metadata: {
					resume_reason: 'approval',
					agent_id: orchestratorAgentId(scope.runId),
					...continuedFromMetadata(anchor),
					...metadata,
					...RUNTIME_TRACE_METADATA,
				},
			});
		});
	}

	/**
	 * Closes the traces of the turns that still run, like the current runtime
	 * does at shutdown. The Agents runtime does not settle these turns before
	 * the process exits, so without this their roots stay open in LangSmith.
	 * Call it before the final flush of the trace providers.
	 */
	async finishOpenTraces(): Promise<void> {
		this.closing = true;
		for (const trace of [...this.openTraces]) {
			await trace.finish({ status: 'cancelled' }, undefined, SHUTDOWN_FINISH);
		}
	}

	private commonOptions(scope: AssistantTraceScope) {
		return {
			threadId: scope.threadId,
			messageId: nanoid(),
			messageGroupId: scope.messageGroupId,
			runId: scope.runId,
			userId: scope.userId,
			n8nVersion: N8N_VERSION,
			workflowSdkVersion: WORKFLOW_SDK_VERSION,
			// Read per turn: Chrome updates extensions silently.
			browserExtension: this.browserSessionService.getExtensionTraceContext(scope.userId),
			...(scope.proxyConfig ? { proxyConfig: scope.proxyConfig } : {}),
		};
	}

	private async create(
		scope: AssistantTraceScope,
		orchestratorInputs: Record<string, unknown>,
		createContext: () => Promise<InstanceAiTraceContext | undefined>,
	): Promise<AssistantTurnTrace | undefined> {
		try {
			const context = await createContext();
			if (!context) return undefined;
			const trace: AssistantTurnTrace = new AssistantTurnTrace(
				context,
				scope.runId,
				this.logger,
				orchestratorInputs,
				() => this.openTraces.delete(trace),
			);
			// Shutdown started while the trace was created, after the open traces were
			// closed. Close this one too, and run the turn without a trace.
			if (this.closing) {
				await trace.finish({ status: 'cancelled' }, undefined, SHUTDOWN_FINISH);
				return undefined;
			}
			this.openTraces.add(trace);
			return trace;
		} catch (error) {
			this.logger.warn('Failed to create the Assistant agent turn trace', {
				threadId: scope.threadId,
				runId: scope.runId,
				error: getErrorMessage(error),
			});
			return undefined;
		}
	}
}
