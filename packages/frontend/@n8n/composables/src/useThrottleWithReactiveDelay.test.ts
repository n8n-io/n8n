import { nextTick, ref } from 'vue';

import { useThrottleWithReactiveDelay } from './useThrottleWithReactiveDelay';

describe(useThrottleWithReactiveDelay, () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return throttled ref with initial value', () => {
		const state = ref('initial');
		const delay = ref(100);
		const throttled = useThrottleWithReactiveDelay(state, delay);

		expect(throttled.value).toBe('initial');
	});

	it('should throttle state updates', async () => {
		const state = ref('initial');
		const delay = ref(100);
		const throttled = useThrottleWithReactiveDelay(state, delay);

		state.value = 'updated';
		await nextTick();
		expect(throttled.value).toBe('initial');

		vi.advanceTimersByTime(100);
		await nextTick();
		expect(throttled.value).toBe('updated');
	});

	it('should respect reactive delay changes', async () => {
		const state = ref('initial');
		const delay = ref(100);
		const throttled = useThrottleWithReactiveDelay(state, delay);

		delay.value = 200;
		state.value = 'updated';
		await nextTick();

		vi.advanceTimersByTime(100);
		await nextTick();
		expect(throttled.value).toBe('initial');

		vi.advanceTimersByTime(100);
		await nextTick();
		expect(throttled.value).toBe('updated');
	});
});
