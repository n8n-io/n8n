import type { InstanceAiResourceAttachment, InstanceAiHandoffContext } from '@n8n/api-types';
import {
	INSTANCE_AI_PREFILL_TYPE_FALLBACK,
	isMessageAuthorship,
	type InstanceAiMessageAuthorship,
} from './prefills';

/**
 * The opening message of a thread, stashed by the view or hand-off that created
 * the thread. The thread view sends it through the Agents chat when it mounts.
 */

const pendingFirstMessageKey = (threadId: string) => `n8n-instance-ai-first-message:${threadId}`;

export interface PendingFirstMessage {
	message: string;
	attachments?: InstanceAiResourceAttachment[];
	context?: InstanceAiHandoffContext;
	responseStartedAtEpochMs?: number;
	/**
	 * Required so a new hand-off cannot stash an opener that reports as
	 * user-typed. Optional on the read path only, for stashes a previous
	 * deploy wrote — see `consumePendingFirstMessage`.
	 */
	authorship: InstanceAiMessageAuthorship;
}

/**
 * Stash the opening message for a thread the current context can't send itself
 * (a new tab, a router guard). The destination thread view consumes it after
 * hydration + SSE connect (see consumePendingFirstMessage) and sends it there.
 */
export function stashPendingFirstMessage(threadId: string, payload: PendingFirstMessage): void {
	localStorage.setItem(pendingFirstMessageKey(threadId), JSON.stringify(payload));
}

/**
 * Consume the opening message a new-tab hand-off stashed here. A separate window
 * can't send it (the destination loads before the BE persists it), so it does.
 */
export function consumePendingFirstMessage(threadId: string): PendingFirstMessage | null {
	const raw = localStorage.getItem(pendingFirstMessageKey(threadId));
	if (!raw) return null;
	localStorage.removeItem(pendingFirstMessageKey(threadId));
	try {
		const parsed = JSON.parse(raw) as Partial<PendingFirstMessage>;
		if (typeof parsed?.message !== 'string') return null;
		return {
			...parsed,
			message: parsed.message,
			// A stash written before openers were typed still has to replay: dropping it
			// would lose a message the user sent from another tab across a deploy. Every
			// stash comes from a hand-off, so an absent authorship is a pre-fill of an
			// unrecoverable type -- reporting it as user-typed would be the exact
			// misclassification the type exists to prevent.
			authorship: isMessageAuthorship(parsed.authorship)
				? parsed.authorship
				: { kind: 'prefill', prefillType: INSTANCE_AI_PREFILL_TYPE_FALLBACK },
		};
	} catch {
		return null;
	}
}

// Files cannot go through localStorage, and a same-tab hand-off keeps the page,
// so the opener's files wait in memory for the thread view to send them.
const pendingFirstMessageFiles = new Map<string, File[]>();

export function stashPendingFirstMessageFiles(threadId: string, files: File[]): void {
	if (files.length > 0) pendingFirstMessageFiles.set(threadId, files);
}

export function consumePendingFirstMessageFiles(threadId: string): File[] {
	const files = pendingFirstMessageFiles.get(threadId) ?? [];
	pendingFirstMessageFiles.delete(threadId);
	return files;
}

export function clearPendingFirstMessage(threadId: string): void {
	localStorage.removeItem(pendingFirstMessageKey(threadId));
}
