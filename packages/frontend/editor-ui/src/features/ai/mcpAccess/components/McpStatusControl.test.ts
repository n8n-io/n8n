import { within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import McpStatusControl from '@/features/ai/mcpAccess/components/McpStatusControl.vue';

const renderComponent = createComponentRenderer(McpStatusControl);

describe('McpStatusControl', () => {
	it('should render the Enabled trigger', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('mcp-status-control-trigger')).toHaveTextContent('Enabled');
	});

	it('should emit disable when the menu item is selected', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('mcp-status-control-trigger'));
		// The dropdown menu teleports to document.body.
		await waitFor(() => {
			expect(within(document.body).getByText('Disable')).toBeInTheDocument();
		});
		await userEvent.click(within(document.body).getByText('Disable'));

		expect(emitted('disable')).toHaveLength(1);
	});

	it('should disable the trigger when the user cannot toggle MCP', () => {
		const { getByTestId } = renderComponent({ props: { disabled: true } });

		expect(getByTestId('mcp-status-control-trigger')).toBeDisabled();
	});
});
