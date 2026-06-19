import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { effectScope, ref } from 'vue';
import { useCyclingExamples } from './useCyclingExamples';

describe('useCyclingExamples', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('advances on interval and wraps around', () => {
		const scope = effectScope();

		scope.run(() => {
			const { activeIndex } = useCyclingExamples(3, { intervalMs: 1000 });

			expect(activeIndex.value).toBe(0);

			vi.advanceTimersByTime(1000);
			expect(activeIndex.value).toBe(1);

			vi.advanceTimersByTime(2000);
			expect(activeIndex.value).toBe(0);
		});

		scope.stop();
	});

	it('pause stops advance, resume continues from now', () => {
		const scope = effectScope();

		scope.run(() => {
			const { activeIndex, isPaused, pause, resume } = useCyclingExamples(3, {
				intervalMs: 1000,
			});

			expect(activeIndex.value).toBe(0);

			pause();
			expect(isPaused.value).toBe(true);

			vi.advanceTimersByTime(3000);
			expect(activeIndex.value).toBe(0);

			resume();
			expect(isPaused.value).toBe(false);

			vi.advanceTimersByTime(1000);
			expect(activeIndex.value).toBe(1);
		});

		scope.stop();
	});

	it('goTo sets index immediately and re-anchors the interval', () => {
		const scope = effectScope();

		scope.run(() => {
			const { activeIndex, goTo } = useCyclingExamples(3, { intervalMs: 1000 });

			goTo(2);
			expect(activeIndex.value).toBe(2);

			vi.advanceTimersByTime(999);
			expect(activeIndex.value).toBe(2);

			vi.advanceTimersByTime(1);
			expect(activeIndex.value).toBe(0);
		});

		scope.stop();
	});

	it('peek sets index immediately and pauses (no further advance)', () => {
		const scope = effectScope();

		scope.run(() => {
			const { activeIndex, isPaused, peek } = useCyclingExamples(3, { intervalMs: 1000 });

			peek(2);
			expect(activeIndex.value).toBe(2);
			expect(isPaused.value).toBe(true);

			vi.advanceTimersByTime(3000);
			expect(activeIndex.value).toBe(2);
		});

		scope.stop();
	});

	it('accepts a reactive count ref', () => {
		const scope = effectScope();

		scope.run(() => {
			const count = ref(3);
			const { activeIndex } = useCyclingExamples(count, { intervalMs: 1000 });

			expect(activeIndex.value).toBe(0);

			vi.advanceTimersByTime(1000);
			expect(activeIndex.value).toBe(1);
		});

		scope.stop();
	});
});
