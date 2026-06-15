import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import CanvasSearch from './CanvasSearch.vue';

const renderComponent = createComponentRenderer(CanvasSearch, {
	pinia: createTestingPinia(),
	props: {
		modelValue: '',
		caseSensitive: false,
		useRegex: false,
		matchCount: 0,
		activeMatchIndex: -1,
		regexError: null,
	},
});

describe('CanvasSearch', () => {
	it('renders the search input and option toggles', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('canvas-search-input')).toBeInTheDocument();
		expect(getByTestId('canvas-search-case-sensitive')).toBeInTheDocument();
		expect(getByTestId('canvas-search-regex')).toBeInTheDocument();
	});

	it('emits update:caseSensitive when the match-case toggle is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();
		await fireEvent.click(getByTestId('canvas-search-case-sensitive'));
		expect(emitted('update:caseSensitive')).toEqual([[true]]);
	});

	it('emits update:useRegex when the regex toggle is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();
		await fireEvent.click(getByTestId('canvas-search-regex'));
		expect(emitted('update:useRegex')).toEqual([[true]]);
	});

	it('emits navigation and close events from the action buttons', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { matchCount: 3 } });
		await fireEvent.click(getByTestId('canvas-search-next'));
		await fireEvent.click(getByTestId('canvas-search-previous'));
		await fireEvent.click(getByTestId('canvas-search-close'));
		expect(emitted('next')).toHaveLength(1);
		expect(emitted('previous')).toHaveLength(1);
		expect(emitted('close')).toHaveLength(1);
	});

	it('hides navigation buttons when there is at most one match', () => {
		const { queryByTestId } = renderComponent({ props: { matchCount: 1 } });
		expect(queryByTestId('canvas-search-previous')).toBeNull();
		expect(queryByTestId('canvas-search-next')).toBeNull();
	});

	it('shows navigation buttons when there are multiple matches', () => {
		const { getByTestId } = renderComponent({ props: { matchCount: 3 } });
		expect(getByTestId('canvas-search-previous')).toBeInTheDocument();
		expect(getByTestId('canvas-search-next')).toBeInTheDocument();
	});

	it('navigates with Enter / Shift+Enter and closes on Escape', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { matchCount: 2 } });
		const input = getByTestId('canvas-search-input');

		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(emitted('next')).toHaveLength(1);

		await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
		expect(emitted('previous')).toHaveLength(1);

		await fireEvent.keyDown(input, { key: 'Escape' });
		expect(emitted('close')).toHaveLength(1);
	});

	it('closes on a second Cmd/Ctrl+F while focused', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { matchCount: 2 } });
		await fireEvent.keyDown(getByTestId('canvas-search-input'), {
			key: 'f',
			ctrlKey: true,
			metaKey: true,
		});
		expect(emitted('close')).toHaveLength(1);
	});

	it('hides the match count (so the panel can shrink) when the query is empty', () => {
		const { queryByTestId } = renderComponent({ props: { modelValue: '' } });
		expect(queryByTestId('canvas-search-count')).toBeNull();
	});

	it('shows "0 of N" before navigation has started', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: 'http', matchCount: 3, activeMatchIndex: -1 },
		});
		expect(getByTestId('canvas-search-count')).toHaveTextContent('0 of 3');
	});

	it('shows the current position while navigating', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: 'http', matchCount: 3, activeMatchIndex: 1 },
		});
		expect(getByTestId('canvas-search-count')).toHaveTextContent('2 of 3');
	});

	it('shows "0 of 0" when the query matches nothing', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: 'nothing', matchCount: 0 },
		});
		expect(getByTestId('canvas-search-count')).toHaveTextContent('0 of 0');
	});

	it('surfaces an invalid regex error', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: '[', useRegex: true, regexError: 'Invalid' },
		});
		expect(getByTestId('canvas-search-count')).toHaveTextContent('Invalid regex');
	});
});
