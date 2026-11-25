import { effectScope, nextTick, ref } from 'vue';

import { useStaggeredList } from '../composables/useStaggeredList';

interface Item {
	id: string;
	label?: string;
}

function items(...ids: string[]): Item[] {
	return ids.map((id) => ({ id }));
}

function setup(initial: Item[], options: { maxDurationMs?: number } = {}) {
	const source = ref<Item[]>(initial);
	const scope = effectScope();
	const visible = scope.run(() =>
		useStaggeredList(() => source.value, {
			key: (item) => item.id,
			intervalMs: 80,
			...options,
		}),
	)!;
	const ids = () => visible.value.map((item) => item.id);
	return { source, visible, ids, scope };
}

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

describe('useStaggeredList', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockReducedMotion(false);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('shows the items one at a time, in their order', async () => {
		const { ids } = setup(items('a', 'b', 'c'));

		expect(ids()).toEqual([]);
		await vi.advanceTimersByTimeAsync(80);
		expect(ids()).toEqual(['a']);
		await vi.advanceTimersByTimeAsync(80);
		expect(ids()).toEqual(['a', 'b']);
		await vi.advanceTimersByTimeAsync(80);
		expect(ids()).toEqual(['a', 'b', 'c']);
	});

	it('staggers only the items that join later', async () => {
		const { source, ids } = setup(items('a'));
		await vi.advanceTimersByTimeAsync(80);

		source.value = items('a', 'b');
		await nextTick();

		expect(ids()).toEqual(['a']);
		await vi.advanceTimersByTimeAsync(80);
		expect(ids()).toEqual(['a', 'b']);
	});

	it('drops removed items at once', async () => {
		const { source, ids } = setup(items('a', 'b'));
		await vi.advanceTimersByTimeAsync(160);

		source.value = items('b');
		await nextTick();

		expect(ids()).toEqual(['b']);
	});

	it('shows the latest version of an item that is already shown', async () => {
		const { source, visible } = setup([{ id: 'a', label: 'old' }]);
		await vi.advanceTimersByTimeAsync(80);

		source.value = [{ id: 'a', label: 'new' }];
		await nextTick();

		expect(visible.value).toEqual([{ id: 'a', label: 'new' }]);
	});

	it('shortens the interval so a long list finishes within the maximum duration', async () => {
		const { ids } = setup(items(...Array.from({ length: 20 }, (_, i) => `n${i}`)), {
			maxDurationMs: 400,
		});

		await vi.advanceTimersByTimeAsync(400);

		expect(ids()).toHaveLength(20);
	});

	it('shows all items at once when the user prefers reduced motion', async () => {
		mockReducedMotion(true);
		const { ids } = setup(items('a', 'b', 'c'));
		await nextTick();

		expect(ids()).toEqual(['a', 'b', 'c']);
	});

	it('stops when its scope ends', async () => {
		const { ids, scope } = setup(items('a', 'b'));

		scope.stop();
		await vi.advanceTimersByTimeAsync(400);

		expect(ids()).toEqual([]);
	});
});
