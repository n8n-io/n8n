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
		expect(getByText('Logged item')).toBeInTheDocument();
		expect(getByText('Legitimate item')).toBeInTheDocument();
		expect(getByText('Policy item')).toBeInTheDocument();

		const link = getByTestId('reveal-data-warning-docs-link').closest('a');
		expect(link).toHaveAttribute(
			'href',
			'https://docs.n8n.io/workflows/executions/execution-data-redaction/',
		);
		expect(link).toHaveAttribute('target', '_blank');
	});
});
