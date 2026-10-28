import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import OnboardingExampleCard from '../OnboardingExampleCard.vue';
import type { PendingConfirmationItem, ThreadRuntime } from '../../instanceAi.store';
import {
	createThreadComponentRenderer,
	makeThread,
} from '../../__tests__/createThreadComponentRenderer';

const nodes = [
	{
		name: 'Every day at 09:00',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.2,
		explanation: 'Starts it.',
	},
	{
		name: 'Read BBC News',
		type: 'n8n-nodes-base.rssFeedRead',
		typeVersion: 1.2,
		explanation: 'Reads it.',
	},
];

const exampleQuestion = {
	toolCall: {
		confirmation: {
			requestId: 'onboarding-example~abc',
			questions: [
				{
					id: 'example',
					question: 'What do you want to do next?',
					type: 'single',
					options: ['Build this for me', 'Build something else'],
				},
			],
		},
	},
} as unknown as PendingConfirmationItem;

let thread: ThreadRuntime;
const renderComponent = createThreadComponentRenderer(OnboardingExampleCard, {}, () => thread);

describe('OnboardingExampleCard', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		thread = makeThread();
		thread.pendingConfirmations = [exampleQuestion];
		// Like the real thread: resolving drops the question from the pending list.
		vi.mocked(thread.resolveConfirmation).mockImplementation(() => {
			thread.pendingConfirmations = [];
		});
	});

	it('shows the choices only on the last node, and Skip goes there', async () => {
		const { getByText, queryByText, getByTestId } = renderComponent({ props: { nodes } });

		expect(queryByText('Build this for me')).toBeNull();
		await userEvent.click(getByTestId('onboarding-example-skip'));

		expect(getByText('Build this for me')).toBeVisible();
	});

	it('names each node button and marks the current step', async () => {
		const { getByRole } = renderComponent({ props: { nodes } });

		const first = getByRole('button', { name: 'Every day at 09:00' });
		expect(first).toHaveAttribute('aria-current', 'step');
		expect(getByRole('button', { name: 'Read BBC News' })).not.toHaveAttribute('aria-current');
	});

	it('moves the current step with Next', async () => {
		const { getByRole } = renderComponent({ props: { nodes } });

		await userEvent.click(getByRole('button', { name: 'Next' }));

		expect(getByRole('button', { name: 'Read BBC News' })).toHaveAttribute('aria-current', 'step');
		expect(getByRole('button', { name: 'Every day at 09:00' })).not.toHaveAttribute('aria-current');
	});

	it('hides Skip once the user chose', () => {
		thread.pendingConfirmations = [];
		const { queryByTestId } = renderComponent({ props: { nodes } });

		expect(queryByTestId('onboarding-example-skip')).toBeNull();
	});

	it('answers the example question with the picked option', async () => {
		const { getByText, getByTestId } = renderComponent({ props: { nodes } });

		await userEvent.click(getByTestId('onboarding-example-skip'));
		await userEvent.click(getByText('Build this for me'));

		expect(thread.resolveConfirmation).toHaveBeenCalledWith('onboarding-example~abc', 'approved');
		expect(thread.confirmAction).toHaveBeenCalledWith('onboarding-example~abc', {
			kind: 'questions',
			answers: [{ questionId: 'example', selectedOptions: ['Build this for me'] }],
		});
	});
});
