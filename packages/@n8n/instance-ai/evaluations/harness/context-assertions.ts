import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import { summarizeMemoryContext, tiersForAnchor } from './memory-context';
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
 * - Searches the **untruncated** context, at both levels the judge's view is capped:
 *   the per-tier window/prompt limits and the per-tool-payload limit
 *   (`capPayloads: false`). The judge is capped so the interesting part stays in its
 *   attention; this check has no attention budget, so a value living in an elided
 *   region — or deep inside a fetched workflow, execution or table schema — is still
 *   found rather than reported missing.
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
		`context ${a.mustAppear === false ? 'excludes' : 'contains'} "${a.text}"${
			a.anchor === 'turn-end' ? ' [by turn end]' : ''
		}${a.note ? ` (${a.note})` : ''}`;

	// capPayloads: false — a value inside a large tool result must not read as absent
	// just because it sat past the judge's per-payload cap.
	const summary = summarizeMemoryContext(runDebug, { capPayloads: false });
	if (!summary) {
		return assertions.map((a) => ({
			expectation: describe(a),
			pass: false,
			reason: NO_CONTEXT_REASON,
			incomplete: true,
			kind: 'memory' as const,
		}));
	}

	// Each claim names the moment it is about (`probe` by default). A retention claim
	// grades at the probe, because the end state would let the agent's own restatement
	// count as recall. A retrieval claim grades at turn end, because tool calls land
	// after the request arrives and the probe snapshot structurally cannot see them.
	const tierList = (anchor: 'probe' | 'turn-end'): Array<[string, string]> => {
		const t = tiersForAnchor(summary, anchor);
		return [
			['observation block', t.observations ?? ''],
			['message window', t.messageWindow],
			['system prompt', t.systemPrompt],
		];
	};
	const hits = (tiers: Array<[string, string]>, needle: string) =>
		tiers.filter(([, text]) => text.toLowerCase().includes(needle)).map(([tier]) => tier);

	return assertions.map((assertion) => {
		const anchor = assertion.anchor ?? 'probe';
		const needle = assertion.text.toLowerCase();
		const found = hits(tierList(anchor), needle);
		// Only meaningful for a probe-anchored claim: searching turn end tells you whether
		// the agent re-derived the value while answering. A turn-end claim is already
		// reading that state, so there is no later moment to compare against.
		const foundLater =
			found.length === 0 && anchor === 'probe' ? hits(tierList('turn-end'), needle) : [];
		const mustAppear = assertion.mustAppear !== false;
		const pass = mustAppear ? found.length > 0 : found.length === 0;
		const at = anchor === 'turn-end' ? 'at the end of the turn' : 'at the probe';

		let reason: string;
		if (mustAppear) {
			if (found.length > 0) {
				// "retained" only for a probe claim: it names the memory subsystem having
				// carried the value in. A turn-end hit may be a fetch, which is a different
				// (and equally valid) thing, so it is not called retention.
				reason =
					anchor === 'turn-end'
						? `present by the end of the turn in: ${found.join(', ')} — carried in or fetched during the turn (exact match, case-insensitive)`
						: `retained — present at the probe in: ${found.join(', ')} (exact match, case-insensitive)`;
			} else if (foundLater.length > 0) {
				// The distinction worth surfacing: the memory subsystem did not carry
				// this, the agent re-produced it while answering.
				reason = `NOT retained — absent when the probe arrived, but present by the end of the turn in: ${foundLater.join(', ')}. The agent re-derived or restated it rather than carrying it forward.`;
			} else {
				reason =
					anchor === 'turn-end'
						? 'not present anywhere by the end of the turn — never carried in and never fetched'
						: 'not present at the probe, nor anywhere by the end of the turn';
			}
		} else {
			reason =
				found.length === 0
					? `correctly absent from all three context tiers ${at}`
					: `still present ${at} in: ${found.join(', ')}`;
		}

		return { expectation: describe(assertion), pass, reason, kind: 'memory' as const };
	});
}
