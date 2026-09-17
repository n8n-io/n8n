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
	TARGET_REF_QUESTION,
} from './questions';
import { isChoiceAnswer, isNoulAnswer, type Answer } from './types';

/**
 * Escalate when ANY guard crosses the line, rather than combining them into
 * one score: each guard describes a different reason acting here is unsafe, so
 * averaging them would let a strong signal be diluted by four quiet ones.
 */
export const GUARD_THRESHOLD = 0.7;

/** Below this, the action is not trustworthy enough to perform unsupervised. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

export type StopReason =
	| 'low_confidence'
	| 'guard'
	| 'needs_text'
	| 'needs_url'
	| 'step_complete'
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

export function decide(
	answers: Record<string, Answer>,
	confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
): Decision {
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
			reason:
				tripped.includes('guard_step_complete') && tripped.length === 1 ? 'step_complete' : 'guard',
			detail: `Stopped on ${tripped.map((name) => name.replace('guard_', '')).join(', ')}.`,
		};
	}

	const action = router.choice;
	const refAnswer = ACTIONS_TAKING_REF.has(action) ? answers[TARGET_REF_QUESTION] : undefined;
	const ref = isChoiceAnswer(refAnswer) ? refAnswer : undefined;

	if (action === 'browser_type' || action === 'browser_navigate') {
		const isType = action === 'browser_type';
		return {
			kind: 'handback',
			reason: isType ? 'needs_text' : 'needs_url',
			detail: isType
				? `The next step is typing${ref ? ` into ${ref.choice}` : ''}, which needs text that has to be written.`
				: 'The next step is a navigation, which needs a URL that has to be chosen.',
			suggestion: { action, ...(isType && ref ? { ref: ref.choice } : {}) },
		};
	}

	if (action === 'done') {
		return { kind: 'handback', reason: 'step_complete', detail: 'The step looks complete.' };
	}

	if (!(action in EXECUTABLE_ACTIONS)) {
		return {
			kind: 'handback',
			reason: 'unclear',
			detail: 'The page does not make the next action clear.',
		};
	}

	// An action is only as trustworthy as its least certain part: one wrong
	// argument breaks it, so the minimum governs rather than a product.
	const confidence = ref ? Math.min(router.confidence, ref.confidence) : router.confidence;
	if (confidence < confidenceThreshold) {
		return {
			kind: 'handback',
			reason: 'low_confidence',
			detail: `Best guess was ${action}${ref ? ` on ${ref.choice}` : ''} at confidence ${confidence.toFixed(2)}, below the ${confidenceThreshold} bar.`,
			suggestion: { action, ...(ref ? { ref: ref.choice } : {}) },
		};
	}

	if (ACTIONS_TAKING_REF.has(action) && !ref) {
		return {
			kind: 'handback',
			reason: 'unclear',
			detail: `${action} needs an element but no element was chosen.`,
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
