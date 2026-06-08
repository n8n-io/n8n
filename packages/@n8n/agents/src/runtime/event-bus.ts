import { AgentEvent } from '../types/runtime/event';
import type { AgentEventData, AgentEventHandler } from '../types/runtime/event';

export interface AgentAbortScope {
	readonly signal: AbortSignal;
	readonly isAborted: boolean;
	abort(): void;
	dispose(): void;
}

class EventBusAbortScope implements AgentAbortScope {
	private readonly controller = new AbortController();

	private externalCleanup?: () => void;

	private disposed = false;

	constructor(
		externalSignal: AbortSignal | undefined,
		private readonly onDispose: (scope: EventBusAbortScope) => void,
	) {
		if (!externalSignal) return;

		if (externalSignal.aborted) {
			this.controller.abort(externalSignal.reason);
			return;
		}

		const onAbort = () => this.controller.abort(externalSignal.reason);
		externalSignal.addEventListener('abort', onAbort, { once: true });
		this.externalCleanup = () => externalSignal.removeEventListener('abort', onAbort);
	}

	get signal(): AbortSignal {
		return this.controller.signal;
	}

	get isAborted(): boolean {
		return this.controller.signal.aborted;
	}

	abort(): void {
		this.controller.abort();
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.externalCleanup?.();
		this.externalCleanup = undefined;
		this.onDispose(this);
	}
}

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
 * A new run-scoped controller is created for each run via `createAbortScope()`
 * so overlapping runs do not replace each other's cancellation signal.
 */
export class AgentEventBus {
	private handlers = new Map<AgentEvent, Set<AgentEventHandler>>();

	private controller = new AbortController();

	private externalCleanup?: () => void;

	private abortScopes = new Set<EventBusAbortScope>();

	on(event: AgentEvent, handler: AgentEventHandler): void {
		let set = this.handlers.get(event);
		if (!set) {
			set = new Set();
			this.handlers.set(event, set);
		}
		set.add(handler);
	}

	off(event: AgentEvent, handler: AgentEventHandler): void {
		this.handlers.get(event)?.delete(handler);
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
		for (const scope of this.abortScopes) {
			scope.abort();
		}
	}

	createAbortScope(externalSignal?: AbortSignal): AgentAbortScope {
		const scope = new EventBusAbortScope(externalSignal, (disposed) => {
			this.abortScopes.delete(disposed);
		});
		this.abortScopes.add(scope);
		return scope;
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
	 * Remove external AbortSignal listeners registered by resetAbort() or active
	 * run scopes so listeners do not accumulate when runs complete without aborting.
	 */
	dispose(): void {
		this.externalCleanup?.();
		this.externalCleanup = undefined;
		for (const scope of [...this.abortScopes]) {
			scope.dispose();
		}
		this.abortScopes.clear();
	}
}

export { AgentEvent };
