import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref, computed } from 'vue';
import SetupPanelCards from '@/features/setupPanel/components/SetupPanelCards.vue';
import type {
	SetupCardItem,
	TriggerSetupState,
	CredentialTypeSetupState,
} from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';

const mockSetCredential = vi.fn();
const mockUnsetCredential = vi.fn();
const mockSetupCards = ref<SetupCardItem[]>([]);
const mockIsAllComplete = computed(
	() => mockSetupCards.value.length > 0 && mockSetupCards.value.every((c) => c.state.isComplete),
);

const mockFirstTriggerName = ref<string | null>(null);

vi.mock('../composables/useWorkflowSetupState', () => ({
	useWorkflowSetupState: () => ({
		setupCards: mockSetupCards,
		isAllComplete: mockIsAllComplete,
		setCredential: mockSetCredential,
		unsetCredential: mockUnsetCredential,
		firstTriggerName: mockFirstTriggerName,
	}),
}));

vi.mock('./cards/TriggerSetupCard.vue', () => ({
	default: {
		template:
			'<div data-test-id="trigger-setup-card">' +
			'<span data-test-id="trigger-node-name">{{ state.node.name }}</span>' +
			'</div>',
		props: ['state'],
	},
}));

vi.mock('./cards/CredentialTypeSetupCard.vue', () => ({
	default: {
		template:
			'<div data-test-id="credential-type-setup-card">' +
			'<span data-test-id="credential-type-name">{{ state.credentialDisplayName }}</span>' +
			'<button data-test-id="select-credential-btn" @click="$emit(\'credentialSelected\', { credentialType: state.credentialType, credentialId: \'cred-123\' })">Select</button>' +
			'<button data-test-id="deselect-credential-btn" @click="$emit(\'credentialDeselected\', state.credentialType)">Deselect</button>' +
			'</div>',
		props: ['state', 'firstTriggerName'],
		emits: ['credentialSelected', 'credentialDeselected'],
	},
}));

const renderComponent = createComponentRenderer(SetupPanelCards);

const createTriggerCard = (overrides: Partial<TriggerSetupState> = {}): SetupCardItem => ({
	type: 'trigger',
	state: {
		node: createTestNode({
			name: overrides.node?.name ?? 'Webhook Trigger',
			type: 'n8n-nodes-base.webhook',
		}) as INodeUi,
		isComplete: false,
		...overrides,
	},
});

const createCredentialCard = (
	overrides: Partial<CredentialTypeSetupState> = {},
): SetupCardItem => ({
	type: 'credential',
	state: {
		credentialType: 'openAiApi',
		credentialDisplayName: 'OpenAI',
		selectedCredentialId: undefined,
		issues: [],
		nodes: [
			createTestNode({
				name: 'OpenAI',
				type: 'n8n-nodes-base.openAi',
			}) as INodeUi,
		],
		isComplete: false,
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

		it('should render TriggerSetupCard for trigger cards', () => {
			mockSetupCards.value = [
				createTriggerCard({ node: createTestNode({ name: 'Webhook Trigger' }) as INodeUi }),
				createTriggerCard({ node: createTestNode({ name: 'Chat Trigger' }) as INodeUi }),
			];

			const { getAllByTestId } = renderComponent();

			const triggerCards = getAllByTestId('trigger-setup-card');
			expect(triggerCards).toHaveLength(2);

			const triggerNames = getAllByTestId('trigger-node-name');
			expect(triggerNames[0]).toHaveTextContent('Webhook Trigger');
			expect(triggerNames[1]).toHaveTextContent('Chat Trigger');
		});

		it('should render CredentialTypeSetupCard for credential cards', () => {
			mockSetupCards.value = [
				createCredentialCard({ credentialDisplayName: 'OpenAI' }),
				createCredentialCard({
					credentialType: 'slackApi',
					credentialDisplayName: 'Slack',
				}),
			];

			const { getAllByTestId } = renderComponent();

			const credentialCards = getAllByTestId('credential-type-setup-card');
			expect(credentialCards).toHaveLength(2);

			const credentialNames = getAllByTestId('credential-type-name');
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

			expect(getAllByTestId('trigger-setup-card')).toHaveLength(1);
			expect(getAllByTestId('credential-type-setup-card')).toHaveLength(2);
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

			expect(mockSetCredential).toHaveBeenCalledWith('openAiApi', 'cred-123');
		});

		it('should call unsetCredential with credentialType when credential is deselected', async () => {
			mockSetupCards.value = [createCredentialCard()];

			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('deselect-credential-btn'));

			expect(mockUnsetCredential).toHaveBeenCalledWith('openAiApi');
		});
	});
});
