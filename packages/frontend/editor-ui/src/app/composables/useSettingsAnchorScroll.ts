import { onBeforeUnmount, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import {
	SETTINGS_ANCHOR_REVEAL_DELAY,
	SETTINGS_ANCHOR_SCROLL_TIMEOUT,
	SETTINGS_ANCHOR_WAIT_TIMEOUT,
} from '../constants/durations';

const SCROLL_POLL_INTERVAL = 50;

/** Marks a setting that the command bar can link to. The value is unique on its page. */
export const SETTINGS_ANCHOR_ATTRIBUTE = 'data-settings-anchor';
/** Set on a setting while its arrival highlight plays. The settings layout styles it. */
export const SETTINGS_ANCHOR_HIGHLIGHT_ATTRIBUTE = 'data-settings-anchor-highlighted';

export function findSettingsAnchor(root: ParentNode, anchor: string): HTMLElement | null {
	const candidates = root.querySelectorAll<HTMLElement>(`[${SETTINGS_ANCHOR_ATTRIBUTE}]`);
	return (
		Array.from(candidates).find(
			(element) => element.getAttribute(SETTINGS_ANCHOR_ATTRIBUTE) === anchor,
		) ?? null
	);
}

async function wait(duration: number, signal: AbortSignal) {
	await new Promise<void>((resolve) => {
		const finish = () => {
			window.clearTimeout(timeout);
			signal.removeEventListener('abort', finish);
			resolve();
		};
		const timeout = window.setTimeout(finish, duration);
		signal.addEventListener('abort', finish, { once: true });
	});
}

/** Resolves when the element stops moving on screen, i.e. when the scroll to it has ended. */
async function scrollSettled(element: HTMLElement, signal: AbortSignal) {
	const deadline = Date.now() + SETTINGS_ANCHOR_SCROLL_TIMEOUT;
	let lastTop = element.getBoundingClientRect().top;
	let stableChecks = 0;

	while (stableChecks < 2 && Date.now() < deadline && !signal.aborted) {
		await wait(SCROLL_POLL_INTERVAL, signal);
		const top = element.getBoundingClientRect().top;
		stableChecks = top === lastTop ? stableChecks + 1 : 0;
		lastTop = top;
	}
}

function playHighlight(element: HTMLElement) {
	// Remove and add the attribute again so that a second reveal restarts the animation.
	element.removeAttribute(SETTINGS_ANCHOR_HIGHLIGHT_ATTRIBUTE);
	void element.offsetWidth;
	element.setAttribute(SETTINGS_ANCHOR_HIGHLIGHT_ATTRIBUTE, '');

	const onAnimationEnd = (event: AnimationEvent) => {
		// Animations of child elements bubble up to here too.
		if (event.target !== element) return;
		element.removeAttribute(SETTINGS_ANCHOR_HIGHLIGHT_ATTRIBUTE);
		element.removeEventListener('animationend', onAnimationEnd);
	};
	element.addEventListener('animationend', onAnimationEnd);
}

/**
 * Lets the page settle, scrolls the setting into the middle of the view, and plays its
 * highlight once the setting is at rest. Returns a function that cancels a pending reveal.
 */
export function revealSettingsAnchor(element: HTMLElement) {
	const controller = new AbortController();
	const { signal } = controller;

	void (async () => {
		await wait(SETTINGS_ANCHOR_REVEAL_DELAY, signal);
		if (signal.aborted || !element.isConnected) return;

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		element.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
		await scrollSettled(element, signal);
		if (signal.aborted || !element.isConnected) return;

		playHighlight(element);
	})();

	return () => controller.abort();
}

/**
 * Reveals the setting that the URL hash names, e.g. `/settings/personal#theme`.
 * Settings pages often render after their data loads, so this waits for the setting to appear.
 */
export function useSettingsAnchorScroll(container: Readonly<Ref<HTMLElement | null | undefined>>) {
	const route = useRoute();
	let stopWaiting: (() => void) | undefined;

	function revealWhenRendered(root: HTMLElement, anchor: string) {
		const existing = findSettingsAnchor(root, anchor);
		if (existing) {
			stopWaiting = revealSettingsAnchor(existing);
			return;
		}

		const observer = new MutationObserver(() => {
			const element = findSettingsAnchor(root, anchor);
			if (!element) return;
			stop();
			stopWaiting = revealSettingsAnchor(element);
		});
		const timeout = window.setTimeout(stop, SETTINGS_ANCHOR_WAIT_TIMEOUT);

		function stop() {
			observer.disconnect();
			window.clearTimeout(timeout);
			stopWaiting = undefined;
		}

		observer.observe(root, { childList: true, subtree: true });
		stopWaiting = stop;
	}

	watch(
		() => [container.value, route.path, route.hash] as const,
		([root, , hash]) => {
			stopWaiting?.();
			const anchor = decodeURIComponent(hash.replace(/^#/, ''));
			if (root && anchor) revealWhenRendered(root, anchor);
		},
		{ immediate: true, flush: 'post' },
	);

	onBeforeUnmount(() => stopWaiting?.());
}
