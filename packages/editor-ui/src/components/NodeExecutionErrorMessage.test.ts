import { describe, it, expect } from 'vitest';
import NodeExecutionErrorMessage from '@/components/NodeExecutionErrorMessage.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(NodeExecutionErrorMessage);

describe('NodeExecutionErrorMessage', () => {
	it('renders the component', () => {
		const { getByTestId } = renderComponent({
			props: {
				nodeName: 'Test Node',
				errorMessage: 'An error occurred',
			},
		});
		expect(getByTestId('sanitized-error-message')).toHaveTextContent('An error occurred');
	});

	it('renders sanitized HTML in error message', () => {
		const { getByTestId } = renderComponent({
			props: {
				nodeName: 'Test Node',
				errorMessage:
					'Insufficient quota detected. <a href="https://docs.n8n.io/" target="_blank">Learn more</a>',
			},
		});
		expect(getByTestId('sanitized-error-message')).toContainHTML(
			'Insufficient quota detected. <a href="https://docs.n8n.io/" target="_blank">Learn more</a>',
		);
	});

	it('renders the link with the correct text', () => {
		const { getByText } = renderComponent({
			props: {
				nodeName: 'Test Node',
				errorMessage: 'An error occurred',
			},
		});
		expect(getByText('Open node')).toBeTruthy();
	});

	it('renders the link with the correct data attributes', () => {
		const { getByText } = renderComponent({
			props: {
				nodeName: 'Test Node',
				errorMessage: 'An error occurred',
			},
		});
		const link = getByText('Open node');
		expect(link.getAttribute('data-action')).toBe('openNodeDetail');
		expect(link.getAttribute('data-action-parameter-node')).toBe('Test Node');
	});

	it('does not render error message when it is not provided', () => {
		const { queryByText } = renderComponent({
			props: {
				nodeName: 'Test Node',
			},
		});
		expect(queryByText('An error occurred')).not.toBeInTheDocument();
	});

	it('sanitizes malicious script in error message', () => {
		const { getByTestId } = renderComponent({
			props: {
				nodeName: 'Test Node',
				errorMessage: '<img src=x onerror=alert(1)>',
			},
		});
		expect(getByTestId('sanitized-error-message')).toContainHTML('<img src="x">');
	});

	it('sanitizes malicious script in error message with nested tags', () => {
		const { getByTestId } = renderComponent({
			props: {
				nodeName: 'Test Node',
				errorMessage: '<div><img src=x onerror=alert(1)></div>',
			},
		});
		expect(getByTestId('sanitized-error-message')).toContainHTML('<div><img src="x"></div>');
	});

	it('sanitizes malicious script in error message with script tag', () => {
		const { container } = renderComponent({
			props: {
				nodeName: 'Test Node',
				errorMessage: '<script>alert(1)</script>',
			},
		});
		expect(container.querySelector('script')).not.toBeInTheDocument();
	});
});
