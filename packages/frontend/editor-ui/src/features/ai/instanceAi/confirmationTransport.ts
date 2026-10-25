import type { InstanceAiConfirmRequest } from '@n8n/api-types';

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
	 * Sends the body and marks the card resolved. Resolves to `false` when the
	 * request failed, so the card can let the user try again.
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
