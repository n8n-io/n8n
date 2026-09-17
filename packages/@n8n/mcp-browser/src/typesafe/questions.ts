/**
 * The speculative fan-out: one request carrying the router question, every
 * branch's argument questions, and the guard nouls. Parallel questions add
 * almost no latency, so a whole action is decided in a single round trip
 * rather than a router call followed by an argument call.
 */

import {
	MAX_CHOICE_OPTIONS,
	parseOptionLabels,
	toChoiceCriteria,
	type SnapshotElement,
} from './snapshot-elements';
import type { Question, TaskBrief } from './types';

/**
 * Actions the loop can perform itself, because every argument comes from a
 * closed set the current page supplies.
 *
 * `browser_scroll` is deliberately absent: an accessibility snapshot includes
 * off-screen elements and a click scrolls its target into view, so scrolling
 * is almost never the right next action when refs are in hand — offering it
 * only invites it to be picked over the click that was actually wanted.
 */
export const EXECUTABLE_ACTIONS: Record<string, string> = {
	browser_click: 'Click an element on the page',
	browser_select: 'Pick an option in a native <select> element',
	browser_hover: 'Hover an element to reveal a menu or tooltip',
	browser_press: 'Press a key or key combination',
	browser_back: 'Go back in browser history',
	browser_reload: 'Reload the current page',
};

/**
 * Router answers that end the loop. The first two name a real next action the
 * loop cannot perform, so handing back carries a usable suggestion rather than
 * just a refusal.
 */
export const HANDBACK_ACTIONS: Record<string, string> = {
	browser_type: 'Type text into an input — the text itself still has to be written',
	browser_navigate: 'Go to a different URL — the URL still has to be chosen',
	done: 'The current step is already complete — nothing more to do here',
	escalate: 'Unclear from this page alone; a reasoning model should decide',
};

/**
 * The single question carrying the element argument.
 *
 * One shared question rather than one per action: the ref questions are all
 * answered in parallel, before the router's answer is known, so a per-action
 * phrasing never had more information to work with — and repeating the ref list
 * four times dominated the request. A 171-ref page billed ~21k of the ~32k
 * budget that way, so the token ceiling bound long before the 255-option cap.
 */
export const TARGET_REF_QUESTION = 'target_ref';

/** Actions whose argument comes from `TARGET_REF_QUESTION`. */
export const ACTIONS_TAKING_REF = new Set([
	'browser_click',
	'browser_select',
	'browser_hover',
	'browser_type',
]);

/** Keys worth offering. `browser_press` takes a string, but the useful values are few. */
export const PRESS_KEYS: Record<string, string> = {
	Enter: 'Submit or confirm',
	Escape: 'Dismiss a menu, dialog or popover',
	Tab: 'Move to the next field',
	ArrowDown: 'Move down a list',
	ArrowUp: 'Move up a list',
	'Control+A': 'Select all text in the focused field',
};

/** Guards that end the loop. Each is a probability, so code thresholds them. */
export const GUARD_QUESTIONS: Record<string, string> = {
	guard_page_loading: 'Is the page still loading, blank, or only partly rendered?',
	guard_page_error:
		'Does the page show an error, a permission denial, or a "something went wrong" state?',
	guard_auth_required:
		'Does the page require the user themselves to sign in, complete two-factor authentication, or grant consent before anything else can proceed?',
	guard_value_absent:
		'Is the information needed for the current step absent from this page, so that acting here cannot advance it?',
	guard_step_complete: 'Does the page show that the current step has already been completed?',
};

export interface BuiltRequest {
	state: Record<string, unknown>;
	questions: Record<string, Question>;
}

export function buildRequest(task: TaskBrief, elements: SnapshotElement[]): BuiltRequest {
	const questions: Record<string, Question> = {
		action: {
			type: 'choice',
			instructions:
				'Given the goal and the current page, what single next action advances the current step? Pick "escalate" when the page does not make the answer clear.',
			criteria: { ...EXECUTABLE_ACTIONS, ...HANDBACK_ACTIONS },
		},
	};

	// Speculative: answered whatever the router picks, and discarded when the
	// chosen action takes no element. A Choice needs at least one option, so it
	// is omitted for a page with no interactive elements.
	if (elements.length > 0) {
		questions[TARGET_REF_QUESTION] = {
			type: 'choice',
			instructions:
				'Which element on this page is the target of the next action — the thing to click, type into, hover, or select an option in?',
			criteria: toChoiceCriteria(elements),
		};
	}

	// An over-long option list (a timezone or country select) is left out rather
	// than truncated. `decide` then hands back when the router picks a select,
	// which is the right outcome: the wanted option might have been the one cut.
	const optionLabels = parseOptionLabels(task.snapshot);
	if (optionLabels.length > 0 && optionLabels.length <= MAX_CHOICE_OPTIONS) {
		questions.select_value = {
			type: 'choice',
			instructions: 'If the next action is selecting an option, which option should be chosen?',
			criteria: Object.fromEntries(optionLabels.map((label) => [label, null])),
		};
	}

	questions.press_keys = {
		type: 'choice',
		instructions: 'If the next action is a key press, which key?',
		criteria: PRESS_KEYS,
	};

	for (const [name, instructions] of Object.entries(GUARD_QUESTIONS)) {
		questions[name] = { type: 'noul', instructions };
	}

	return {
		state: {
			goal: task.goal,
			step: task.step,
			...(task.knownValues ? { knownValues: task.knownValues } : {}),
			...(task.recentActions?.length ? { recentActions: task.recentActions } : {}),
			page: { url: task.url, title: task.title },
			elements: elements.map((element) => ({
				ref: element.ref,
				role: element.role,
				name: element.name,
				...(element.value ? { value: element.value } : {}),
			})),
		},
		questions,
	};
}
