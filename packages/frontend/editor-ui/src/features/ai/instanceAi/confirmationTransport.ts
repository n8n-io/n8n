import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import { useOptionalThread, useThread, type ThreadRuntime } from './instanceAi.store';

/**
 * Sends an Assistant confirm body through the caller. The Agents chat passes
 * one that resumes the suspended tool call with the body as resume data.
 */
export type ConfirmationSubmit = (body: InstanceAiConfirmRequest) => void;

export type ConfirmationResolution = 'approved' | 'changes-requested' | 'denied' | 'deferred';

export interface ConfirmationTransport {
	/** Read-only thread helpers. Absent when the Agents chat renders outside a thread. */
	thread: ThreadRuntime | undefined;
	/** True when submissions go through the Agents chat resume. */
	isAgentsChat: boolean;
	/** Sends the body. Resolves to `false` when the request failed. */
	confirm: (requestId: string, body: InstanceAiConfirmRequest) => Promise<boolean>;
	/** Marks the request resolved in the legacy thread runtime. */
	resolve: (requestId: string, resolution: ConfirmationResolution) => void;
	isResolved: (requestId: string) => boolean;
}

/**
 * Picks the transport for an Assistant card. Without `submit` the card posts
 * to the legacy `/confirm` endpoint through the thread runtime. With `submit`
 * the card hands the body to the caller, and the Agents chat owns the
 * resolved state, so the legacy bookkeeping is skipped.
 */
export function useConfirmationTransport(submit?: ConfirmationSubmit): ConfirmationTransport {
	if (submit) {
		return {
			thread: useOptionalThread(),
			isAgentsChat: true,
			confirm: async (_requestId, body) => {
				submit(body);
				return await Promise.resolve(true);
			},
			resolve: () => {},
			isResolved: () => false,
		};
	}

	const thread = useThread();
	return {
		thread,
		isAgentsChat: false,
		confirm: async (requestId, body) => await thread.confirmAction(requestId, body),
		resolve: (requestId, resolution) => thread.resolveConfirmation(requestId, resolution),
		isResolved: (requestId) => thread.resolvedConfirmationIds.has(requestId),
	};
}
