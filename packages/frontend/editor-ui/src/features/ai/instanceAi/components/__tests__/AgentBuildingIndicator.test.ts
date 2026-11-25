import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import AgentBuildingIndicator from '../AgentBuildingIndicator.vue';

const renderComponent = createComponentRenderer(AgentBuildingIndicator);

describe('AgentBuildingIndicator', () => {
	it('renders the building pill with its stable test id', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-agent-building-indicator')).toBeVisible();
		expect(getByTestId('instance-ai-agent-building-indicator')).toHaveAttribute('role', 'status');
	});

	it('shows only the wave when the label is off', () => {
		const { queryByTestId } = renderComponent({ props: { showLabel: false } });

		expect(queryByTestId('instance-ai-agent-building-indicator')).toBeNull();
	});
});
