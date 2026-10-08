import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { SharedCard } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import type { AssistantConfirmationInput } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import { makeProposal } from '../../components/automation/__tests__/automationProposalFixtures';
import SharedThreadCard from '../SharedThreadCard.vue';
import { provideThreadSharing } from '../useThreadSharing';
import { PROJECT_ID, TEAMMATE, THREAD_ID, setUpSharing } from './sharingFixtures';

const proposal = makeProposal();
const input: AssistantConfirmationInput = {
	requestId: 'req-1',
	message: 'Want "Morning digest" to run automatically?',
	capability: true,
	automationProposal: proposal,
};
const call: SharedCard = {
	toolName: 'propose_automation',
	input: { workflowId: proposal.workflowId },
	suspendPayload: { requestId: 'req-1', automationProposal: proposal, offered: proposal.offered },
};

function renderCard(props: { resolvedValue?: unknown; disabled?: boolean } = {}) {
	const Host = defineComponent({
		setup() {
			provideThreadSharing({ id: THREAD_ID, projectId: PROJECT_ID }, () => []);
			return () =>
				h(SharedThreadCard, { input, call, toolCallId: 'tc-1', ...props, onSubmit: vi.fn() });
		},
	});
	return createComponentRenderer(Host)();
}

// A teammate who answers an automation card sees its outcome, as the owner does.
describe('SharedThreadCard with an automation card seen by a teammate', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		setUpSharing({ shared: true, viewerId: TEAMMATE.id });
	});

	it('offers the proposal and says who the answer runs as', () => {
		const { getByTestId, queryByTestId } = renderCard();

		expect(getByTestId('automation-proposal-card')).toBeInTheDocument();
		expect(getByTestId('instance-ai-shared-card-footer')).toHaveTextContent('Runs as Alice Owner');
		expect(queryByTestId('automation-proposal-resolved')).not.toBeInTheDocument();
	});

	it('shows the outcome of the answer, without the footer', () => {
		const { getByTestId, queryByTestId } = renderCard({
			resolvedValue: { kind: 'capabilityDecision', approved: false },
			disabled: true,
		});

		expect(getByTestId('automation-proposal-resolved')).toHaveTextContent('Not automated.');
		expect(queryByTestId('automation-proposal-card')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-shared-card-footer')).not.toBeInTheDocument();
	});
});
