import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import { summarizeMemoryContext } from './memory-context';
import type { BuildExpectationResult, ContextAssertion } from '../types';

/** Recorded when there was no captured context to search, so a missing capture reads
 *  as "not checked" rather than as the value being absent. */
const NO_CONTEXT_REASON =
	'not checked — no run debug was captured for this thread, so there was no context state to search';

/**
 * Deterministically check whether exact values reached the agent's context.
 *
 * Deliberately not LLM-graded. For a concrete value — a date, a channel, a column
 * name, a parameter key — "does this string appear in what the model was sent" is a
 * substring search over data already captured, so it cannot hallucinate, costs
 * nothing, and needs no rubric. That keeps the judge off the load-bearing path for
 * the claims that matter most, leaving it for genuinely fuzzy ones ("the retrieved
 * sibling was the right *kind* of workflow").
 *
 * Two deliberate choices:
 * - Searches the **untruncated** context. The judge's view is capped so the
 *   interesting part stays in its attention; this check has no such constraint, so a
 *   value living in an elided region is still found rather than reported missing.
 * - Matching is case-insensitive. Casing drifts freely as content is re-rendered
 *   through tool payloads, and a casing difference is never the finding.
 *
 * Assert **atomic** values (`triggerAtHour`, `#ops-alerts`, `2026-03-01`), not
 * formatted phrases (`triggerAtHour: 6`) — the same value is serialised with
 * different spacing and quoting depending on which tier it arrives in.
 */
export function checkContextAssertions(
	assertions: ContextAssertion[] | undefined,
	runDebug: InstanceAiRunDebugResponse[] | undefined,
): BuildExpectationResult[] {
	if (!assertions || assertions.length === 0) return [];

	const describe = (a: ContextAssertion) =>
		`context ${a.mustAppear === false ? 'excludes' : 'contains'} "${a.text}"${a.note ? ` (${a.note})` : ''}`;

	const summary = summarizeMemoryContext(runDebug);
	if (!summary) {
		return assertions.map((a) => ({
			expectation: describe(a),
			pass: false,
			reason: NO_CONTEXT_REASON,
			incomplete: true,
			kind: 'memory' as const,
		}));
	}

	// One haystack across all three tiers: the question is whether the model had the
	// value at all, not which tier carried it. Untruncated on purpose.
	const tiers: Array<[string, string]> = [
		['observation block', summary.observations ?? ''],
		['message window', summary.finalMessageWindow],
		['system prompt', summary.finalSystemPrompt],
	];

	return assertions.map((assertion) => {
		const needle = assertion.text.toLowerCase();
		const found = tiers
			.filter(([, text]) => text.toLowerCase().includes(needle))
			.map(([tier]) => tier);
		const mustAppear = assertion.mustAppear !== false;
		const pass = mustAppear ? found.length > 0 : found.length === 0;
		const where = found.length > 0 ? found.join(', ') : 'none';
		return {
			expectation: describe(assertion),
			pass,
			reason: mustAppear
				? found.length > 0
					? `found in: ${where} (exact match, case-insensitive)`
					: 'not present in the observation block, message window or system prompt'
				: found.length === 0
					? 'correctly absent from all three context tiers'
					: `still present in: ${where}`,
			kind: 'memory' as const,
		};
	});
}
