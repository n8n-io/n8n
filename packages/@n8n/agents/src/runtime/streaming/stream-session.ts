import { StreamWriterGuard } from './stream-writer-guard';
import type { StreamChunk } from '../../types';
import { AgentEvent } from '../../types/runtime/event';
import type { AgentEventData } from '../../types/runtime/event';
import type { ExecutionOptions, RunOptions, TokenUsage } from '../../types/sdk/agent';
import type { AgentAbortScope, AgentEventBus } from '../state/event-bus';

export interface StreamSessionDeps {
	eventBus: AgentEventBus;
	abortScope: AgentAbortScope;
	runId: string;
	options: (RunOptions & ExecutionOptions) | undefined;
	/** Wrap the loop in the telemetry root span (bound `RuntimeTelemetry.withRootSpan`). */
	withRootSpan: <T>(
		operation: 'generate' | 'stream',
		options: ExecutionOptions | undefined,
		runId: string,
		fn: () => Promise<T>,
	) => Promise<T>;
	/** Run the stream loop, writing chunks through the provided guard. */
	runLoop: (guard: StreamWriterGuard) => Promise<void>;
	flushTelemetry: (options: ExecutionOptions | undefined) => Promise<void>;
	cleanupRun: () => Promise<void>;
	updateState: (status: 'failed' | 'cancelled') => void;
	emitError: (error: unknown) => void;
	/**
	 * Usage + model to stamp on the terminal finish chunk of an aborted run, so a
	 * cancelled run still bills the tokens consumed before the stop.
	 */
	getAbortFinish?: () => { usage?: TokenUsage; model?: string };
}

/**
 * Owns the streaming run lifecycle: creates the `TransformStream`, bridges
 * event-bus lifecycle events to chunks, runs the loop inside the telemetry root
 * span, and guarantees a single shutdown (error/abort translation, listener
 * cleanup, abort-scope disposal). Returns the readable side immediately while
 * the loop runs in the background.
 */
export function startStreamSession(deps: StreamSessionDeps): ReadableStream<StreamChunk> {
	const { readable, writable } = new TransformStream<StreamChunk, StreamChunk>();
	const guard = new StreamWriterGuard(writable.getWriter());

	// Bridge tool-execution / sub-agent lifecycle events into the stream so
	// consumers can show mid-flight indicators. Writes go through the guard, so
	// they are safely dropped once the stream is closed.
	const onToolExecutionStart = (data: AgentEventData): void => {
		if (data.type !== AgentEvent.ToolExecutionStart) return;
		void guard.write({
			type: 'tool-execution-start',
			toolCallId: data.toolCallId,
			toolName: data.toolName,
			startTime: Date.now(),
		});
	};
	const onToolExecutionEnd = (data: AgentEventData): void => {
		if (data.type !== AgentEvent.ToolExecutionEnd) return;
		void guard.write({
			type: 'tool-execution-end',
			toolCallId: data.toolCallId,
			toolName: data.toolName,
			isError: data.isError,
			endTime: Date.now(),
		});
	};
	const onSubAgentStarted = (data: AgentEventData): void => {
		if (data.type !== AgentEvent.SubAgentStarted) return;
		const { type: _type, ...payload } = data;
		void guard.write({ type: 'subagent-started', ...payload });
	};
	const onSubAgentCompleted = (data: AgentEventData): void => {
		if (data.type !== AgentEvent.SubAgentCompleted) return;
		const { type: _type, ...payload } = data;
		void guard.write({ type: 'subagent-completed', ...payload });
	};

	deps.eventBus.on(AgentEvent.ToolExecutionStart, onToolExecutionStart);
	deps.eventBus.on(AgentEvent.ToolExecutionEnd, onToolExecutionEnd);
	deps.eventBus.on(AgentEvent.SubAgentStarted, onSubAgentStarted);
	deps.eventBus.on(AgentEvent.SubAgentCompleted, onSubAgentCompleted);

	deps
		.withRootSpan('stream', deps.options, deps.runId, async () => await deps.runLoop(guard))
		.catch(async (error: unknown) => {
			const isAbort = deps.abortScope.isAborted;
			deps.updateState(isAbort ? 'cancelled' : 'failed');
			if (!isAbort) {
				deps.emitError(error);
			}
			await deps.cleanupRun();
			await deps.flushTelemetry(deps.options);
			await guard.fail(
				isAbort ? new Error('Agent run was aborted') : error,
				'error',
				isAbort ? deps.getAbortFinish?.() : undefined,
			);
		})
		.finally(() => {
			deps.eventBus.off(AgentEvent.ToolExecutionStart, onToolExecutionStart);
			deps.eventBus.off(AgentEvent.ToolExecutionEnd, onToolExecutionEnd);
			deps.eventBus.off(AgentEvent.SubAgentStarted, onSubAgentStarted);
			deps.eventBus.off(AgentEvent.SubAgentCompleted, onSubAgentCompleted);
			void guard.close();
			deps.abortScope.dispose();
		});

	return readable;
}
