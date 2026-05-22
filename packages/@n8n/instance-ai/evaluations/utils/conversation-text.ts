import type { TranscriptTurn } from '../types';

/**
 * User-side turns from a captured transcript, flattened as a text block for
 * prompt-aware checks. Single-turn → plain text; multi-turn → numbered prefix.
 * Trace-mode (TRUST-104) will plug in a LangSmith adapter emitting the same shape.
 */
export function userTurnsAsText(transcript: TranscriptTurn[]): string {
	const turns = transcript
		.map((t) => t.userMessage)
		.filter((m): m is string => typeof m === 'string' && m.length > 0);

	if (turns.length === 0) return '';
	if (turns.length === 1) return turns[0];
	return turns.map((text, i) => `Turn ${String(i + 1)}: ${text}`).join('\n\n');
}
