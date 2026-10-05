/**
 * Scores one benchmark case, and aggregates the run into the number that
 * decides whether the fast path is worth keeping: how many steps would be
 * auto-executed, and how many of those would be wrong.
 *
 * The gate itself is not reimplemented here — `decide()` is the same function
 * `browser_act` runs in production, so the benchmark measures the real
 * decision path. Only the accuracy metrics read the raw answers, because
 * `decide()` deliberately short-circuits on a tripped guard and so cannot
 * report what the router would have said.
 */

import {
	ACTIONS_TAKING_REF,
	decide,
	GUARD_QUESTIONS,
	GUARD_THRESHOLD,
	pickRef,
	type Answer,
	type Decision,
} from '@n8n/mcp-browser';

export interface ExpectedAction {
	tool: string;
	ref?: string;
}

export interface GradedCase {
	id: string;
	expected: ExpectedAction;
	/** What the router picked, regardless of whether a guard overrode it. */
	routerChoice: string;
	routerConfidence: number;
	refChoice?: string;
	routerCorrect: boolean;
	/** Undefined when the chosen action takes no element. */
	refCorrect?: boolean;
	exactMatch: boolean;
	confidence: number;
	trippedGuards: string[];
	/** The production decision for these answers. */
	decision: Decision;
	/** True when `decide()` would have performed the action unsupervised. */
	autoExecuted: boolean;
	/** True when it executed and the action matched the recorded one. */
	autoExecutedCorrectly: boolean;
}

function isChoice(answer: Answer | undefined): answer is Extract<Answer, { type: 'choice' }> {
	return answer?.type === 'choice';
}

export function gradeCase(
	id: string,
	expected: ExpectedAction,
	answers: Record<string, Answer>,
): GradedCase {
	const router = answers.action;
	if (!isChoice(router)) throw new Error(`Case ${id}: missing or non-choice "action" answer`);

	const ref = ACTIONS_TAKING_REF.has(router.choice) ? pickRef(answers) : undefined;

	const routerCorrect = router.choice === expected.tool;
	const refCorrect = ref && expected.ref !== undefined ? ref.choice === expected.ref : undefined;
	const exactMatch = routerCorrect && refCorrect !== false;

	const trippedGuards = Object.keys(GUARD_QUESTIONS).filter((name) => {
		const answer = answers[name];
		return answer?.type === 'noul' && answer.noul >= GUARD_THRESHOLD;
	});

	const decision = decide(answers);
	const autoExecuted = decision.kind === 'execute';
	const executedMatches =
		decision.kind === 'execute' &&
		decision.action === expected.tool &&
		(expected.ref === undefined || decision.ref === expected.ref);

	return {
		id,
		expected,
		routerChoice: router.choice,
		routerConfidence: router.confidence,
		...(ref ? { refChoice: ref.choice } : {}),
		routerCorrect,
		...(refCorrect === undefined ? {} : { refCorrect }),
		exactMatch,
		confidence: ref ? Math.min(router.confidence, ref.confidence) : router.confidence,
		trippedGuards,
		decision,
		autoExecuted,
		autoExecutedCorrectly: executedMatches,
	};
}

export interface Summary {
	cases: number;
	routerAccuracy: number;
	/** Over the cases where a ref was actually judged. */
	refAccuracy: number;
	refsJudged: number;
	exactMatchRate: number;
	/** Share of all cases the loop performed without a model turn. */
	coverage: number;
	/** Share of performed actions that were wrong — the number that must be near zero. */
	wrongRate: number;
	executed: number;
	wrong: number;
	/** Why the loop handed back, counted by reason. */
	handbackReasons: Record<string, number>;
}

export function summarize(graded: GradedCase[]): Summary {
	const rate = (count: number, total: number) => (total === 0 ? 0 : count / total);
	const withRef = graded.filter((c) => c.refCorrect !== undefined);
	const executed = graded.filter((c) => c.autoExecuted);
	const wrong = executed.filter((c) => !c.autoExecutedCorrectly).length;

	const handbackReasons: Record<string, number> = {};
	for (const one of graded) {
		if (one.decision.kind !== 'handback') continue;
		const { reason } = one.decision;
		handbackReasons[reason] = (handbackReasons[reason] ?? 0) + 1;
	}

	return {
		cases: graded.length,
		routerAccuracy: rate(graded.filter((c) => c.routerCorrect).length, graded.length),
		refAccuracy: rate(withRef.filter((c) => c.refCorrect === true).length, withRef.length),
		refsJudged: withRef.length,
		exactMatchRate: rate(graded.filter((c) => c.exactMatch).length, graded.length),
		coverage: rate(executed.length, graded.length),
		wrongRate: rate(wrong, executed.length),
		executed: executed.length,
		wrong,
		handbackReasons,
	};
}
