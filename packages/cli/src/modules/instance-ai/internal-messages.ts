/**
 * Protocol for internal messages injected by the service layer.
 *
 * When background tasks complete, the service auto-triggers a follow-up run
 * with a `(continue)` sentinel and prepends a `<background-tasks>` block with
 * task results. These are LLM-facing only — they must never reach the UI.
 *
 * The service writes this format (enrichMessageWithBackgroundTasks),
 * the parser reads it (cleanStoredUserMessage).
 */

/** Sentinel used for auto-follow-up runs — never user-initiated. */
export const AUTO_FOLLOW_UP_MESSAGE = '(continue)';

/** Matches the `<background-tasks>…</background-tasks>\n\n` prefix. */
const BACKGROUND_TASKS_BLOCK = /^<background-tasks>\n[\s\S]*?\n<\/background-tasks>\n\n/;

/**
 * Recover the original user text from a stored message that may contain
 * internal enrichment. Returns `null` for auto-follow-up messages that
 * should be hidden from the UI entirely.
 */
export function cleanStoredUserMessage(stored: string): string | null {
	const text = stored.replace(BACKGROUND_TASKS_BLOCK, '');
	return text === AUTO_FOLLOW_UP_MESSAGE ? null : text;
}
