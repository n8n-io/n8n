/**
 * Instance AI no longer injects internal background-task control messages into
 * stored chat history. Keep the helper so the parser has a stable call site.
 */
export function cleanStoredUserMessage(stored: string): string {
	return stored;
}
