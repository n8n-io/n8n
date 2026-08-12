import { describe, it, expect } from 'vitest';
import { fireEvent } from '@testing-library/vue';

import { renderComponent } from '@/__tests__/render';
import PlanDisplayMessage from './PlanDisplayMessage.vue';
import type { PlanMode } from '../../assistant.types';

const samplePlan: PlanMode.PlanOutput = {
	summary: 'Send a daily weather alert to Slack',
	trigger: 'Runs every morning at 7 AM',
	steps: [
		{ description: 'Fetch the weather forecast for the configured city' },
		{
			description: 'Check if rain is expected',
			subSteps: ['Compare precipitation probability to threshold'],
		},
		{ description: 'Send a Slack message with the forecast summary' },
	],
	additionalSpecs: ['You will need an OpenWeatherMap API key'],
};

const sampleMessage = {
	id: 'plan-1',
	role: 'assistant',
	type: 'custom',
	customType: 'plan',
	data: { plan: samplePlan },
	read: false,
} as PlanMode.PlanMessage;

function render(
	overrides: Partial<{
		message: PlanMode.PlanMessage;
		disabled: boolean;
		showActions: boolean;
	}> = {},
) {
	return renderComponent(PlanDisplayMessage, {
		props: {
			message: overrides.message ?? sampleMessage,
			disabled: overrides.disabled ?? false,
			showActions: overrides.showActions ?? true,
		},
	});
}

describe('PlanDisplayMessage', () => {
	it('renders the plan summary', () => {
		const { getByText } = render();
		expect(getByText('Send a daily weather alert to Slack')).toBeTruthy();
	});

	it('renders the trigger description', () => {
		const { getByText } = render();
		expect(getByText('Runs every morning at 7 AM')).toBeTruthy();
	});

	it('renders all step descriptions', () => {
		const { getByText } = render();
		expect(getByText('Fetch the weather forecast for the configured city')).toBeTruthy();
		expect(getByText('Check if rain is expected')).toBeTruthy();
		expect(getByText('Send a Slack message with the forecast summary')).toBeTruthy();
	});

	it('renders sub-steps when present', () => {
		const { getByText } = render();
		expect(getByText('Compare precipitation probability to threshold')).toBeTruthy();
	});

	it('renders additional specs', () => {
		const { getByText } = render();
		expect(getByText('You will need an OpenWeatherMap API key')).toBeTruthy();
	});

	it('does not render notes section when no additionalSpecs', () => {
		const planWithoutSpecs: PlanMode.PlanMessage = {
			...sampleMessage,
			data: {
				plan: {
					...samplePlan,
					additionalSpecs: undefined,
				},
			},
		};

		const { queryByText } = render({ message: planWithoutSpecs });
		expect(queryByText('You will need an OpenWeatherMap API key')).toBeNull();
	});

	it('renders the Implement button when showActions is true', () => {
		const { getByTestId } = render();
		expect(getByTestId('plan-mode-plan-approve')).toBeTruthy();
	});

	it('does not render actions when showActions is false', () => {
		const { queryByTestId } = render({ showActions: false });
		expect(queryByTestId('plan-mode-plan-approve')).toBeNull();
	});

	it('emits approve decision on Implement click', async () => {
		const { getByTestId, emitted } = render();

		await fireEvent.click(getByTestId('plan-mode-plan-approve'));

		expect(emitted().decision).toHaveLength(1);
		expect(emitted().decision[0]).toEqual([{ action: 'approve' }]);
	});

	it('disables the button when disabled prop is true', () => {
		const { getByTestId } = render({ disabled: true });
		const button = getByTestId('plan-mode-plan-approve');
		expect(button.hasAttribute('disabled')).toBe(true);
	});

	it('renders the data-test-id on the wrapper', () => {
		const { getByTestId } = render();
		expect(getByTestId('plan-mode-plan-message')).toBeTruthy();
	});
});
