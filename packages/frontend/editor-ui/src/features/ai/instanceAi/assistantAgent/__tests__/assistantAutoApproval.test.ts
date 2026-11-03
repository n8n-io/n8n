import { userEvent } from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import type { AgentsChatHostEvent, ChatMessage } from '@/features/ai/shared/agentsChat/types';

import AssistantAutoApprovalStep from '../AssistantAutoApprovalStep.vue';
import {
	ASSISTANT_AUTO_APPROVAL_EVENT,
	assistantAutoApprovalExtension,
	parseAssistantAutoApproval,
} from '../assistantAutoApproval';

function hostEvent(payload: unknown, name = ASSISTANT_AUTO_APPROVAL_EVENT): AgentsChatHostEvent {
	return { id: 'event-1', name, payload };
}

const judged = {
	toolCallId: 'call-1',
	message: 'Add 1 row\n\nRow 1: set "name" to "Jane Doe"',
	reason: 'The user asked for this row.',
	decidedBy: 'judge',
};

const message = { id: 'message-1', role: 'assistant', content: '' } as unknown as ChatMessage;

const renderStep = createComponentRenderer(AssistantAutoApprovalStep);

describe('assistantAutoApprovalExtension', () => {
	it('matches the auto-approval host event and shows it above the steps', () => {
		expect(assistantAutoApprovalExtension.matchHostEvent?.(hostEvent(judged))).toBe(true);
		expect(assistantAutoApprovalExtension.hostEventPlacement).toBe('start');
	});

	it('ignores other host events and invalid payloads', () => {
		expect(assistantAutoApprovalExtension.matchHostEvent?.(hostEvent(judged, 'tasks-update'))).toBe(
			false,
		);
		expect(parseAssistantAutoApproval(hostEvent({ toolCallId: 'call-1' }))).toBeUndefined();
	});
});

describe('AssistantAutoApprovalStep', () => {
	it('shows the first line of the action and the reason of the judge', async () => {
		const { getByTestId, getByRole, findByText } = renderStep({
			props: { event: hostEvent(judged), message },
		});

		expect(getByTestId('assistant-auto-approval').textContent).toContain(
			'Approved automatically: Add 1 row',
		);
		expect(getByTestId('assistant-auto-approval').textContent).not.toContain('Row 1');
		const toggle = getByRole('button', { name: /Approved automatically: Add 1 row/ });
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await userEvent.click(toggle);
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(await findByText('The user asked for this row.')).toBeInTheDocument();
	});

	it('explains an action that the low-risk rule approved', async () => {
		const { findByText } = renderStep({
			props: {
				event: hostEvent({ ...judged, message: 'Create folder "Reports"', decidedBy: 'rule' }),
				message,
			},
		});

		await userEvent.click(await findByText('Approved automatically: Create folder "Reports"'));
		expect(await findByText("Low-risk action that's easy to undo")).toBeInTheDocument();
	});
});
