import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref, computed } from 'vue';
import SetupPanelCards from './SetupPanelCards.vue';
import type { NodeSetupState } from '../setupPanel.types';
import type { INodeUi } from '@/Interface';

const mockSetCredential = vi.fn();
const mockUnsetCredential = vi.fn();
const mockNodeSetupStates = ref<NodeSetupState[]>([]);
const mockIsAllComplete = computed(
	() =>
		mockNodeSetupStates.value.length > 0 && mockNodeSetupStates.value.every((s) => s.isComplete),
);

vi.mock('../composables/useWorkflowSetupState', () => ({
	useWorkflowSetupState: () => ({
		nodeSetupStates: mockNodeSetupStates,
		isAllComplete: mockIsAllComplete,
		setCredential: mockSetCredential,
		unsetCredential: mockUnsetCredential,
	}),
}));

vi.mock('./NodeSetupCard.vue', () => ({
	default: {
		template:
			'<div data-test-id="node-setup-card">' +
			'<span data-test-id="node-name">{{ state.node.name }}</span>' +
			"<button data-test-id=\"select-credential-btn\" @click=\"$emit('credentialSelected', { credentialType: 'openAiApi', credentialId: 'cred-123' })\">Select</button>" +
			'<button data-test-id="deselect-credential-btn" @click="$emit(\'credentialDeselected\', \'openAiApi\')">Deselect</button>' +
			'</div>',
		props: ['state'],
		emits: ['credentialSelected', 'credentialDeselected'],
	},
}));

const renderComponent = createComponentRenderer(SetupPanelCards);

const createState = (overrides: Partial<NodeSetupState> = {}): NodeSetupState => {
	const node = createTestNode({
		name: overrides.node?.name ?? 'OpenAI',
		type: 'n8n-nodes-base.openAi',
		typeVersion: 1,
	}) as INodeUi;

	return {
		node,
		credentialRequirements: [
			{
				credentialType: 'openAiApi',
				credentialDisplayName: 'OpenAI',
				selectedCredentialId: undefined,
				issues: [],
				nodesWithSameCredential: ['OpenAI'],
			},
		],
		isComplete: false,
		isTrigger: true,
		...overrides,
	};
};

describe('SetupPanelCards', () => {
	beforeEach(() => {
		createTestingPinia();
		mockNodeSetupStates.value = [];
		mockSetCredential.mockReset();
		mockUnsetCredential.mockReset();
	});

	describe('empty state', () => {
		it('should render empty state when there are no node setup states', () => {
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
		it('should render card list when there are node setup states', () => {
			mockNodeSetupStates.value = [createState()];

			const { getByTestId, queryByTestId } = renderComponent();

			expect(getByTestId('setup-cards-list')).toBeInTheDocument();
			expect(queryByTestId('setup-cards-empty')).not.toBeInTheDocument();
		});

		it('should render a NodeSetupCard for each node setup state', () => {
			mockNodeSetupStates.value = [
				createState({ node: createTestNode({ name: 'OpenAI' }) as INodeUi }),
				createState({ node: createTestNode({ name: 'Slack' }) as INodeUi }),
				createState({ node: createTestNode({ name: 'Gmail' }) as INodeUi }),
			];

			const { getAllByTestId } = renderComponent();

			const cards = getAllByTestId('node-setup-card');
			expect(cards).toHaveLength(3);
		});

		it('should pass correct state to each card', () => {
			mockNodeSetupStates.value = [
				createState({ node: createTestNode({ name: 'OpenAI' }) as INodeUi }),
				createState({ node: createTestNode({ name: 'Slack' }) as INodeUi }),
			];

			const { getAllByTestId } = renderComponent();

			const nodeNames = getAllByTestId('node-name');
			expect(nodeNames[0]).toHaveTextContent('OpenAI');
			expect(nodeNames[1]).toHaveTextContent('Slack');
		});
	});

	describe('completion message', () => {
		it('should show completion message when all nodes are complete', () => {
			mockNodeSetupStates.value = [createState({ isComplete: true })];

			const { getByTestId } = renderComponent();

			expect(getByTestId('setup-cards-complete-message')).toBeInTheDocument();
		});

		it('should not show completion message when some nodes are incomplete', () => {
			mockNodeSetupStates.value = [
				createState({ isComplete: true }),
				createState({
					node: createTestNode({ name: 'Slack' }) as INodeUi,
					isComplete: false,
				}),
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
		it('should call setCredential when credential is selected on a card', async () => {
			mockNodeSetupStates.value = [createState()];

			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('select-credential-btn'));

			expect(mockSetCredential).toHaveBeenCalledWith('OpenAI', 'openAiApi', 'cred-123');
		});

		it('should call unsetCredential when credential is deselected on a card', async () => {
			mockNodeSetupStates.value = [createState()];

			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('deselect-credential-btn'));

			expect(mockUnsetCredential).toHaveBeenCalledWith('OpenAI', 'openAiApi');
		});

		it('should call setCredential with correct node name for each card', async () => {
			mockNodeSetupStates.value = [
				createState({ node: createTestNode({ name: 'OpenAI' }) as INodeUi }),
				createState({ node: createTestNode({ name: 'Slack' }) as INodeUi }),
			];

			const { getAllByTestId } = renderComponent();

			const selectButtons = getAllByTestId('select-credential-btn');
			await userEvent.click(selectButtons[1]);

			expect(mockSetCredential).toHaveBeenCalledWith('Slack', 'openAiApi', 'cred-123');
		});
	});
});
