// ---------------------------------------------------------------------------
// Orchestrates intent-resolution grading for one build: parses the final
// agent response, grades it deterministically, layers on LLM-judged
// rationale/clarify-dimension verdicts, and maps everything to
// `BuildExpectationResult` units so it rides the existing
// aggregator/report/PR-comment pipeline unchanged (see collect.ts).
// ---------------------------------------------------------------------------

import { gradeIntentDeterministic } from './grade';
import { judgeClarifyDimensions, judgeRationale } from './judge';
import { parseIntentPredictions } from './parse';
import { allFailVerdicts } from '../build-expectations/verifier';
import type {
	BuildExpectationResult,
	IntentCaseGrade,
	IntentExpectation,
	IntentPartGrade,
	TranscriptTurn,
	WorkflowTestCase,
} from '../types';
import { lastAgentText } from '../utils/conversation-text';

interface IntentUnit {
	label: string;
	kind: 'tuple' | 'clarify-dimensions';
	/** Index into `grade.parts` this unit is graded from. */
	partIndex: number;
}

function intentUnits(expectation: IntentExpectation): IntentUnit[] {
	if (expectation.parts) {
		return expectation.parts.flatMap((part, partIndex): IntentUnit[] => {
			const units: IntentUnit[] = [
				{
					label: `[intent] part "${part.span}" matches an accepted tuple`,
					kind: 'tuple',
					partIndex,
				},
			];
			if (part.clarifyingDimensions && part.clarifyingDimensions.length > 0) {
				units.push({
					label: `[intent] part "${part.span}" clarifying question targets: ${part.clarifyingDimensions.join(', ')}`,
					kind: 'clarify-dimensions',
					partIndex,
				});
			}
			return units;
		});
	}

	const units: IntentUnit[] = [
		{
			label: '[intent] classification matches an accepted (anchor, embeds_other) tuple',
			kind: 'tuple',
			partIndex: 0,
		},
	];
	if (expectation.clarifyingDimensions && expectation.clarifyingDimensions.length > 0) {
		units.push({
			label: `[intent] a clarifying question targets: ${expectation.clarifyingDimensions.join(', ')}`,
			kind: 'clarify-dimensions',
			partIndex: 0,
		});
	}
	return units;
}

/** Deterministic unit labels for a case's `intentExpectation` — what
 *  `evaluations/build-expectations/collect.ts` appends so the untouched
 *  aggregator counts intent-resolution units alongside process/outcome
 *  expectations. Empty for cases without an `intentExpectation`. */
export function intentUnitLabels(testCase: Pick<WorkflowTestCase, 'intentExpectation'>): string[] {
	if (!testCase.intentExpectation) return [];
	return intentUnits(testCase.intentExpectation).map((unit) => unit.label);
}

function expectedRationaleFor(
	expectation: IntentExpectation,
	partIndex: number,
): string | undefined {
	return expectation.parts ? expectation.parts[partIndex].rationale : expectation.rationale;
}

function expectedClarifyDimensionsFor(
	expectation: IntentExpectation,
	partIndex: number,
): string[] | undefined {
	return expectation.parts
		? expectation.parts[partIndex].clarifyingDimensions
		: expectation.clarifyingDimensions;
}

interface EnrichedPartGrade extends IntentPartGrade {
	/** Explanation for `clarifyDimensionsPass`, kept apart from `reason`
	 *  (which explains the tuple match) so each unit's verdict reads cleanly. */
	clarifyReason?: string;
}

