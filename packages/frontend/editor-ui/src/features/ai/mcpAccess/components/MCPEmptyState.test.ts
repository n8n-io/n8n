import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import MCPEmptyState from '@/features/ai/mcpAccess/components/MCPEmptyState.vue';

const renderComponent = createComponentRenderer(MCPEmptyState);

describe('MCPEmptyState', () => {
	it('should render the design-system empty state with the MCP icon cards and both actions', () => {
		const { getByTestId, container } = renderComponent();

		const emptyState = getByTestId('mcp-empty-state-container');
		expect(emptyState).toHaveClass('n8n-empty-state');
		expect(emptyState).toHaveTextContent('Connect AI assistants to build and run workflows');
		// The centre card carries the MCP mark; the side cards render the client brand marks.
		expect(container.querySelector('[data-icon="mcp"]')).toBeInTheDocument();
		expect(getByTestId('mcp-empty-state-learn-more')).toHaveAttribute('target', '_blank');
		expect(getByTestId('enable-mcp-access-button')).toBeEnabled();
	});

	it('should emit turnOnMcp when the enable button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('enable-mcp-access-button'));

		expect(emitted('turnOnMcp')).toHaveLength(1);
	});

	it.each([
		['disabled', { disabled: true }],
		['loading', { loading: true }],
	])('should disable the enable button when %s', (_, props) => {
		const { getByTestId } = renderComponent({ props });

		expect(getByTestId('enable-mcp-access-button')).toBeDisabled();
	});
});
