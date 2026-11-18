import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent, waitFor } from '@testing-library/vue';

import ClippedContent from './ClippedContent.vue';

const CLIP_HEIGHT = 128;

const renderClippedContent = createComponentRenderer(ClippedContent);

/** Gives the clip a fixed height and the content the given height. jsdom has no layout. */
function mockHeights(contentHeight: number): void {
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
		this: HTMLElement,
	) {
		return this.getAttribute('aria-hidden') === 'true' ? CLIP_HEIGHT : contentHeight;
	});
}

/** Reports one resize as soon as an element is observed. */
class ImmediateResizeObserver {
	constructor(private readonly onResize: () => void) {}

	observe(): void {
		this.onResize();
	}

	disconnect(): void {}
}

describe('ClippedContent', () => {
	beforeEach(() => {
		vi.stubGlobal('ResizeObserver', ImmediateResizeObserver);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('shows short content without a button', () => {
		mockHeights(CLIP_HEIGHT);

		const wrapper = renderClippedContent({ slots: { default: 'Short text' } });

		expect(wrapper.getByTestId('clipped-content')).toHaveTextContent('Short text');
		expect(wrapper.queryByTestId('clipped-content-toggle')).not.toBeInTheDocument();
	});

	it('shows the rest of long content, then clips it again', async () => {
		mockHeights(CLIP_HEIGHT + 1);

		const wrapper = renderClippedContent({ slots: { default: 'Long text' } });

		const toggle = await wrapper.findByTestId('clipped-content-toggle');
		expect(toggle).toHaveTextContent('Show more');
		expect(toggle).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(toggle);
		expect(toggle).toHaveTextContent('Show less');
		expect(toggle).toHaveAttribute('aria-expanded', 'true');

		await fireEvent.click(toggle);
		expect(toggle).toHaveTextContent('Show more');
	});

	it('shows the rest of long content when the focus enters it', async () => {
		mockHeights(CLIP_HEIGHT + 1);

		const wrapper = renderClippedContent({ slots: { default: '<input />' } });

		const toggle = await wrapper.findByTestId('clipped-content-toggle');
		await fireEvent.focusIn(wrapper.getByRole('textbox'));

		await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'true'));
	});
});
