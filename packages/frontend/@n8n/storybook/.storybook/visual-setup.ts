/**
 * Setup file for the visual test projects (`vitest.visual.config.ts`).
 *
 * Only Vitest loads this file. The Storybook build must not import it, because
 * `vitest/browser` only works inside a Vitest browser run.
 */
import { isRecord } from '@n8n/utils/is-record';
import { afterEach, expect, inject } from 'vitest';
import { page, userEvent } from 'vitest/browser';

type VisualState = {
	/** Part of the screenshot name: `<story id>-<name>-<theme>`. */
	name: string;
	/** `hover` moves the real pointer over the element. `focus` moves keyboard focus to it with Tab. */
	action: 'hover' | 'focus';
	/** CSS selector for the element, inside the story canvas. */
	selector: string;
};

/** `parameters.visual` on a story or a meta. Read only by the visual test hook. */
interface VisualParameters {
	/** `canvas` (default): the story root. `viewport`: the full 1200 × 900 page, for teleported overlays. */
	target?: 'canvas' | 'viewport';
	/** One more screenshot per entry, after a real pointer or keyboard action on the element `selector` finds in the canvas. */
	states?: VisualState[];
}

type VisualStory = {
	id: string;
	parameters: { visual?: unknown };
};

/** The most Tab presses to reach a `focus` state element. */
const MAX_TAB_PRESSES = 50;

function isVisualState(value: unknown): value is VisualState {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		value.name.length > 0 &&
		(value.action === 'hover' || value.action === 'focus') &&
		typeof value.selector === 'string' &&
		value.selector.length > 0
	);
}

function isVisualParameters(value: unknown): value is VisualParameters {
	if (!isRecord(value)) return false;
	if (value.target !== undefined && value.target !== 'canvas' && value.target !== 'viewport') {
		return false;
	}
	if (value.states === undefined) return true;
	if (!Array.isArray(value.states) || !value.states.every(isVisualState)) return false;

	const names = value.states.map((state: VisualState) => state.name);
	return new Set(names).size === names.length;
}

/** A composed story is a function with `id` and `parameters` properties. */
function isVisualStory(value: unknown): value is VisualStory {
	if (typeof value !== 'function' && !isRecord(value)) return false;
	return (
		'id' in value &&
		typeof value.id === 'string' &&
		'parameters' in value &&
		isRecord(value.parameters)
	);
}

function getVisualParameters(story: VisualStory): VisualParameters {
	const visual = story.parameters.visual;
	if (visual === undefined) return {};
	if (!isVisualParameters(visual)) {
		throw new Error(
			`Story "${story.id}" has invalid \`parameters.visual\`: ${JSON.stringify(visual)}. ` +
				'Use `{ target?: "canvas" | "viewport", states?: [{ name, action: "hover" | "focus", selector }] }` with unique state names.',
		);
	}
	return visual;
}

/**
 * The element the story renders into. The Storybook test runner appends it to
 * `body` and mounts the story's Vue app on it, so it is the only `body` child
 * with `data-v-app`. Teleported overlays are other `body` children.
 */
function getCanvasElement(storyId: string): HTMLElement {
	const canvases = document.querySelectorAll<HTMLElement>('body > [data-v-app]');
	if (canvases.length !== 1) {
		throw new Error(`Expected one story canvas for "${storyId}", found ${canvases.length}.`);
	}
	return canvases[0];
}

function findStateElement(canvas: HTMLElement, storyId: string, state: VisualState): HTMLElement {
	const element = canvas.querySelector<HTMLElement>(state.selector);
	if (!element) {
		throw new Error(
			`Story "${storyId}", state "${state.name}": no element matches "${state.selector}" in the canvas.`,
		);
	}
	return element;
}

/** Real keyboard focus, so that CSS `:focus-visible` applies. */
async function focusWithKeyboard(element: HTMLElement, storyId: string, state: VisualState) {
	if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
	for (let presses = 0; presses < MAX_TAB_PRESSES; presses++) {
		await userEvent.tab();
		if (document.activeElement && element.contains(document.activeElement)) return;
	}
	throw new Error(
		`Story "${storyId}", state "${state.name}": Tab did not reach "${state.selector}" in ${MAX_TAB_PRESSES} presses.`,
	);
}

/**
 * A soft assertion: the hook takes every screenshot of the story, even after a
 * mismatch. So one run creates or reports all of them.
 */
async function matchScreenshot(
	target: VisualParameters['target'],
	canvas: HTMLElement,
	name: string,
) {
	if (target === 'viewport') {
		await expect.soft(page).toMatchScreenshot(name);
	} else {
		await expect.soft(page.elementLocator(canvas)).toMatchScreenshot(name);
	}
}

/*
 * Screenshots must not depend on timing: no transitions, no animations and no
 * blinking text caret. The style applies before each story renders.
 */
const freezeStyle = document.createElement('style');
freezeStyle.dataset.visualTests = '';
freezeStyle.textContent = `
*, *::before, *::after {
	transition: none !important;
	animation: none !important;
	caret-color: transparent !important;
}
`;
document.head.appendChild(freezeStyle);

afterEach(async (context) => {
	// Report the story's own failure, not a screenshot of a broken render.
	const state = context.task.result?.state;
	if (state === 'fail' || state === 'skip') return;

	const story: unknown = 'story' in context ? context.story : undefined;
	if (!isVisualStory(story)) {
		throw new Error(`Test "${context.task.name}" has no Storybook story to screenshot.`);
	}

	const { target = 'canvas', states = [] } = getVisualParameters(story);
	const theme = inject('visualTheme');

	const canvas = getCanvasElement(story.id);
	// Layout starts the downloads of the web fonts the story uses. Then wait for them.
	canvas.getBoundingClientRect();
	await document.fonts.ready;

	await matchScreenshot(target, canvas, `${story.id}-${theme}`);

	for (const visualState of states) {
		const element = findStateElement(canvas, story.id, visualState);
		if (visualState.action === 'hover') {
			await userEvent.hover(element);
		} else {
			await focusWithKeyboard(element, story.id, visualState);
		}

		await matchScreenshot(target, canvas, `${story.id}-${visualState.name}-${theme}`);

		if (visualState.action === 'hover') {
			await userEvent.unhover(element);
		} else {
			element.blur();
		}
	}
});
