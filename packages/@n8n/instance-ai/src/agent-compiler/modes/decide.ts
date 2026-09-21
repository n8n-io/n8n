import type {
	DecisionLogEntry,
	DecisionOutcome,
	DecisionService,
} from '../../workflow-compiler/decision/decision-service';
import {
	withNoneOfThese,
	type DecisionQuestion,
	type DecisionQuestions,
	type DecisionState,
} from '../../workflow-compiler/decision/schemas';
import { AGENT_DECISION_SCHEMA_VERSION } from '../versions';

export interface Candidate {
	id: string;
	label: string;
}

/** One bounded choice over `candidates`, with the "none of these" escape. */
export function choiceQuestion(
	instructions: string,
	candidates: readonly Candidate[],
): DecisionQuestion {
	const criteria: Record<string, string | null> = {};
	for (const candidate of candidates) criteria[candidate.id] = candidate.label;
	return { type: 'choice', instructions, criteria: withNoneOfThese(criteria) };
}

/** Runs one decision wave and records it in `log`. */
export async function decide(
	input: { decisions: DecisionService; abortSignal?: AbortSignal },
	name: string,
	state: DecisionState,
	questions: DecisionQuestions,
	log: DecisionLogEntry[],
): Promise<DecisionOutcome> {
	const schemaVersion = AGENT_DECISION_SCHEMA_VERSION;
	const outcome = await input.decisions.decide({
		name,
		schemaVersion,
		state,
		questions,
		abortSignal: input.abortSignal,
	});
	log.push({
		name,
		schemaVersion,
		backend: input.decisions.kind,
		...(outcome.ok ? { model: outcome.model } : { failureReason: outcome.reason }),
		latencyMs: outcome.latencyMs,
		ok: outcome.ok,
		questionNames: Object.keys(questions),
		answers: outcome.ok ? outcome.answers : {},
		policy: {},
	});
	return outcome;
}
