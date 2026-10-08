import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import { makeProposal } from '@/features/ai/instanceAi/components/automation/__tests__/automationProposalFixtures';
import { ASSISTANT_CONFIRMATION_TOOL_NAME } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';
import InteractiveCard from '../components/interactive/InteractiveCard.vue';
// Load the on-demand card up front, so that the test does not wait for its first transform.
import '@/features/ai/instanceAi/sharing/SharedThreadCard.vue';

const renderCard = createComponentRenderer(InteractiveCard, { pinia: createTestingPinia() });

function automationPayload(overrides: Partial<InteractivePayload> = {}): InteractivePayload {
	return {
		toolName: ASSISTANT_CONFIRMATION_TOOL_NAME,
		toolCallId: 'tc-1',
		runId: 'run-1',
		input: {
			requestId: 'r-1',
			message: 'Want "Morning digest" to run automatically?',
			capability: true,
			automationProposal: makeProposal(),
		},
		...overrides,
	} as InteractivePayload;
}

// The Assistant card loads on demand, through the wrapper for shared chats.
describe('InteractiveCard with an automation card', () => {
	it('hands the answer of a resolved card to the Assistant card, which shows the outcome', async () => {
		const { findByTestId, queryByTestId } = renderCard({
			props: {
				payload: automationPayload({
					resolvedAt: 1,
					resolvedValue: { kind: 'capabilityDecision', approved: false },
				}),
			},
		});
		await flushPromises();

		expect(await findByTestId('automation-proposal-resolved')).toHaveTextContent('Not automated.');
		expect(queryByTestId('automation-proposal-card')).not.toBeInTheDocument();
	});

	it('renders the open card while the card has no answer', async () => {
		const { findByTestId, queryByTestId } = renderCard({ props: { payload: automationPayload() } });
		await flushPromises();

		expect(await findByTestId('automation-proposal-card')).toBeInTheDocument();
		expect(queryByTestId('automation-proposal-resolved')).not.toBeInTheDocument();
	});
});
