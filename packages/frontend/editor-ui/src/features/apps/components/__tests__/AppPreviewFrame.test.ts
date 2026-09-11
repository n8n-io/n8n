import { fireEvent } from '@testing-library/vue';

import AppPreviewFrame from '@/features/apps/components/AppPreviewFrame.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(AppPreviewFrame);

/** The test DOM never loads `srcdoc`, so the window the code is posted to is stubbed. */
const stubContentWindow = (iframe: HTMLElement) => {
	const postMessage = vi.fn();
	Object.defineProperty(iframe, 'contentWindow', { value: { postMessage } });
	return postMessage;
};

describe('AppPreviewFrame', () => {
	it('renders the empty state when html is null', () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: { html: null } });

		expect(getByTestId('app-preview-empty')).toBeInTheDocument();
		expect(queryByTestId('app-preview-iframe')).not.toBeInTheDocument();
	});

	it('renders a sandboxed iframe with the html as srcdoc', () => {
		const { getByTestId } = renderComponent({ props: { html: '<h1>Hi</h1>' } });

		const iframe = getByTestId('app-preview-iframe');
		expect(iframe.tagName).toBe('IFRAME');
		expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
		expect(iframe).toHaveAttribute('srcdoc', '<h1>Hi</h1>');
		expect(iframe).toHaveAttribute('referrerpolicy', 'no-referrer');
		// Never a REST URL: an iframe navigation can't send the browser-id header.
		expect(iframe).not.toHaveAttribute('src');
	});

	it('applies the requested width', () => {
		const { getByTestId } = renderComponent({ props: { html: '<p>x</p>', width: '390px' } });

		expect(getByTestId('app-preview-iframe')).toHaveStyle({ width: '390px' });
	});

	it('posts the one-time code to the iframe window once it has loaded, never into the html', async () => {
		const { getByTestId } = renderComponent({ props: { html: '<p>x</p>', code: 'abc123' } });
		const iframe = getByTestId('app-preview-iframe');
		const postMessage = stubContentWindow(iframe);

		expect(iframe.getAttribute('srcdoc')).not.toContain('abc123');
		expect(postMessage).not.toHaveBeenCalled();

		await fireEvent.load(iframe);

		expect(postMessage).toHaveBeenCalledWith({ type: 'n8n-app-code', code: 'abc123' }, '*');
	});

	it('posts nothing when there is no code', async () => {
		const { getByTestId } = renderComponent({ props: { html: '<p>x</p>' } });
		const iframe = getByTestId('app-preview-iframe');
		const postMessage = stubContentWindow(iframe);

		await fireEvent.load(iframe);

		expect(postMessage).not.toHaveBeenCalled();
	});
});
