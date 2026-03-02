import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref, computed } from 'vue';
import SetupPanelCards from '@/features/setupPanel/components/SetupPanelCards.vue';
import type {
	SetupCardItem,
	NodeSetupState,
	SetupPanelState,
} from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';

const mockSetCredential = vi.fn();
const mockUnsetCredential = vi.fn();
const mockSetupCards = ref<SetupCardItem[]>([]);
const mockIsAllComplete = computed(
	() => mockSetupCards.value.length > 0 && mockSetupCards.value.every((c) => c.state.isComplete),
);

const mockFirstTriggerName = ref<string | null>(null);

const mockState: SetupPanelState = {
	setupCards: mockSetupCards as unknown as SetupPanelState['setupCards'],
	isAllComplete: mockIsAllComplete,
	firstTriggerName: mockFirstTriggerName as unknown as SetupPanelState['firstTriggerName'],
	setCredential: (...args: Parameters<SetupPanelState['setCredential']>) =>
		mockSetCredential(...args),
	unsetCredential: (...args: Parameters<SetupPanelState['unsetCredential']>) =>
		mockUnsetCredential(...args),
};

vi.mock('./cards/NodeSetupCard.vue', () => ({
	default: {
		template:
			'<div data-test-id="node-setup-card">' +
			'<span data-test-id="card-node-name">{{ state.node.name }}</span>' +
			'<span v-if="state.credentialDisplayName" data-test-id="card-credential-name">{{ state.credentialDisplayName }}</span>' +
			'<span v-if="stepLabel" data-test-id="card-step-label">{{ stepLabel }}</span>' +
			'<button data-test-id="select-credential-btn" @click="$emit(\'credentialSelected\', { credentialType: state.credentialType, credentialId: \'cred-123\' })">Select</button>' +
			'<button data-test-id="deselect-credential-btn" @click="$emit(\'credentialDeselected\', { credentialType: state.credentialType })">Deselect</button>' +
			'<button data-test-id="continue-btn" @click="$emit(\'continue\')">Continue</button>' +
			'</div>',
		props: ['state', 'firstTriggerName', 'expanded', 'sequential', 'stepLabel'],
		emits: ['credentialSelected', 'credentialDeselected', 'update:expanded', 'continue'],
	},
}));

const baseRenderComponent = createComponentRenderer(SetupPanelCards);
const renderComponent = (props?: Record<string, unknown>) =>
	baseRenderComponent({ props: { state: mockState, ...props } });

const createTriggerCard = (overrides: Partial<NodeSetupState> = {}): SetupCardItem => ({
	state: {
		node: createTestNode({
			name: overrides.node?.name ?? 'Webhook Trigger',
			type: 'n8n-nodes-base.webhook',
		}) as INodeUi,
		parameterIssues: {},
		isTrigger: true,
		isComplete: false,
		...overrides,
	},
});

const createCredentialCard = (overrides: Partial<NodeSetupState> = {}): SetupCardItem => ({
	state: {
		node: createTestNode({
			name: overrides.node?.name ?? 'OpenAI',
			type: 'n8n-nodes-base.openAi',
		}) as INodeUi,
		parameterIssues: {},
		isTrigger: false,
		isComplete: false,
		credentialType: 'openAiApi',
		credentialDisplayName: 'OpenAI',
		showCredentialPicker: true,
		...overrides,
	},
});

