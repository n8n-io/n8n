import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import NodeSetupCard from './NodeSetupCard.vue';
import type { NodeSetupState } from '../setupPanel.types';
import type { INodeUi } from '@/Interface';

const { mockExecute, mockComposableState } = vi.hoisted(() => ({
	mockExecute: vi.fn(),
	mockComposableState: {
		isExecuting: false,
		hasIssues: false,
		disabledReason: '',
	},
}));

vi.mock('@/app/composables/useNodeExecution', async () => {
	const { ref, computed } = await import('vue');
	return {
		useNodeExecution: vi.fn(() => ({
			isExecuting: computed(() => mockComposableState.isExecuting),
			isListening: ref(false),
			isListeningForWorkflowEvents: ref(false),
			buttonLabel: ref('Test node'),
			buttonIcon: ref('flask-conical'),
			disabledReason: computed(() => mockComposableState.disabledReason),
			isTriggerNode: ref(false),
			hasIssues: computed(() => mockComposableState.hasIssues),
			shouldGenerateCode: ref(false),
			execute: mockExecute,
			stopExecution: vi.fn(),
		})),
	};
});

vi.mock('@/features/credentials/components/CredentialPicker/CredentialPicker.vue', () => ({
	default: {
		template:
			'<div data-test-id="credential-picker">' +
			'<button data-test-id="select-btn" @click="$emit(\'credentialSelected\', \'cred-456\')">Select</button>' +
			'<button data-test-id="deselect-btn" @click="$emit(\'credentialDeselected\')">Deselect</button>' +
			'</div>',
		props: ['appName', 'credentialType', 'selectedCredentialId', 'createButtonVariant'],
		emits: ['credentialSelected', 'credentialDeselected'],
	},
}));

const renderComponent = createComponentRenderer(NodeSetupCard);

