import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';

import {
	FOLLOW_SCROLL_THRESHOLD_PX,
	isNearScrollEnd,
	useFollowScroll,
} from '../useFollowScroll';

/** A scrollable element with a fixed visible height; jsdom has no layout. */
function scrollable(contentHeight: number, clientHeight = 100) {
	const element = document.createElement('pre');
	let height = contentHeight;
	Object.defineProperty(element, 'scrollHeight', { get: () => height });
	Object.defineProperty(element, 'clientHeight', { get: () => clientHeight });
	return {
		element,
		grow(by: number) {
			height += by;
		},
		scrollTo(top: number) {
			element.scrollTop = top;
			element.dispatchEvent(new Event('scroll'));
		},
	};
}

function setup(contentHeight = 1000) {
	const box = scrollable(contentHeight);
	const target = ref<HTMLElement>();
	const content = ref('first');
	const scope = effectScope();
	const follow = scope.run(() => useFollowScroll(target, content));
	if (!follow) throw new Error('The scope did not run');
	return { ...box, target, content, follow, stop: () => scope.stop() };
}

describe('isNearScrollEnd', () => {
	it.each([
		[900, 1000, 100, true],
		[900 - FOLLOW_SCROLL_THRESHOLD_PX, 1000, 100, true],
		[900 - FOLLOW_SCROLL_THRESHOLD_PX - 1, 1000, 100, false],
		[0, 50, 100, true],
	])('scrollTop %i of %i with height %i is near the end: %s', (top, height, client, near) => {
		expect(isNearScrollEnd({ scrollTop: top, scrollHeight: height, clientHeight: client })).toBe(
			near,
		);
	});

	it('is true exactly when the hidden content below is within the threshold (property)', () => {
		fc.assert(
			fc.property(
				fc.nat(5000),
				fc.nat(5000),
				fc.nat(1000),
				fc.nat(200),
				(top, height, client, threshold) => {
					const below = height - top - client;
					expect(
						isNearScrollEnd({ scrollTop: top, scrollHeight: height, clientHeight: client }, threshold),
					).toBe(below <= threshold);
				},
			),
		);
	});
});

describe('useFollowScroll', () => {
	it('opens at the end of the output', async () => {
		const { element, target, follow, stop } = setup(1000);

		target.value = element;
		await nextTick();
		await nextTick();

		expect(element.scrollTop).toBe(1000);
		expect(follow.following.value).toBe(true);
		stop();
	});

	it('follows new output while the user stays at the end', async () => {
		const { element, target, content, grow, stop } = setup(1000);
		target.value = element;
		await nextTick();
		await nextTick();

		grow(500);
		content.value = 'more';
		await nextTick();

		expect(element.scrollTop).toBe(1500);
		stop();
	});

	it('stops following when the user scrolls up, and follows again at the end', async () => {
		const { element, target, content, grow, scrollTo, follow, stop } = setup(1000);
		target.value = element;
		await nextTick();
		await nextTick();

		scrollTo(200);
		grow(500);
		content.value = 'more';
		await nextTick();

		expect(follow.following.value).toBe(false);
		expect(element.scrollTop).toBe(200);

		scrollTo(1400);
		grow(100);
		content.value = 'even more';
		await nextTick();

		expect(follow.following.value).toBe(true);
		expect(element.scrollTop).toBe(1600);
		stop();
	});

	it('jumps to the end again on request, for example for another log stream', async () => {
		const { element, target, scrollTo, follow, stop } = setup(1000);
		target.value = element;
		await nextTick();
		await nextTick();
		scrollTo(0);

		await follow.followEnd();

		expect(follow.following.value).toBe(true);
		expect(element.scrollTop).toBe(1000);
		stop();
	});

	it('starts a new element at the end, even after the user scrolled the old one up', async () => {
		const { element, target, scrollTo, follow, stop } = setup(1000);
		target.value = element;
		await nextTick();
		await nextTick();
		scrollTo(0);

		const reopened = scrollable(800);
		target.value = reopened.element;
		await nextTick();
		await nextTick();

		expect(follow.following.value).toBe(true);
		expect(reopened.element.scrollTop).toBe(800);
		stop();
	});
});
