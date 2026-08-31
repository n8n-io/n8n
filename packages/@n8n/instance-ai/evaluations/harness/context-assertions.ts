import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import { captureContext, snapshotFor, tiersOf } from './context-capture';
import type { BuildExpectationResult, ContextAssertion } from '../types';

/** No run debug at all — the thread produced nothing to search, so every claim is
 *  unanswerable rather than false. */
const NO_CAPTURE_REASON =
	'not checked — no run debug was captured for this thread, so there was no context state to search';

/** The graded turn's first step captured no prompt or window, so there is no probe
 *  state. Grading against the end of the turn instead would count what the agent
 *  produced while answering as evidence that it remembered. */
const NO_PROBE_REASON =
	'not checked — the graded turn captured no usable state at the probe, so a retention claim cannot be answered';

function describe(assertion: ContextAssertion): string {
	const verb = assertion.mustAppear === false ? 'excludes' : 'contains';
	const when = assertion.anchor === 'turn-end' ? ' [by turn end]' : '';
	const note = assertion.note ? ` (${assertion.note})` : '';
	return `context ${verb} "${assertion.text}"${when}${note}`;
}

function ungraded(assertion: ContextAssertion, reason: string): BuildExpectationResult {
	return {
		expectation: describe(assertion),
		pass: false,
		reason,
		incomplete: true,
		kind: 'context',
	};
}

/**
 * Check whether exact values reached the agent's context, deterministically.
 *
 * Deliberately not LLM-graded. For a concrete value — a channel, a column name, a
 * date, a parameter key — "was this string in what the model was sent" is a substring
 * search over data already captured. It cannot hallucinate, costs nothing, and needs
 * no rubric, which keeps the judge off the load-bearing path for the claims the A/B
 * actually turns on.
 *
 * Matching is case-insensitive: casing drifts as content is re-rendered through tool
 * payloads, and a casing difference is never the finding. Assert **atomic** values
 * (`#ops-alerts`, `triggerAtHour`, `2026-03-01`) rather than formatted phrases
 * (`triggerAtHour: 6`) — spacing and quoting vary by which tier carries the value.
 */
export function checkContextAssertions(
	assertions: ContextAssertion[] | undefined,
	runDebug: InstanceAiRunDebugResponse[] | undefined,
): BuildExpectationResult[] {
	if (!assertions || assertions.length === 0) return [];

	const captured = captureContext(runDebug);
	if (!captured) return assertions.map((a) => ungraded(a, NO_CAPTURE_REASON));

	const hits = (anchor: 'probe' | 'turn-end', needle: string): string[] => {
		const snapshot = snapshotFor(captured, anchor);
		if (!snapshot) return [];
		return tiersOf(snapshot)
			.filter(([, text]) => text.toLowerCase().includes(needle))
			.map(([tier]) => tier);
	};

	return assertions.map((assertion) => {
		const anchor = assertion.anchor ?? 'probe';
		if (!snapshotFor(captured, anchor)) return ungraded(assertion, NO_PROBE_REASON);

		const needle = assertion.text.toLowerCase();
		const found = hits(anchor, needle);
		const mustAppear = assertion.mustAppear !== false;
		const pass = mustAppear ? found.length > 0 : found.length === 0;
		const at = anchor === 'turn-end' ? 'at the end of the turn' : 'at the probe';

		// Only asked for a probe claim that missed: it separates "the agent never had
		// this" from "the agent re-derived it while answering", which are different
		// findings with different fixes. A turn-end claim is already reading that state.
		const later = !pass && mustAppear && anchor === 'probe' ? hits('turn-end', needle) : [];

		let reason: string;
		if (!mustAppear) {
			reason =
				found.length === 0
					? `correctly absent from every context tier ${at}`
					: `still present ${at} in: ${found.join(', ')}`;
		} else if (found.length > 0) {
			// "Retained" is claimed only at the probe. A turn-end hit may be a fetch,
			// which is a different and equally valid thing.
			reason =
				anchor === 'turn-end'
					? `present by the end of the turn in: ${found.join(', ')} — carried in or fetched during it`
					: `retained — present at the probe in: ${found.join(', ')}`;
		} else if (later.length > 0) {
			reason = `NOT retained — absent at the probe, but present by the end of the turn in: ${later.join(', ')}. The agent re-derived it rather than carrying it forward.`;
		} else {
			reason = 'not present at the probe, nor anywhere by the end of the turn';
		}

		return { expectation: describe(assertion), pass, reason, kind: 'context' };
	});
}
