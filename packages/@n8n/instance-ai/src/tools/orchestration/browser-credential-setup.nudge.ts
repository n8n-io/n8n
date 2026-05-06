/**
 * Sent to the sub-agent when it stops without calling `pause-for-user`. The
 * agent has already done the browser work — it just forgot the final
 * confirmation step that hands the user back the credential locations.
 */
export const NUDGE_PROMPT =
	'You stopped without confirming with the user. Call pause-for-user NOW to tell the user where the credential values live and to enter them privately in the n8n credential form.';

/**
 * Build the input for a nudge `subAgent.stream()` call. Each Mastra
 * `agent.stream()` invocation starts a fresh conversation — passing only the
 * nudge string would land in an empty context and the sub-agent would
 * apologetically give up. We replay the prior conversation as input so the
 * sub-agent has full context (briefing, browser actions, tool results) when
 * composing its `pause-for-user` message.
 *
 * Returns the bare nudge string when there's nothing to replay (defensive
 * fallback — should not happen in practice once the first stream has run).
 */
export function buildNudgeStreamInput<M>(
	priorMessages: readonly M[],
): Array<M | { role: 'user'; content: string }> | string {
	if (priorMessages.length === 0) return NUDGE_PROMPT;
	return [...priorMessages, { role: 'user', content: NUDGE_PROMPT }];
}
