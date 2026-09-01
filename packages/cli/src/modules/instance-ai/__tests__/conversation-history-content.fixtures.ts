/**
 * Stored-row content builders shared by the conversation-history unit and
 * integration tests. The persisted message shape — the thing both the SQL
 * markers and the JSON parsers depend on — is encoded here once, so the two
 * suites cannot drift apart.
 */

export function userContent(text: string, extra: Record<string, unknown> = {}): string {
	return JSON.stringify({ role: 'user', content: [{ type: 'text', text }], ...extra });
}

export function assistantTextContent(text: string): string {
	return JSON.stringify({ role: 'assistant', content: [{ type: 'text', text }] });
}

/** Mid-turn narration: text emitted alongside the tool call the agent made next. */
export function assistantWorkingContent(text: string): string {
	return JSON.stringify({
		role: 'assistant',
		content: [
			...(text ? [{ type: 'text', text }] : []),
			{ type: 'tool-call', toolCallId: 'call-9', toolName: 'workflows', state: 'resolved' },
		],
	});
}

export function askUserContent(
	answers: Array<{
		question: string;
		selectedOptions: string[];
		customText?: string;
		skipped?: boolean;
	}>,
	options: { state?: string } = {},
): string {
	return JSON.stringify({
		role: 'assistant',
		content: [
			{
				type: 'tool-call',
				toolCallId: 'call-1',
				toolName: 'ask-user',
				state: options.state ?? 'resolved',
				output: { answered: true, answers },
			},
		],
	});
}

export function toolRowContent(): string {
	return JSON.stringify({ role: 'tool', content: [] });
}
