import { effectScope, ref } from 'vue';

import { useDelayedLoading } from './useDelayedLoading';

describe(useDelayedLoading, () => {
	let scope: ReturnType<typeof effectScope>;

	beforeEach(() => {
		vi.useFakeTimers();
		scope = effectScope();
	});

	afterEach(() => {
		scope.stop();
		vi.useRealTimers();
	});

	it('restarts the delay when loading stops and starts again', () => {
		const loading = ref(true);
		const revealed = scope.run(() => useDelayedLoading(loading))!;
		vi.advanceTimersByTime(200);
		loading.value = false;
		loading.value = true;
		vi.advanceTimersByTime(299);
		expect(revealed.value).toBe(false);
		vi.advanceTimersByTime(1);
		expect(revealed.value).toBe(true);
		loading.value = false;
		expect(revealed.value).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('does not schedule feedback until loading starts', () => {
		const loading = ref(false);
		const revealed = scope.run(() => useDelayedLoading(() => loading.value))!;
		expect(vi.getTimerCount()).toBe(0);
		loading.value = true;
		vi.advanceTimersByTime(300);
		expect(revealed.value).toBe(true);
	});

	it('cancels pending feedback when its scope is disposed', () => {
		const revealed = scope.run(() => useDelayedLoading(true))!;
		scope.stop();
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(300);
		expect(revealed.value).toBe(false);
	});

	it('applies a changed delay and supports immediate feedback', () => {
		const delay = ref(300);
		const revealed = scope.run(() => useDelayedLoading(true, delay))!;
		vi.advanceTimersByTime(100);
		delay.value = 500;
		vi.advanceTimersByTime(300);
		expect(revealed.value).toBe(false);
		delay.value = 0;
		expect(revealed.value).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});
});
