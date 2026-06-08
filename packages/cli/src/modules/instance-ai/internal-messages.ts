/**
 * Protocol for internal messages injected by the service layer.
 *
 * The service may prepend a transient task-status block to real user messages
 * so the orchestrator can reference currently running detached tasks. These
 * are LLM-facing only — they must never reach the UI.
 *
 * The service writes this format,
 * the parser reads it (cleanStoredUserMessage).
 */

export const AUTO_FOLLOW_UP_MESSAGE = '(continue)';

/** Matches internal task-context prefix blocks injected by the service. */
const TASK_CONTEXT_BLOCK =
	/^(?:<running-tasks>\n[\s\S]*?\n<\/running-tasks>|<planned-task-follow-up[\s\S]*?\n<\/planned-task-follow-up>|<planning-blueprint>\n[\s\S]*?\n<\/planning-blueprint>|<background-task-completed>\n[\s\S]*?\n<\/background-task-completed>|<workflow-verification-follow-up>\n[\s\S]*?\n<\/workflow-verification-follow-up>|<workflow-setup-required>\n[\s\S]*?\n<\/workflow-setup-required>)\n\n/;

/**
 * Recover the original user text from a stored message that may contain
 * internal enrichment. Returns `null` for auto-follow-up messages that
 * should be hidden from the UI entirely.
 */
export function cleanStoredUserMessage(stored: string): string | null {
	const text = stored.replace(TASK_CONTEXT_BLOCK, '');
	return text === AUTO_FOLLOW_UP_MESSAGE ? null : text;
}