describe('SetupPanelCards', () => {
	beforeEach(() => {
		createTestingPinia();
		mockSetupCards.value = [];
		mockFirstTriggerName.value = null;
		mockSetCredential.mockReset();
		mockUnsetCredential.mockReset();
	});

	describe('empty state', () => {
		it('should render empty state when there are no setup cards', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('setup-cards-empty')).toBeInTheDocument();
		});

		it('should display empty state heading and description', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('setup-cards-empty-heading')).toBeInTheDocument();
			expect(getByTestId('setup-cards-empty-description')).toBeInTheDocument();
		});

		it('should not render card list when empty', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('setup-cards-list')).not.toBeInTheDocument();
		});
	});

	describe('card list rendering', () => {
		it('should render card list when there are setup cards', () => {
			mockSetupCards.value = [createCredentialCard()];

			const { getByTestId, queryByTestId } = renderComponent();

			expect(getByTestId('setup-cards-list')).toBeInTheDocument();
			expect(queryByTestId('setup-cards-empty')).not.toBeInTheDocument();
		});

		it('should render NodeSetupCard for trigger cards', () => {
			mockSetupCards.value = [
				createTriggerCard({ node: createTestNode({ name: 'Webhook Trigger' }) as INodeUi }),
				createTriggerCard({ node: createTestNode({ name: 'Chat Trigger' }) as INodeUi }),
			];

			const { getAllByTestId } = renderComponent();

			const cards = getAllByTestId('node-setup-card');
			expect(cards).toHaveLength(2);

			const names = getAllByTestId('card-node-name');
			expect(names[0]).toHaveTextContent('Webhook Trigger');
			expect(names[1]).toHaveTextContent('Chat Trigger');
		});

		it('should render NodeSetupCard for credential cards', () => {
			mockSetupCards.value = [
				createCredentialCard({ credentialDisplayName: 'OpenAI' }),
				createCredentialCard({
					credentialType: 'slackApi',
					credentialDisplayName: 'Slack',
				}),
			];

			const { getAllByTestId } = renderComponent();

			const cards = getAllByTestId('node-setup-card');
			expect(cards).toHaveLength(2);

			const credentialNames = getAllByTestId('card-credential-name');
			expect(credentialNames[0]).toHaveTextContent('OpenAI');
			expect(credentialNames[1]).toHaveTextContent('Slack');
		});

		it('should render both trigger and credential cards', () => {
			mockSetupCards.value = [
				createTriggerCard(),
				createCredentialCard({ credentialDisplayName: 'OpenAI' }),
				createCredentialCard({
					credentialType: 'slackApi',
					credentialDisplayName: 'Slack',
				}),
			];

			const { getAllByTestId } = renderComponent();

			expect(getAllByTestId('node-setup-card')).toHaveLength(3);
		});
	});

	describe('completion message', () => {
		it('should show completion message when all cards are complete', () => {
			mockSetupCards.value = [
				createTriggerCard({ isComplete: true }),
				createCredentialCard({ isComplete: true }),
			];

			const { getByTestId } = renderComponent();

			expect(getByTestId('setup-cards-complete-message')).toBeInTheDocument();
		});

		it('should not show completion message when some cards are incomplete', () => {
			mockSetupCards.value = [
				createTriggerCard({ isComplete: true }),
				createCredentialCard({ isComplete: false }),
			];

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('setup-cards-complete-message')).not.toBeInTheDocument();
		});

		it('should not show completion message when list is empty', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('setup-cards-complete-message')).not.toBeInTheDocument();
		});
	});

	describe('credential events', () => {
		it('should call setCredential with credentialType and credentialId when credential is selected', async () => {
			mockSetupCards.value = [createCredentialCard()];

			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('select-credential-btn'));

			expect(mockSetCredential).toHaveBeenCalledWith('openAiApi', 'cred-123', undefined);
		});

		it('should call unsetCredential with credentialType when credential is deselected', async () => {
			mockSetupCards.value = [createCredentialCard()];

			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('deselect-credential-btn'));

			expect(mockUnsetCredential).toHaveBeenCalledWith('openAiApi', undefined);
		});
	});

	describe('sequential mode', () => {
		it('should show only the first card initially when sequential is true', () => {
			mockSetupCards.value = [
				createTriggerCard({ node: createTestNode({ name: 'Trigger' }) as INodeUi }),
				createCredentialCard({
					node: createTestNode({ name: 'OpenAI' }) as INodeUi,
					credentialDisplayName: 'OpenAI',
				}),
				createCredentialCard({
					node: createTestNode({ name: 'Slack' }) as INodeUi,
					credentialType: 'slackApi',
					credentialDisplayName: 'Slack',
				}),
			];

			const { getAllByTestId } = renderComponent({ sequential: true });

			const cards = getAllByTestId('node-setup-card');
			expect(cards).toHaveLength(1);

			const names = getAllByTestId('card-node-name');
			expect(names[0]).toHaveTextContent('Trigger');
		});

		it('should advance to next card when Continue is clicked', async () => {
			mockSetupCards.value = [
				createTriggerCard({ node: createTestNode({ name: 'Trigger' }) as INodeUi }),
				createCredentialCard({
					node: createTestNode({ name: 'OpenAI' }) as INodeUi,
					credentialDisplayName: 'OpenAI',
				}),
				createCredentialCard({
					node: createTestNode({ name: 'Slack' }) as INodeUi,
					credentialType: 'slackApi',
					credentialDisplayName: 'Slack',
				}),
			];

			const { getAllByTestId } = renderComponent({ sequential: true });

			// Initially only 1 card
			expect(getAllByTestId('node-setup-card')).toHaveLength(1);

			// Click Continue on the first card
			await userEvent.click(getAllByTestId('continue-btn')[0]);

			// Now 2 cards visible
			expect(getAllByTestId('node-setup-card')).toHaveLength(2);
			const names = getAllByTestId('card-node-name');
			expect(names[0]).toHaveTextContent('Trigger');
			expect(names[1]).toHaveTextContent('OpenAI');
		});

		it('should advance through all cards via Continue', async () => {
			mockSetupCards.value = [
				createTriggerCard({ node: createTestNode({ name: 'Trigger' }) as INodeUi }),
				createCredentialCard({
					node: createTestNode({ name: 'OpenAI' }) as INodeUi,
					credentialDisplayName: 'OpenAI',
				}),
				createCredentialCard({
					node: createTestNode({ name: 'Slack' }) as INodeUi,
					credentialType: 'slackApi',
					credentialDisplayName: 'Slack',
				}),
			];

			const { getAllByTestId } = renderComponent({ sequential: true });

			// Click Continue twice to reveal all cards
			await userEvent.click(getAllByTestId('continue-btn')[0]);
			await userEvent.click(getAllByTestId('continue-btn')[1]);

			expect(getAllByTestId('node-setup-card')).toHaveLength(3);
		});

		it('should not auto-collapse cards in sequential mode when state.isComplete changes', async () => {
			mockSetupCards.value = [
				createTriggerCard({
					node: createTestNode({ name: 'Trigger' }) as INodeUi,
					isComplete: false,
				}),
				createCredentialCard({
					node: createTestNode({ name: 'OpenAI' }) as INodeUi,
					credentialDisplayName: 'OpenAI',
				}),
			];

			const { getAllByTestId } = renderComponent({ sequential: true });

			// Only 1 card visible (activeStepIndex = 0)
			expect(getAllByTestId('node-setup-card')).toHaveLength(1);

			// Simulate completion of the first card
			mockSetupCards.value[0].state.isComplete = true;
			await vi.waitFor(() => {
				// Still only 1 card visible — no auto-advance happened
				expect(getAllByTestId('node-setup-card')).toHaveLength(1);
			});
		});

		it('should render step labels in sequential mode', () => {
			mockSetupCards.value = [
				createTriggerCard({
					node: createTestNode({ name: 'Trigger' }) as INodeUi,
				}),
				createCredentialCard({
					node: createTestNode({ name: 'OpenAI' }) as INodeUi,
					credentialDisplayName: 'OpenAI',
				}),
				createCredentialCard({
					node: createTestNode({ name: 'Slack' }) as INodeUi,
					credentialType: 'slackApi',
					credentialDisplayName: 'Slack',
				}),
			];

			const { getAllByTestId } = renderComponent({ sequential: true });

			const stepLabels = getAllByTestId('card-step-label');
			expect(stepLabels).toHaveLength(1);
			expect(stepLabels[0]).toHaveTextContent('Step 1 of 3');
		});

		it('should not render step labels when sequential is false', () => {
			mockSetupCards.value = [
				createTriggerCard({
					node: createTestNode({ name: 'Trigger' }) as INodeUi,
				}),
				createCredentialCard({
					node: createTestNode({ name: 'OpenAI' }) as INodeUi,
					credentialDisplayName: 'OpenAI',
				}),
			];

			const { queryByTestId } = renderComponent({ sequential: false });

			expect(queryByTestId('card-step-label')).not.toBeInTheDocument();
		});
	});
});
