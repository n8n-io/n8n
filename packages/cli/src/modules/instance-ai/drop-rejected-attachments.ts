import type { Logger } from '@n8n/backend-common';
import type { AgentDbMessage } from '@n8n/instance-ai';

/**
 * Stands in for a removed attachment so the turn keeps a coherent shape: the
 * message never ends up with empty content, and the model can see that a file was
 * attached but is unavailable rather than silently losing the reference.
 */
export const ATTACHMENT_REMOVED_NOTE =
	'[An attached file was removed because it was too large to process.]';

function hasContentArray(
	message: AgentDbMessage,
): message is AgentDbMessage & { content: Array<{ type: string }> } {
	return 'content' in message && Array.isArray(message.content);
}

/**
 * Remove inline file parts from persisted messages, returning **only** the
 * messages that changed so the caller writes the minimum.
 *
 * Attachment bytes are stored inline in the message row (see INS-650), so a file
 * the provider refuses is replayed on every later turn and fails the thread
 * indefinitely. Dropping the part is what makes that recoverable. The SDK's
 * `stripHydratedFileData` can't help here: it only strips parts backed by a
 * `fileRef`, and instance-ai has no file store to reference.
 */
export function stripFileAttachmentParts(messages: AgentDbMessage[]): AgentDbMessage[] {
	const changed: AgentDbMessage[] = [];

	for (const message of messages) {
		if (!hasContentArray(message)) continue;

		const withoutFiles = message.content.filter((part) => part.type !== 'file');
		if (withoutFiles.length === message.content.length) continue;

		changed.push({
			...message,
			content: [...withoutFiles, { type: 'text', text: ATTACHMENT_REMOVED_NOTE }],
		} as AgentDbMessage);
	}

	return changed;
}

/** The slice of the memory adapter this recovery needs. */
interface AttachmentHistoryStore {
	getMessages: (threadId: string) => Promise<AgentDbMessage[]>;
	saveMessages: (args: {
		threadId: string;
		resourceId: string;
		messages: AgentDbMessage[];
	}) => Promise<void>;
}

/**
 * Outcome of a cleanup attempt. Deliberately three-valued: "nothing to remove" and
 * "the write failed" both left history unchanged, but only the latter means the
 * thread is still poisoned — so only the latter should send the user elsewhere.
 */
export type AttachmentCleanupOutcome = 'no-attachments' | 'removed' | 'failed';

/**
 * Strip inline attachments from a thread's history after a turn that carried files
 * failed, so the next message starts from a payload the provider will accept.
 *
 * Every file part in the thread is dropped rather than just the newest: the
 * provider's refusal does not say which attachment it choked on, and leaving a
 * candidate behind leaves the thread broken.
 *
 * Never throws — this runs inside a run's terminal-error path, where surfacing a
 * recovery failure would replace the error the user actually needs to see.
 */
export async function dropRejectedAttachmentsFromHistory(
	memory: AttachmentHistoryStore,
	args: { threadId: string; resourceId: string },
	logger: Logger,
): Promise<AttachmentCleanupOutcome> {
	try {
		const sanitized = stripFileAttachmentParts(await memory.getMessages(args.threadId));
		if (sanitized.length === 0) return 'no-attachments';

		await memory.saveMessages({
			threadId: args.threadId,
			resourceId: args.resourceId,
			messages: sanitized,
		});

		logger.info('Dropped rejected attachments from Instance AI thread history', {
			threadId: args.threadId,
			messageCount: sanitized.length,
		});
		return 'removed';
	} catch (error) {
		logger.warn('Failed to drop rejected attachments from Instance AI thread history', {
			threadId: args.threadId,
			error: error instanceof Error ? error.message : String(error),
		});
		return 'failed';
	}
}
