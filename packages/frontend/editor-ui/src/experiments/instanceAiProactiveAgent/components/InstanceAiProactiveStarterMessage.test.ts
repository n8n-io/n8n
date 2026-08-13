import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiProactiveStarterMessage from './InstanceAiProactiveStarterMessage.vue';

const renderComponent = createComponentRenderer(InstanceAiProactiveStarterMessage);

const PROACTIVE_MESSAGE =
	'Hey, I can build your first workflow in a few minutes. Do you know what you want to automate, or do you want help with ideas?';
const OLD_PROACTIVE_MESSAGE =
	'I can help with workflow ideas and build the workflow for you. What would you like to automate?';

describe('InstanceAiProactiveStarterMessage', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('delays, shows typing, then reveals the polished proactive assistant message', async () => {
		const { getByTestId, queryByTestId, queryByText } = renderComponent();

		expect(queryByTestId('instance-ai-proactive-starter')).not.toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(800);

		expect(getByTestId('instance-ai-proactive-starter')).toBeVisible();
		expect(getByTestId('instance-ai-proactive-typing')).toBeVisible();
		expect(queryByText(PROACTIVE_MESSAGE)).not.toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(600);

		expect(queryByTestId('instance-ai-proactive-typing')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-proactive-message')).toHaveTextContent(PROACTIVE_MESSAGE);
		expect(queryByText(OLD_PROACTIVE_MESSAGE)).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-suggestion-build-workflow')).not.toBeInTheDocument();
	});
});
