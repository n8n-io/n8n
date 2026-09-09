import AppPreviewFrame from '@/features/apps/components/AppPreviewFrame.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(AppPreviewFrame);

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
});
