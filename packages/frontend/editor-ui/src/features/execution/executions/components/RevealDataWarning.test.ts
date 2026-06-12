import { createComponentRenderer } from '@/__tests__/render';
import RevealDataWarning from './RevealDataWarning.vue';

const renderComponent = createComponentRenderer(RevealDataWarning);

describe('RevealDataWarning', () => {
	it('should render warning content and docs link', () => {
		const { getByText, getByTestId } = renderComponent({
			props: {
				warning: 'Warning text',
				logged: 'Logged item',
				legitimate: 'Legitimate item',
				policy: 'Policy item',
			},
		});

		expect(getByText('Warning text')).toBeInTheDocument();
		expect(getByTestId('reveal-data-warning-docs-link').closest('a')).toHaveAttribute(
			'href',
			'https://docs.n8n.io/workflows/executions/execution-data-redaction/',
		);
	});
});