async function enrichPartGrade(
	partGrade: IntentPartGrade,
	expectation: IntentExpectation,
	partIndex: number,
): Promise<EnrichedPartGrade> {
	const expectedRationale = expectedRationaleFor(expectation, partIndex);
	const expectedClarifyDimensions = expectedClarifyDimensionsFor(expectation, partIndex);

	let rationaleScore: 0 | 1 | 2 | undefined;
	if (partGrade.prediction?.rationale && expectedRationale) {
		const judged = await judgeRationale({
			expectedRationale,
			predictedRationale: partGrade.prediction.rationale,
		});
		rationaleScore = judged?.score;
	}

	let clarifyDimensionsPass: boolean | undefined;
	let clarifyReason: string | undefined;
	if (expectedClarifyDimensions && expectedClarifyDimensions.length > 0) {
		const askedQuestions = partGrade.prediction?.clarifyingQuestions ?? [];
		if (askedQuestions.length > 0) {
			const judged = await judgeClarifyDimensions({
				clarifyingQuestions: askedQuestions,
				expectedDimensions: expectedClarifyDimensions,
			});
			clarifyDimensionsPass = judged.pass;
			clarifyReason = judged.reason;
		} else {
			clarifyDimensionsPass = false;
			clarifyReason = 'no clarifying questions were asked';
		}
	}

	return { ...partGrade, rationaleScore, clarifyDimensionsPass, clarifyReason };
}

function tupleVerdictReason(partGrade: IntentPartGrade): string {
	const scoreSuffix =
		partGrade.rationaleScore !== undefined
			? ` (rationale score: ${String(partGrade.rationaleScore)}/2)`
			: '';
	return `${partGrade.reason}${scoreSuffix}`;
}

function toIntentPartGrade(enriched: EnrichedPartGrade): IntentPartGrade {
	const { clarifyReason: _clarifyReason, ...rest } = enriched;
	return rest;
}

export interface JudgeIntentForBuildResult {
	verdicts: BuildExpectationResult[];
	grade: IntentCaseGrade;
}

/**
 * Judge intent-resolution grading for one build. No-op (empty verdicts, empty
 * grade) when the case has no `intentExpectation` — callers gate on that
 * themselves, this is just a defensive no-op.
 */
export async function judgeIntentForBuild(
	testCase: Pick<WorkflowTestCase, 'intentExpectation'>,
	transcript: TranscriptTurn[] | undefined,
): Promise<JudgeIntentForBuildResult> {
	const expectation = testCase.intentExpectation;
	if (!expectation) return { verdicts: [], grade: { parts: [] } };

	const labels = intentUnitLabels(testCase);

	if (!transcript || transcript.length === 0) {
		const expectedSpans = expectation.parts?.map((part) => part.span) ?? [undefined];
		const grade: IntentCaseGrade = {
			parseError: 'no transcript captured',
			parts: expectedSpans.map((expectedSpan) => ({
				expectedSpan,
				jointPass: false,
				anchorMatch: false,
				embedsMatch: false,
				reason: 'no transcript captured',
			})),
		};
		return { verdicts: allFailVerdicts(labels, 'no transcript captured'), grade };
	}

	const finalText = lastAgentText(transcript);
	const parsed = parseIntentPredictions(finalText);
	const deterministicGrade = gradeIntentDeterministic(expectation, parsed);

	const enrichedParts = await Promise.all(
		deterministicGrade.parts.map(
			async (partGrade, idx) => await enrichPartGrade(partGrade, expectation, idx),
		),
	);

	const grade: IntentCaseGrade = {
		parts: enrichedParts.map(toIntentPartGrade),
		...(deterministicGrade.parseError ? { parseError: deterministicGrade.parseError } : {}),
	};

	const units = intentUnits(expectation);
	const verdicts: BuildExpectationResult[] = units.map((unit) => {
		const enriched = enrichedParts[unit.partIndex];
		if (unit.kind === 'tuple') {
			return {
				expectation: unit.label,
				pass: enriched.jointPass,
				reason: tupleVerdictReason(enriched),
			};
		}
		return {
			expectation: unit.label,
			pass: enriched.clarifyDimensionsPass ?? false,
			reason: enriched.clarifyReason ?? 'no clarifying questions were asked',
		};
	});

	return { verdicts, grade };
}
