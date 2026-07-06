// ---------------------------------------------------------------------------
// Deterministic grading for intent-resolution cases: exact-match on
// (anchor, embeds_other) against an `accepts` tolerance list, plus
// token-overlap span matching for compound (multi-part) cases.
// Pure — no LLM calls. LLM-judged fields (rationaleScore,
// clarifyDimensionsPass) are filled in by evaluations/intent/run.ts.
// ---------------------------------------------------------------------------

import type { ParsedIntentPredictions } from './parse';
import type {
	IntentAccept,
	IntentCaseGrade,
	IntentExpectation,
	IntentPartGrade,
	IntentPrediction,
} from '../types';

/** Minimum fraction of an expected span's tokens that must appear in a
 *  predicted span for the two to be considered the same part. */
const SPAN_MATCH_THRESHOLD = 0.5;

export interface TupleMatch {
	pass: boolean;
	anchorMatch: boolean;
	embedsMatch: boolean;
}

/**
 * Does `p` satisfy any of the accepted tuples? `anchorMatch` is true if any
 * accepted tuple's anchor matches, independent of embeds_other — so a
 * right-anchor-wrong-embed prediction is reported as an anchor match with a
 * failing joint result, not a full miss.
 */
export function matchTuple(accepts: IntentAccept[], p: IntentPrediction): TupleMatch {
	const anchorMatching = accepts.filter((a) => a.anchor === p.anchor);
	const anchorMatch = anchorMatching.length > 0;
	const embedsMatch = anchorMatching.some((a) => a.embedsOther === p.embedsOther);
	return { pass: anchorMatch && embedsMatch, anchorMatch, embedsMatch };
}

function tokenize(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.split(/\s+/)
			.filter(Boolean),
	);
}

function spanOverlapScore(predictedSpan: string, expectedSpan: string): number {
	const expectedTokens = tokenize(expectedSpan);
	if (expectedTokens.size === 0) return 0;
	const predictedTokens = tokenize(predictedSpan);
	let overlap = 0;
	for (const token of expectedTokens) {
		if (predictedTokens.has(token)) overlap++;
	}
	return overlap / expectedTokens.size;
}

/**
 * Assign each expected span to the best-matching prediction, by token
 * overlap (greedy best-first, threshold `SPAN_MATCH_THRESHOLD`). Falls back
 * to positional assignment when no prediction carries a `span` at all and
 * the counts line up — the model answered per-part but omitted `Part:`
 * echoes. Returns `undefined` for an expected part with no matching
 * prediction.
 */
export function matchPartsToPredictions(
	expectedSpans: string[],
	predictions: IntentPrediction[],
): Array<number | undefined> {
	const withSpans = predictions
		.map((p, i) => ({ p, i }))
		.filter((entry): entry is { p: IntentPrediction & { span: string }; i: number } =>
			Boolean(entry.p.span),
		);

	if (withSpans.length === 0 && predictions.length === expectedSpans.length) {
		return expectedSpans.map((_, i) => i);
	}

	const candidates: Array<{ expectedIndex: number; predictionIndex: number; score: number }> = [];
	expectedSpans.forEach((expectedSpan, expectedIndex) => {
		for (const { p, i } of withSpans) {
			const score = spanOverlapScore(p.span, expectedSpan);
			if (score >= SPAN_MATCH_THRESHOLD) {
				candidates.push({ expectedIndex, predictionIndex: i, score });
			}
		}
	});
	candidates.sort((a, b) => b.score - a.score);

	const assignment: Array<number | undefined> = expectedSpans.map(() => undefined);
	const usedPredictions = new Set<number>();
	for (const { expectedIndex, predictionIndex, score: _score } of candidates) {
		if (assignment[expectedIndex] !== undefined) continue;
		if (usedPredictions.has(predictionIndex)) continue;
		assignment[expectedIndex] = predictionIndex;
		usedPredictions.add(predictionIndex);
	}
	return assignment;
}

function describePrediction(p: IntentPrediction): string {
	return `anchor=${p.anchor}, embedsOther=${String(p.embedsOther)}`;
}

function gradeTuple(
	accepts: IntentAccept[],
	prediction: IntentPrediction,
): Omit<IntentPartGrade, 'expectedSpan'> {
	const { pass, anchorMatch, embedsMatch } = matchTuple(accepts, prediction);
	return {
		prediction,
		jointPass: pass,
		anchorMatch,
		embedsMatch,
		reason: pass
			? `predicted (${describePrediction(prediction)}) matches an accepted tuple`
			: `predicted (${describePrediction(prediction)}) does not match any accepted tuple`,
	};
}

/**
 * Grade a case's parsed predictions against its expectation. Single-part
 * cases (`accepts`) expect exactly one classification block — more than one
 * is treated as a failure (the model should have decomposed or not
 * decomposed to match the case's shape). Compound cases (`parts`) match each
 * expected span to a prediction via `matchPartsToPredictions`.
 *
 * Fills every field except the LLM-judged ones (`rationaleScore`,
 * `clarifyDimensionsPass`) — callers layer those on afterward.
 */
export function gradeIntentDeterministic(
	expectation: IntentExpectation,
	parsed: ParsedIntentPredictions,
): IntentCaseGrade {
	if (parsed.error) {
		const expectedSpans = expectation.parts?.map((part) => part.span) ?? [undefined];
		return {
			parseError: parsed.error,
			parts: expectedSpans.map((expectedSpan) => ({
				expectedSpan,
				jointPass: false,
				anchorMatch: false,
				embedsMatch: false,
				reason: `unparseable response: ${parsed.error}`,
			})),
		};
	}

	if (expectation.parts) {
		const expectedSpans = expectation.parts.map((part) => part.span);
		const assignment = matchPartsToPredictions(expectedSpans, parsed.predictions);
		const parts: IntentPartGrade[] = expectation.parts.map((part, idx) => {
			const predictionIndex = assignment[idx];
			const prediction =
				predictionIndex !== undefined ? parsed.predictions[predictionIndex] : undefined;
			if (!prediction) {
				return {
					expectedSpan: part.span,
					jointPass: false,
					anchorMatch: false,
					embedsMatch: false,
					reason: `no predicted part matched expected span "${part.span}"`,
				};
			}
			return { expectedSpan: part.span, ...gradeTuple(part.accepts, prediction) };
		});
		return { parts };
	}

	const accepts = expectation.accepts;
	if (!accepts) {
		throw new Error('intentExpectation must set either accepts or parts');
	}

	if (parsed.predictions.length !== 1) {
		return {
			parts: [
				{
					jointPass: false,
					anchorMatch: false,
					embedsMatch: false,
					reason: `expected exactly one classification block for a single-part case, got ${String(parsed.predictions.length)}`,
				},
			],
		};
	}

	return { parts: [gradeTuple(accepts, parsed.predictions[0])] };
}