const createState = (overrides: Partial<NodeSetupState> = {}): NodeSetupState => {
	const node = createTestNode({
		name: 'OpenAI',
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

describe('NodeSetupCard', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		mockExecute.mockClear();
		mockComposableState.isExecuting = false;
		mockComposableState.hasIssues = false;
		mockComposableState.disabledReason = '';
		createTestingPinia();
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(
			mockNodeTypeDescription({
				name: 'n8n-nodes-base.openAi',
				displayName: 'OpenAI',
			}),
		);
	});

	describe('rendering', () => {
		it('should render node name in header', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getByTestId('node-setup-card-header')).toHaveTextContent('OpenAI');
		});

		it('should render credential picker when expanded', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getByTestId('credential-picker')).toBeInTheDocument();
		});

		it('should not render content when collapsed', () => {
			const { queryByTestId } = renderComponent({
				props: { state: createState(), expanded: false },
			});

			expect(queryByTestId('credential-picker')).not.toBeInTheDocument();
		});

		it('should render credential label for each requirement', () => {
			const { getAllByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getAllByTestId('node-setup-card-credential-label')).toHaveLength(1);
		});

		it('should render multiple credential requirements', () => {
			const state = createState({
				credentialRequirements: [
					{
						credentialType: 'openAiApi',
						credentialDisplayName: 'OpenAI',
						selectedCredentialId: undefined,
						issues: [],
						nodesWithSameCredential: ['OpenAI'],
					},
					{
						credentialType: 'googleApi',
						credentialDisplayName: 'Google',
						selectedCredentialId: undefined,
						issues: [],
						nodesWithSameCredential: ['OpenAI'],
					},
				],
			});

			const { getAllByTestId } = renderComponent({
				props: { state, expanded: true },
			});

			expect(getAllByTestId('credential-picker')).toHaveLength(2);
			expect(getAllByTestId('node-setup-card-credential-label')).toHaveLength(2);
		});

		it('should show shared nodes hint when credential is used by multiple nodes', () => {
			const state = createState({
				credentialRequirements: [
					{
						credentialType: 'openAiApi',
						credentialDisplayName: 'OpenAI',
						selectedCredentialId: undefined,
						issues: [],
						nodesWithSameCredential: ['OpenAI', 'GPT Node'],
					},
				],
			});

			const { getByTestId } = renderComponent({
				props: { state, expanded: true },
			});

			expect(getByTestId('node-setup-card-shared-nodes-hint')).toBeInTheDocument();
		});

		it('should not show shared nodes hint when credential is used by single node', () => {
			const state = createState({
				credentialRequirements: [
					{
						credentialType: 'openAiApi',
						credentialDisplayName: 'OpenAI',
						selectedCredentialId: undefined,
						issues: [],
						nodesWithSameCredential: ['OpenAI'],
					},
				],
			});

			const { queryByTestId } = renderComponent({
				props: { state, expanded: true },
			});

			expect(queryByTestId('node-setup-card-shared-nodes-hint')).not.toBeInTheDocument();
		});

		it('should apply no-content class when there are no credential requirements', () => {
			const { getByTestId } = renderComponent({
				props: {
					state: createState({ credentialRequirements: [], isTrigger: true }),
					expanded: true,
				},
			});

			expect(getByTestId('node-setup-card').className).toMatch(/no-content/);
		});

		it('should not apply no-content class when there are credential requirements', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getByTestId('node-setup-card').className).not.toMatch(/no-content/);
		});

		it('should show footer for non-complete trigger nodes', () => {
			const { getByTestId } = renderComponent({
				props: {
					state: createState({ isTrigger: true, isComplete: false }),
					expanded: true,
				},
			});

			expect(getByTestId('node-setup-card-test-button')).toBeInTheDocument();
		});

		it('should not show footer for non-trigger non-complete nodes', () => {
			const { queryByTestId } = renderComponent({
				props: {
					state: createState({ isTrigger: false, isComplete: false }),
					expanded: true,
				},
			});

			expect(queryByTestId('node-setup-card-test-button')).not.toBeInTheDocument();
		});
	});

	describe('expand/collapse', () => {
		it('should toggle expanded state when header is clicked', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			await userEvent.click(getByTestId('node-setup-card-header'));

			expect(emitted('update:expanded')).toEqual([[false]]);
		});

		it('should emit expand when clicking collapsed card header', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { state: createState(), expanded: false },
			});

			await userEvent.click(getByTestId('node-setup-card-header'));

			expect(emitted('update:expanded')).toEqual([[true]]);
		});

		it('should auto-collapse when isComplete changes to true', async () => {
			const state = createState({ isComplete: false });
			const { emitted, rerender } = renderComponent({
				props: { state, expanded: true },
			});

			await rerender({ state: { ...state, isComplete: true }, expanded: true });

			await waitFor(() => {
				expect(emitted('update:expanded')).toEqual([[false]]);
			});
		});

		it('should start collapsed when mounted with isComplete true', () => {
			const { emitted } = renderComponent({
				props: { state: createState({ isComplete: true }), expanded: true },
			});

			expect(emitted('update:expanded')).toEqual([[false]]);
		});
	});

	describe('complete state', () => {
		it('should show check icon in header when collapsed and complete', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ isComplete: true }), expanded: false },
			});

			expect(getByTestId('node-setup-card-complete-icon')).toBeInTheDocument();
		});

		it('should apply completed class when isComplete is true', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ isComplete: true }), expanded: false },
			});

			expect(getByTestId('node-setup-card').className).toMatch(/completed/);
		});

		it('should not apply completed class when isComplete is false', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ isComplete: false }), expanded: false },
			});

			expect(getByTestId('node-setup-card').className).not.toMatch(/completed/);
		});
	});

	describe('test button', () => {
		it('should render test button for trigger nodes when expanded', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ isTrigger: true }), expanded: true },
			});

			expect(getByTestId('node-setup-card-test-button')).toBeInTheDocument();
		});

		it('should not render test button for non-trigger nodes', () => {
			const { queryByTestId } = renderComponent({
				props: { state: createState({ isTrigger: false }), expanded: true },
			});

			expect(queryByTestId('node-setup-card-test-button')).not.toBeInTheDocument();
		});

		it('should disable test button when node has issues', () => {
			mockComposableState.hasIssues = true;

			const { getByTestId } = renderComponent({
				props: { state: createState({ isTrigger: true }), expanded: true },
			});

			expect(getByTestId('node-setup-card-test-button')).toBeDisabled();
		});

		it('should disable test button when node is executing', () => {
			mockComposableState.isExecuting = true;

			const { getByTestId } = renderComponent({
				props: { state: createState({ isTrigger: true }), expanded: true },
			});

			expect(getByTestId('node-setup-card-test-button')).toBeDisabled();
		});

		it('should enable test button when node has no issues and is not executing', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ isTrigger: true }), expanded: true },
			});

			expect(getByTestId('node-setup-card-test-button')).not.toBeDisabled();
		});
	});

	describe('credential events', () => {
		it('should emit credentialSelected when credential is selected', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			await userEvent.click(getByTestId('select-btn'));

			expect(emitted('credentialSelected')).toEqual([
				[{ credentialType: 'openAiApi', credentialId: 'cred-456' }],
			]);
		});

		it('should emit credentialDeselected when credential is deselected', async () => {
			const state = createState({
				credentialRequirements: [
					{
						credentialType: 'openAiApi',
						credentialDisplayName: 'OpenAI',
						selectedCredentialId: 'cred-123',
						issues: [],
						nodesWithSameCredential: ['OpenAI'],
					},
				],
			});

			const { getByTestId, emitted } = renderComponent({
				props: { state, expanded: true },
			});

			await userEvent.click(getByTestId('deselect-btn'));

			expect(emitted('credentialDeselected')).toEqual([['openAiApi']]);
		});
	});

	describe('test node execution', () => {
		it('should call execute when test button is clicked', async () => {
			const state = createState({ isComplete: true, isTrigger: true });

			// Mount collapsed with isComplete: true, then expand via header click
			const { getByTestId } = renderComponent({
				props: { state, expanded: false },
			});
			await userEvent.click(getByTestId('node-setup-card-header'));

			const testButton = getByTestId('node-setup-card-test-button');
			await userEvent.click(testButton);

			expect(mockExecute).toHaveBeenCalledTimes(1);
		});
	});
});
