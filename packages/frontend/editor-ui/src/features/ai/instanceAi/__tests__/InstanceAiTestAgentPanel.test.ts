import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiTestAgentPanel from '../components/InstanceAiTestAgentPanel.vue';

const renderComponent = createComponentRenderer(InstanceAiTestAgentPanel);

describe('InstanceAiTestAgentPanel', () => {
	it('renders the suggestion with both actions', () => {
		const { getByTestId } = renderComponent();

		const panel = getByTestId('instance-ai-test-agent-panel');
		expect(panel).toHaveTextContent('Test your agent');
		expect(panel).toHaveTextContent(
			"I'll draft a handful of realistic requests, run them through your agent",
		);
		expect(getByTestId('instance-ai-test-agent-generate')).toHaveTextContent('Generate test cases');
		expect(getByTestId('instance-ai-test-agent-dismiss')).toHaveTextContent('Maybe later');
	});

	it('emits generate when the CTA is clicked', async () => {
		const user = userEvent.setup();
		const { emitted, getByTestId } = renderComponent();

		await user.click(getByTestId('instance-ai-test-agent-generate'));

		expect(emitted().generate).toEqual([[]]);
		expect(emitted().dismiss).toBeUndefined();
	});

	it('emits dismiss when the suggestion is declined', async () => {
		const user = userEvent.setup();
		const { emitted, getByTestId } = renderComponent();

		await user.click(getByTestId('instance-ai-test-agent-dismiss'));

		expect(emitted().dismiss).toEqual([[]]);
		expect(emitted().generate).toBeUndefined();
	});
});
