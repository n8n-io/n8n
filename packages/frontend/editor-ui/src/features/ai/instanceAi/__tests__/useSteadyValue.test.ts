import { effectScope, nextTick, ref } from 'vue';

import { useSteadyValue } from '../composables/useSteadyValue';

interface Status {
	text: string;
	waiting?: boolean;
}

function setup(initial: Status | undefined) {
	const source = ref<Status | undefined>(initial);
	const shownTexts: Array<string | undefined> = [];
	const scope = effectScope();
	const steady = scope.run(() =>
		useSteadyValue(() => source.value, {
			key: (status) => status.text,
			urgent: (status) => status.waiting === true,
		}),
	)!;
	scope.run(() => {
		// Records every text the user would have seen.
		const stop = setInterval(() => {
			if (shownTexts.at(-1) !== steady.value?.text) shownTexts.push(steady.value?.text);
		}, 10);
		return stop;
	});
	const set = async (status: Status | undefined) => {
		source.value = status;
		await nextTick();
	};
	return { steady, set, shownTexts, scope };
}

describe('useSteadyValue', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the first value at once', () => {
		const { steady } = setup({ text: 'Searching for gmail' });

		expect(steady.value?.text).toBe('Searching for gmail');
	});

	it('keeps a value on screen for at least 1.5 seconds', async () => {
		const { steady, set } = setup({ text: 'A' });
		await vi.advanceTimersByTimeAsync(100);

		await set({ text: 'B' });
		await vi.advanceTimersByTimeAsync(1300);
		expect(steady.value?.text).toBe('A');

		await vi.advanceTimersByTimeAsync(100);
		expect(steady.value?.text).toBe('B');
	});

	it('shows a new value only once it has held for 400 ms', async () => {
		const { steady, set } = setup({ text: 'A' });
		await vi.advanceTimersByTimeAsync(2000);

		await set({ text: 'B' });
		await vi.advanceTimersByTimeAsync(300);
		expect(steady.value?.text).toBe('A');

		await vi.advanceTimersByTimeAsync(100);
		expect(steady.value?.text).toBe('B');
	});

	it('skips a value that lasts less than 400 ms', async () => {
		const { steady, set, shownTexts } = setup({ text: 'A' });
		await vi.advanceTimersByTimeAsync(2000);

		await set({ text: 'B' });
		await vi.advanceTimersByTimeAsync(200);
		await set({ text: 'C' });
		await vi.advanceTimersByTimeAsync(400);

		expect(steady.value?.text).toBe('C');
		expect(shownTexts).not.toContain('B');
	});

	it('never holds a change back for more than 3 seconds', async () => {
		const { steady, set } = setup({ text: 'A' });
		await vi.advanceTimersByTimeAsync(2000);

		for (let i = 0; i < 12; i++) {
			await set({ text: `Step ${i}` });
			await vi.advanceTimersByTimeAsync(300);
		}

		expect(steady.value?.text).not.toBe('A');
	});

	it('shows a waiting value, and the value after it, at once', async () => {
		const { steady, set } = setup({ text: 'A' });

		await set({ text: 'Waiting on your answer', waiting: true });
		expect(steady.value?.text).toBe('Waiting on your answer');

		await set({ text: 'Asking user' });
		expect(steady.value?.text).toBe('Asking user');
	});

	it('clears at once when there is no value', async () => {
		const { steady, set } = setup({ text: 'A' });

		await set(undefined);

		expect(steady.value).toBeUndefined();
	});

	it('keeps the latest object of a value with the same key', async () => {
		const { steady, set } = setup({ text: 'A' });

		await set({ text: 'A', waiting: false });

		expect(steady.value).toEqual({ text: 'A', waiting: false });
	});

	it('stops when its scope ends', async () => {
		const { steady, set, scope } = setup({ text: 'A' });
		await set({ text: 'B' });

		scope.stop();
		await vi.advanceTimersByTimeAsync(5000);

		expect(steady.value?.text).toBe('A');
	});
});
