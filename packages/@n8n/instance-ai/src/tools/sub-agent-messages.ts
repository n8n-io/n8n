/**
 * Builds the message array for a sub-agent by prepending recent conversation
 * history from the orchestrator thread. This gives the sub-agent context of
 * what was already said so it does not repeat the orchestrator's narration.
 *
 * Includes the orchestrator's current-turn text (from published text-delta
 * events) so the sub-agent sees what was said in THIS turn, not just previous ones.
 */

import type { OrchestrationContext } from '../types';

/**
 * Reconstruct the orchestrator's current-turn text from published text-delta events.
 */
function getOrchestratorCurrentText(context: OrchestrationContext): string {
	const events = context.eventBus.getEventsForRun(context.threadId, context.runId);
	const chunks: string[] = [];
	for (const event of events) {
		if (
			event.type === 'text-delta' &&
			event.agentId === context.orchestratorAgentId &&
			typeof event.payload === 'object' &&
			event.payload !== null &&
			'text' in event.payload &&
			typeof event.payload.text === 'string'
		) {
			chunks.push(event.payload.text);
		}
	}
	return chunks.join('');
}

/**
 * Fetch recent conversation messages from the orchestration context and
 * combine them with the task briefing into a message array suitable for
 * `Agent.stream()`.
 *
 * Returns the briefing string unchanged when no conversation history is
 * available (backwards-compatible).
 */
export async function buildSubAgentMessages(
	context: OrchestrationContext,
	briefing: string,
): Promise<
	Array<{ role: 'user'; content: string } | { role: 'assistant'; content: string }> | string
> {
	if (!context.getRecentMessages) {
		return briefing;
	}

	try {
		const recentMessages = await context.getRecentMessages();

		// Get the orchestrator's current-turn text (already streamed but not yet in memory)
		const currentTurnText = getOrchestratorCurrentText(context);

		if (recentMessages.length === 0 && !currentTurnText) {
			return briefing;
		}

		const messages: Array<
			{ role: 'user'; content: string } | { role: 'assistant'; content: string }
		> = recentMessages.map((m) =>
			m.role === 'user'
				? { role: 'user' as const, content: m.content }
				: { role: 'assistant' as const, content: m.content },
		);

		// Append the orchestrator's current-turn text so the sub-agent sees what was just said
		if (currentTurnText) {
			messages.push({ role: 'assistant' as const, content: currentTurnText });
		}

		messages.push({ role: 'user' as const, content: briefing });

		return messages;
	} catch {
		// Non-fatal — fall back to plain briefing
		return briefing;
	}
}
