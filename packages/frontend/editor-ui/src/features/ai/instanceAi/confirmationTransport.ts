import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import { useOptionalThread, type ThreadRuntime } from './instanceAi.store';

/**
 * Sends an Assistant confirm body through the caller. The Agents chat passes
 * one that resumes the suspended tool call with the body as resume data.
 */
export type ConfirmationSubmit = (body: InstanceAiConfirmRequest) => void;

export type ConfirmationResolution = 'approved' | 'changes-requested' | 'denied' | 'deferred';

export interface ConfirmationTransport {
	/** Read-only thread helpers. Absent when the Agents chat renders outside a thread. */
	thread: ThreadRuntime | undefined;
	/** Sends the body. Resolves to `false` when the request failed. */
	confirm: (requestId: string, body: InstanceAiConfirmRequest) => Promise<boolean>;
}

/**
 * The transport for an Assistant card: the card hands the body to the Agents
 * chat, which owns the resolved state.
 */
export function useConfirmationTransport(submit: ConfirmationSubmit): ConfirmationTransport {
	return {
		thread: useOptionalThread(),
		confirm: async (_requestId, body) => {
			submit(body);
			return await Promise.resolve(true);
		},
	};
}
