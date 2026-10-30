import { effectScope, nextTick, ref } from 'vue';

import { useTypewriter } from '../composables/useTypewriter';

function mockReducedMotion(reduce: boolean) {
	vi.stubGlobal(
		'matchMedia',
		vi.fn((query: string) => ({
			matches: reduce && query.includes('prefers-reduced-motion'),
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			onchange: null,
			dispatchEvent: vi.fn(),
		})),
	);
}

function setup(initial: string) {
	const text = ref(initial);
	const scope = effectScope();
	const typed = scope.run(() => useTypewriter(() => text.value, { charMs: 20 }))!;
	return { text, typed, scope };
}

describe('useTypewriter', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockReducedMotion(false);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('types the text one character at a time', async () => {
		const { typed } = setup('gmail');

		expect(typed.value).toBe('');
		await vi.advanceTimersByTimeAsync(40);
		expect(typed.value).toBe('gm');
		await vi.advanceTimersByTimeAsync(60);
		expect(typed.value).toBe('gmail');
	});

	it('types a new text from the start', async () => {
		const { text, typed } = setup('gmail');
		await vi.advanceTimersByTimeAsync(100);

		text.value = 'http';
		await nextTick();

		expect(typed.value).toBe('');
		await vi.advanceTimersByTimeAsync(80);
		expect(typed.value).toBe('http');
	});

	it('shows the whole text at once when the user prefers reduced motion', async () => {
		mockReducedMotion(true);
		const { typed } = setup('gmail');
		await nextTick();

		expect(typed.value).toBe('gmail');
	});

	it('stops when its scope ends', async () => {
		const { typed, scope } = setup('gmail');

		scope.stop();
		await vi.advanceTimersByTimeAsync(100);

		expect(typed.value).toBe('');
	});
});
