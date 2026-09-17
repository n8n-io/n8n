import { AgentEvent } from '../../types/runtime/event';
import type { AgentEventData, AgentEventHandler } from '../../types/runtime/event';

export interface AgentAbortScope {
	readonly signal: AbortSignal;
	readonly isAborted: boolean;
	abort(): void;
	dispose(): void;
	/**
	 * Stop the in-flight step without ending the run: the provider request is
	 * cancelled, tool calls that have not started are settled as skipped, and the
	 * loop reaches the next step boundary instead of throwing. Unlike `abort()`,
	 * `isAborted` stays false, so callers that translate an abort into a terminal
	 * run status do not treat an interrupt as a cancellation.
	 */
	interrupt(): void;
	/** True from `interrupt()` until the loop consumes it at the step boundary. */
	readonly isInterrupted: boolean;
	/** One-shot per interrupt: true only for the step that the interrupt stopped. */
	consumeInterrupt(): boolean;
}

class EventBusAbortScope implements AgentAbortScope {
	private readonly controller = new AbortController();

	/** Controller for the in-flight step only; `interrupt()` replaces it. */
	private stepController = new AbortController();

	/**
	 * What dependents get: the run signal plus the in-flight step's signal, so an
	 * interrupt cancels a request or a tool call exactly as a run abort does. The
	 * loop tells the two apart from `isInterrupted`, not from the signal.
	 */
	private stepSignal: AbortSignal = this.mergeStepSignal();

	private interruptPending = false;

	private externalCleanup?: () => void;

	private disposed = false;

	constructor(
		externalSignal: AbortSignal | undefined,
		interruptSignal: AbortSignal | undefined,
		private readonly onDispose: (scope: EventBusAbortScope) => void,
	) {
		const listeners: Array<() => void> = [];

		if (externalSignal) {
			const onAbort = () => {
				this.controller.abort(externalSignal.reason);
				this.stepController.abort(externalSignal.reason);
			};
			if (externalSignal.aborted) onAbort();
			else externalSignal.addEventListener('abort', onAbort, { once: true });
			listeners.push(() => externalSignal.removeEventListener('abort', onAbort));
		}

		if (interruptSignal) {
			const onInterrupt = () => this.interrupt();
			// An interrupt fired before the run registered its scope still counts:
			// the host asked to stop, and the boundary is the first place the loop
			// can honour it.
			if (interruptSignal.aborted) onInterrupt();
			else interruptSignal.addEventListener('abort', onInterrupt, { once: true });
			listeners.push(() => interruptSignal.removeEventListener('abort', onInterrupt));
		}

		this.externalCleanup = () => {
			for (const remove of listeners) remove();
		};
	}

	get signal(): AbortSignal {
		return this.stepSignal;
	}

	get isAborted(): boolean {
		return this.controller.signal.aborted;
	}

	abort(): void {
		this.controller.abort();
		this.stepController.abort();
	}

	interrupt(): void {
		if (this.disposed) return;
		this.interruptPending = true;
		this.stepController.abort();
	}

	/** One signal that fires on either a step interrupt or a run abort. */
	private mergeStepSignal(): AbortSignal {
		return AbortSignal.any([this.controller.signal, this.stepController.signal]);
	}

	get isInterrupted(): boolean {
		return this.interruptPending;
	}

	consumeInterrupt(): boolean {
		if (!this.interruptPending) return false;
		this.interruptPending = false;
		// The interrupted step is over. Arm a fresh controller so the next step runs
		// normally and a later interrupt stops that one instead.
		this.stepController = new AbortController();
		this.stepSignal = this.mergeStepSignal();
		return true;
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

	/**
	 * Stop the in-flight step of the current run without ending it. See
	 * `AgentAbortScope.interrupt`.
	 */
	interrupt(): void {
		for (const scope of this.abortScopes) {
			scope.interrupt();
		}
	}

	createAbortScope(signals?: {
		externalSignal?: AbortSignal;
		interruptSignal?: AbortSignal;
	}): AgentAbortScope {
		const scope = new EventBusAbortScope(
			signals?.externalSignal,
			signals?.interruptSignal,
			(disposed) => {
				this.abortScopes.delete(disposed);
			},
		);
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
