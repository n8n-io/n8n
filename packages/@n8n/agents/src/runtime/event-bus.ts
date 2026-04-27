import { AgentEvent } from '../types/runtime/event';
import type { AgentEventData, AgentEventHandler } from '../types/runtime/event';

/**
 * Internal event bus for agent lifecycle events.
 *
 * Shared between Agent (public API) and AgentRuntime (emitter).
 * Handlers registered via `on()` are called synchronously when
 * `emit()` is invoked from the agentic loop.
 *
 * Cancellation uses a standard `AbortController`. The signal is passed
 * directly to the AI SDK's `generateText` / `streamText` calls so that
 * in-flight HTTP requests are cancelled immediately when `abort()` is called,
 * rather than waiting for the current LLM call to finish.
 *
 * A new controller is created for each run via `resetAbort()` so the same
 * agent instance can be reused after cancellation.
 */
export class AgentEventBus {
	private handlers = new Map<AgentEvent, Set<AgentEventHandler>>();

	private controller = new AbortController();

	private externalCleanup?: () => void;

	on(event: AgentEvent, handler: AgentEventHandler): void {
		let set = this.handlers.get(event);
		if (!set) {
			set = new Set();
			this.handlers.set(event, set);
		}
		set.add(handler);
	}

	emit(data: AgentEventData): void {
		const set = this.handlers.get(data.type);
		if (!set) return;
		for (const handler of set) {
			handler(data);
		}
	}

	abort(): void {
		this.controller.abort();
	}

	/**
	 * Replace the AbortController with a fresh one.
	 * Called at the start of each generate() / stream() so the agent
	 * can be reused after a previous cancellation.
	 *
	 * When an external signal is provided, its abort is forwarded to the
	 * internal controller so that either `abort()` or the external signal
	 * can cancel the current run.
	 */
	resetAbort(externalSignal?: AbortSignal): void {
		this.externalCleanup?.();
		this.externalCleanup = undefined;
		this.controller = new AbortController();

		if (externalSignal) {
			if (externalSignal.aborted) {
				this.controller.abort(externalSignal.reason);
			} else {
				const onAbort = () => this.controller.abort(externalSignal.reason);
				externalSignal.addEventListener('abort', onAbort, { once: true });
				this.externalCleanup = () => externalSignal.removeEventListener('abort', onAbort);
			}
		}
	}

	/** The AbortSignal for the current run. Pass to generateText / streamText. */
	get signal(): AbortSignal {
		return this.controller.signal;
	}

	get isAborted(): boolean {
		return this.controller.signal.aborted;
	}

	/**
	 * Remove the external AbortSignal listener registered by resetAbort().
	 * Must be called when a per-run bus is retired so the listener does not
	 * accumulate on long-lived signals when runs complete without aborting.
	 */
	dispose(): void {
		this.externalCleanup?.();
		this.externalCleanup = undefined;
	}
}

export { AgentEvent };
