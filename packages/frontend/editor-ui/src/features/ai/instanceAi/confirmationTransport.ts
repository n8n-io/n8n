import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import { hasInjectionContext, inject, type InjectionKey } from 'vue';

import { useOptionalThread, type ThreadRuntime } from './instanceAi.store';

/**
 * Sends an Assistant confirm body through the caller. The Assistant agent chat
 * passes one that resumes the suspended tool call with the body.
 */
export type ConfirmationSubmit = (body: InstanceAiConfirmRequest) => void;

export type ConfirmationResolution = 'approved' | 'denied' | 'deferred';

export interface ConfirmationTransport {
	/** The current Assistant thread, or `undefined` in the Assistant agent chat. */
	thread: ThreadRuntime | undefined;
	/**
	 * Sends the body. On the thread path, it marks the card resolved, and resolves
	 * to `false` when the request failed, so the card can let the user try again.
	 * With `submit`, it always resolves to `true`: the caller owns the answer, and
	 * gives the card back when it does not take it.
	 */
	confirm: (
		requestId: string,
		body: InstanceAiConfirmRequest,
		resolution: ConfirmationResolution,
	) => Promise<boolean>;
}

/**
 * How a confirmation card sends its answer. With a `submit` callback, the card
 * hands the body to its caller. Without one, it confirms through the current
 * Assistant thread and resolves the confirmation there.
 */
export function useConfirmationTransport(
	submit: () => ConfirmationSubmit | undefined,
): ConfirmationTransport {
	const thread = useOptionalThread();
	return {
		thread,
		confirm: async (requestId, body, resolution) => {
			const send = submit();
			if (send) {
				send(body);
				return true;
			}
			if (!thread) return false;
			const success = await thread.confirmAction(requestId, body);
			if (success) thread.resolveConfirmation(requestId, resolution);
			return success;
		},
	};
}

/**
 * The id of a thread that has no thread runtime, such as an Assistant agent
 * thread. The card telemetry reports it.
 */
export const CONFIRMATION_THREAD_ID: InjectionKey<string> = Symbol('confirmationThreadId');

/**
 * The thread id for card telemetry: the current Assistant thread, or the thread
 * that the host provides. Outside a component setup, only the thread counts.
 */
export function useConfirmationThreadId(thread: ThreadRuntime | undefined): () => string {
	const providedThreadId = hasInjectionContext() ? inject(CONFIRMATION_THREAD_ID, '') : '';
	return () => thread?.id ?? providedThreadId;
}
