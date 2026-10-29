import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';

import PreferenceContentCell from './PreferenceContentCell.vue';

const render = createComponentRenderer(PreferenceContentCell);

class ResizeObserverStub {
	observe = vi.fn();

	unobserve = vi.fn();

	disconnect = vi.fn();
}

/** jsdom has no layout, so the clamp is simulated through the two heights. */
function setHeights(el: HTMLElement, scrollHeight: number, clientHeight: number) {
	Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
	Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
}

const LONG = 'A long preference that runs past two lines.';

describe('PreferenceContentCell', () => {
	beforeEach(() => {
		vi.stubGlobal('ResizeObserver', ResizeObserverStub);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('renders the text', () => {
		const { getByTestId } = render({ props: { content: 'Keep replies short.' } });

		expect(getByTestId('preference-content')).toHaveTextContent('Keep replies short.');
	});

	it('shows the full text in a tooltip when the clamp hides some of it', async () => {
		const { getByTestId, rerender, getAllByText } = render({ props: { content: 'Short.' } });
		const el = getByTestId('preference-content');
		setHeights(el, 120, 40);
		await rerender({ content: LONG });

		await userEvent.hover(el);
		// The tooltip mounts the text at least once more than the clamped cell does.
		await vi.waitFor(() => expect(getAllByText(LONG).length).toBeGreaterThan(1));
	});

	it('shows no tooltip when the text fits', async () => {
		const { getByTestId, rerender, getAllByText } = render({ props: { content: 'Short.' } });
		const el = getByTestId('preference-content');
		setHeights(el, 40, 40);
		await rerender({ content: LONG });

		await userEvent.hover(el);
		await new Promise((resolve) => setTimeout(resolve, 700));
		expect(getAllByText(LONG)).toHaveLength(1);
	});
});
