/**
 * Flatten a (possibly multi-turn) test-case conversation into the single request
 * prompt used to drive a one-shot build, and reused at eval time so prebuilt
 * workflows are judged against the same request their builder received.
 */
export function buildPromptFromConversation(
	conversation: ReadonlyArray<{ role: string; text: string }>,
): string {
	const [firstUserTurn, ...remainingUserTurns] = conversation
		.filter((turn) => turn.role === 'user')
		.map((turn) => turn.text.trim())
		.filter((text) => text.length > 0);

	if (!firstUserTurn) return conversation[0]?.text ?? '';
	if (remainingUserTurns.length === 0) return firstUserTurn;

	return [
		firstUserTurn,
		'Additional details from the user:',
		...remainingUserTurns.map((turn, index) => `${String(index + 1)}. ${turn}`),
		'',
		"Use all details above as requirements. Configure all nodes as completely as possible and don't ask me for credentials; I'll set them up later.",
	].join('\n\n');
}
