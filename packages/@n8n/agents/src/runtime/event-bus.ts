import { AgentEvent } from '../types/event';
import type { AgentEventControls, AgentEventData, AgentEventHandler } from '../types/event';

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

	on(event: AgentEvent, handler: AgentEventHandler): void {
		let set = this.handlers.get(event);
		if (!set) {
			set = new Set();
			this.handlers.set(event, set);
		}
		set.add(handler);
	}

	emit(data: AgentEventData): void {
		const controls = this.makeControls();
		const set = this.handlers.get(data.type);
		if (!set) return;
		for (const handler of set) {
			handler(data, controls);
		}
	}

	abort(): void {
		this.controller.abort();
	}

	/**
	 * Replace the AbortController with a fresh one.
	 * Called at the start of each generate() / stream() so the agent
	 * can be reused after a previous cancellation.
	 */
	resetAbort(): void {
		this.controller = new AbortController();
	}

	/** The AbortSignal for the current run. Pass to generateText / streamText. */
	get signal(): AbortSignal {
		return this.controller.signal;
	}

	get isAborted(): boolean {
		return this.controller.signal.aborted;
	}

	private makeControls(): AgentEventControls {
		return {
			// eslint-disable-next-line @typescript-eslint/require-await
			abort: async () => {
				this.abort();
			},
			// eslint-disable-next-line @typescript-eslint/require-await
			pause: async () => {
				throw new Error('pause() is not yet supported in AgentEventControls');
			},
		};
	}
}

export { AgentEvent };
