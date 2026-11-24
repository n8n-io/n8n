import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import AgentBuildingIndicator from '../AgentBuildingIndicator.vue';

const renderComponent = createComponentRenderer(AgentBuildingIndicator);

describe('AgentBuildingIndicator', () => {
	it('renders the circular running variant without the builder pill', () => {
		const { getByRole, queryByTestId } = renderComponent({
			props: { variant: 'ring', label: 'Agent is running' },
		});
		expect(getByRole('status', { name: 'Agent is running' })).toBeVisible();
		expect(queryByTestId('instance-ai-agent-building-indicator')).not.toBeInTheDocument();
	});
	it('renders the building pill with its stable test id', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-agent-building-indicator')).toBeVisible();
		expect(getByTestId('instance-ai-agent-building-indicator')).toHaveAttribute('role', 'status');
	});
});
