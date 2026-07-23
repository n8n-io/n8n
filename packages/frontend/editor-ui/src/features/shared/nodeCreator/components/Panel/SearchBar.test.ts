import { fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { DEBOUNCE_TIME } from '@/app/constants';

import SearchBar from './SearchBar.vue';

const renderComponent = createComponentRenderer(SearchBar, {
	global: {
		stubs: {
			N8nIcon: { template: '<span />', props: ['icon', 'size'] },
		},
	},
});

const getInput = (container: HTMLElement) =>
	container.querySelector<HTMLInputElement>('[data-test-id="node-creator-search-bar"]')!;

describe('SearchBar', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('emits the search value once the user stops typing', async () => {
		const { container, emitted } = renderComponent();
		const input = getInput(container);

		await fireEvent.update(input, 'http');
		// Nothing is emitted while the user is still typing.
		expect(emitted()['update:modelValue']).toBeUndefined();

		vi.advanceTimersByTime(DEBOUNCE_TIME.INPUT.SEARCH);
		expect(emitted()['update:modelValue']).toEqual([['http']]);
	});

	it('collapses rapid typing into a single search', async () => {
		const { container, emitted } = renderComponent();
		const input = getInput(container);

		await fireEvent.update(input, 'h');
		await fireEvent.update(input, 'ht');
		await fireEvent.update(input, 'htt');
		await fireEvent.update(input, 'http');

		vi.advanceTimersByTime(DEBOUNCE_TIME.INPUT.SEARCH);
		expect(emitted()['update:modelValue']).toEqual([['http']]);
	});

	it('keeps the typed text visible before the search runs', async () => {
		const { container, emitted } = renderComponent();
		const input = getInput(container);

		await fireEvent.update(input, 'http');
		await nextTick();

		// The field shows the text immediately, even though the search has not run yet.
		expect(input.value).toBe('http');
		expect(emitted()['update:modelValue']).toBeUndefined();
	});

	it('clears immediately and cancels a pending search when cleared', async () => {
		const { container, emitted, getByTestId } = renderComponent();
		const input = getInput(container);

		await fireEvent.update(input, 'http');
		await nextTick();

		await fireEvent.click(getByTestId('node-creator-search-clear'));
		// Clearing emits an empty value right away, without waiting for the debounce.
		expect(emitted()['update:modelValue']).toEqual([['']]);

		// The pending search from the earlier typing must not fire afterwards.
		vi.advanceTimersByTime(DEBOUNCE_TIME.INPUT.SEARCH);
		expect(emitted()['update:modelValue']).toEqual([['']]);
		expect(input.value).toBe('');
	});
});
