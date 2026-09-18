/**
 * Turns one set of answers into a decision: perform this action, or hand back
 * to the reasoning model and say why.
 *
 * Pure on purpose — the loop in `tools/act.ts` does the I/O, this decides.
 */

import {
	ACTIONS_TAKING_REF,
	EXECUTABLE_ACTIONS,
	GUARD_QUESTIONS,
	pagedTargetRefKey,
	TARGET_REF_NONE,
	UNSPECIFIED_CHOICE_QUESTION,
} from './questions';
import { type ChoiceAnswer, isChoiceAnswer, isNoulAnswer, type Answer } from './types';

/**
 * Escalate when ANY guard crosses the line, rather than combining them into
 * one score: each guard describes a different reason acting here is unsafe, so
 * averaging them would let a strong signal be diluted by four quiet ones.
 */
export const GUARD_THRESHOLD = 0.7;

/**
 * No confidence threshold.
 *
 * Confidence is the spread of the probability distribution, so it falls as the
 * option count grows: a correct target among 600 candidates routinely scored
 * ~0.45 and was refused, while the same answer among 10 would pass. Gating on
 * a number that tracks page size rather than correctness stalled the loop on
 * exactly the pages it was built for.
 *
 * What makes acting on the top answer safe instead is verification at
 * execution time — the adapter re-resolves the ref and refuses an element that
 * is gone, disabled or unactionable — plus the caller's repeat detector, which
 * stops a loop that is choosing without effect.
 */
export type StopReason =
	| 'guard'
	| 'needs_text'
	| 'needs_choice'
	| 'needs_url'
	| 'goal_complete'
	| 'unclear';

export interface ExecuteDecision {
	kind: 'execute';
	action: string;
	ref?: string;
	/** Option label for `browser_select`. */
	value?: string;
	/** Key combination for `browser_press`. */
	keys?: string;
	confidence: number;
}

export interface HandBackDecision {
	kind: 'handback';
	reason: StopReason;
	detail: string;
	/** The action the reasoning model should probably take next, when known. */
	suggestion?: { action: string; ref?: string };
}

export type Decision = ExecuteDecision | HandBackDecision;

type Answers = Record<string, Answer>;

/**
 * Mass below this on a page's best real option means the page genuinely holds
 * nothing — not that the model preferred `none` by a nose.
 */
const MIN_TARGET_PROBABILITY = 0.05;

/**
 * The target element, across every page of candidates.
 *
 * A page whose top answer is `none` is NOT discarded. `none` competes for mass
 * with the real options and lands close behind them — measured at 0.33–0.41
 * against a correct answer at 0.48–0.60 — so letting it win outright made a
 * run abort on variance alone, throwing away a ranking that already named the
 * right element. Instead the page's best real option is read out of its
 * probabilities, and `none` only prevails when no page offers a real option
 * with any mass behind it.
 */
export function pickRef(answers: Answers): ChoiceAnswer | undefined {
	let best: ChoiceAnswer | undefined;

	for (let page = 0; Object.hasOwn(answers, pagedTargetRefKey(page)); page++) {
		const answer = answers[pagedTargetRefKey(page)];
		if (!isChoiceAnswer(answer)) continue;

		const candidate =
			answer.choice === TARGET_REF_NONE
				? runnerUp(answer)
				: { ...answer, probability: answer.confidence };
		if (!candidate) continue;
		if (candidate.probability < MIN_TARGET_PROBABILITY) continue;
		if (candidate.probability > (best?.confidence ?? 0)) {
			best = { ...answer, choice: candidate.choice, confidence: candidate.probability };
		}
	}

	return best;
}

/** The highest-probability option that is not `none`. */
function runnerUp(answer: ChoiceAnswer): { choice: string; probability: number } | undefined {
	let choice: string | undefined;
	let probability = 0;
	for (const [option, mass] of Object.entries(answer.probabilities)) {
		if (option === TARGET_REF_NONE) continue;
		if (mass > probability) {
			choice = option;
			probability = mass;
		}
	}
	return choice === undefined ? undefined : { choice, probability };
}

export function decide(answers: Answers): Decision {
	const router = answers.action;
	if (!isChoiceAnswer(router)) {
		return { kind: 'handback', reason: 'unclear', detail: 'No routing answer was returned.' };
	}

	// Guards first: a tripped guard means acting here is wrong whatever the
	// router chose, so it outranks a confident action.
	const tripped = Object.keys(GUARD_QUESTIONS).filter((name) => {
		const answer = answers[name];
		return isNoulAnswer(answer) && answer.noul >= GUARD_THRESHOLD;
	});
	if (tripped.length > 0) {
		return {
			kind: 'handback',
			reason: 'guard',
			detail: `Stopped on ${tripped.map((name) => name.replace('guard_', '')).join(', ')}.`,
		};
	}

	const action = router.choice;
	const ref = ACTIONS_TAKING_REF.has(action) ? pickRef(answers) : undefined;

	if (action === 'browser_navigate') {
		return {
			kind: 'handback',
			reason: 'needs_url',
			detail: 'The next step is a navigation, which needs a URL that has to be chosen.',
			suggestion: { action },
		};
	}

	if (action === 'done') {
		return { kind: 'handback', reason: 'goal_complete', detail: 'The goal looks satisfied.' };
	}

	if (!(action in EXECUTABLE_ACTIONS)) {
		return {
			kind: 'handback',
			reason: 'unclear',
			detail: 'The page does not make the next action clear.',
		};
	}

	// The loop may carry out an action, but it may not decide what the action
	// means. A value the goal never gave belongs to whoever set the goal.
	const unspecifiedChoice = answers[UNSPECIFIED_CHOICE_QUESTION];
	if (isNoulAnswer(unspecifiedChoice) && unspecifiedChoice.noul >= GUARD_THRESHOLD) {
		return {
			kind: 'handback',
			reason: 'needs_choice',
			detail:
				'The next action would settle a choice the goal does not specify. Ask the user which value to use, then call browser_act again with that value in the goal.',
			suggestion: { action, ...(ref ? { ref: ref.choice } : {}) },
		};
	}

	// Reported, not gated: the least certain part of an action is the useful
	// number to record, and it is what a future threshold would key off.
	const confidence = ref ? Math.min(router.confidence, ref.confidence) : router.confidence;

	// Every page answered "none", so nothing on this page is the target.
	if (ACTIONS_TAKING_REF.has(action) && !ref) {
		return {
			kind: 'handback',
			reason: 'unclear',
			detail: `${action} needs an element, and no element on this page was chosen as the target.`,
		};
	}

	const selectValue = answers.select_value;
	const pressKeys = answers.press_keys;

	if (action === 'browser_select') {
		if (!isChoiceAnswer(selectValue)) {
			return {
				kind: 'handback',
				reason: 'unclear',
				detail: 'browser_select needs an option but none was offered by the page.',
			};
		}
		return {
			kind: 'execute',
			action,
			...(ref ? { ref: ref.choice } : {}),
			value: selectValue.choice,
			confidence: Math.min(confidence, selectValue.confidence),
		};
	}

	if (action === 'browser_press') {
		if (!isChoiceAnswer(pressKeys)) {
			return { kind: 'handback', reason: 'unclear', detail: 'No key was chosen.' };
		}
		return {
			kind: 'execute',
			action,
			keys: pressKeys.choice,
			confidence: Math.min(confidence, pressKeys.confidence),
		};
	}

	return { kind: 'execute', action, ...(ref ? { ref: ref.choice } : {}), confidence };
}
