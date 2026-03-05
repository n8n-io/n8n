import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import CredentialTypeSetupCard from '@/features/setupPanel/components/cards/CredentialTypeSetupCard.vue';
import type { CredentialTypeSetupState } from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeUi } from '@/Interface';

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

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: {
		template: '<div data-test-id="credential-icon"></div>',
		props: ['credentialTypeName', 'size'],
	},
}));

vi.mock('../TriggerExecuteButton.vue', () => ({
	default: {
		template:
			'<button data-test-id="trigger-execute-button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
		props: ['label', 'icon', 'disabled', 'loading', 'tooltipItems'],
		emits: ['click'],
	},
}));

const { mockExecute, mockComposableState } = vi.hoisted(() => ({
	mockExecute: vi.fn(),
	mockComposableState: {
		isExecuting: false,
		isButtonDisabled: false,
		label: 'Test node',
		buttonIcon: 'flask-conical' as const,
		tooltipItems: [] as string[],
		isInListeningState: false,
		listeningHint: '',
	},
}));

vi.mock('@/features/setupPanel/composables/useTriggerExecution', async () => {
	const { computed } = await import('vue');
	return {
		useTriggerExecution: vi.fn(() => ({
			isExecuting: computed(() => mockComposableState.isExecuting),
			isButtonDisabled: computed(() => mockComposableState.isButtonDisabled),
			label: computed(() => mockComposableState.label),
			buttonIcon: computed(() => mockComposableState.buttonIcon),
			tooltipItems: computed(() => mockComposableState.tooltipItems),
			execute: mockExecute,
			isInListeningState: computed(() => mockComposableState.isInListeningState),
			listeningHint: computed(() => mockComposableState.listeningHint),
		})),
	};
});

const renderComponent = createComponentRenderer(CredentialTypeSetupCard);

const createState = (
	overrides: Partial<CredentialTypeSetupState> = {},
): CredentialTypeSetupState => ({
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
});

describe('CredentialTypeSetupCard', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		mockExecute.mockClear();
		mockComposableState.isExecuting = false;
		mockComposableState.isButtonDisabled = false;
		mockComposableState.label = 'Test node';
		mockComposableState.buttonIcon = 'flask-conical';
		mockComposableState.tooltipItems = [];
		mockComposableState.isInListeningState = false;
		mockComposableState.listeningHint = '';
		createTestingPinia();
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(false);
	});

	describe('rendering', () => {
		it('should render card title as the first node name', () => {
			const { getByTestId } = renderComponent({
				props: {
					state: createState({
						nodes: [
							createTestNode({ name: 'OpenAI', type: 'n8n-nodes-base.openAi' }) as INodeUi,
							createTestNode({ name: 'GPT Node', type: 'n8n-nodes-base.openAi' }) as INodeUi,
						],
					}),
					expanded: true,
				},
			});

			expect(getByTestId('credential-type-setup-card-header')).toHaveTextContent('OpenAI');
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

		it('should render credential label', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getByTestId('credential-type-setup-card-label')).toBeInTheDocument();
		});

		it('should show nodes hint when credential is used by multiple nodes', () => {
			const state = createState({
				nodes: [
					createTestNode({ name: 'OpenAI', type: 'n8n-nodes-base.openAi' }) as INodeUi,
					createTestNode({ name: 'GPT Node', type: 'n8n-nodes-base.openAi' }) as INodeUi,
				],
			});

			const { getByTestId } = renderComponent({
				props: { state, expanded: true },
			});

			expect(getByTestId('credential-type-setup-card-nodes-hint')).toBeInTheDocument();
		});

		it('should not show nodes hint when credential is used by a single node', () => {
			const state = createState();

			const { queryByTestId } = renderComponent({
				props: { state, expanded: true },
			});

			expect(queryByTestId('credential-type-setup-card-nodes-hint')).not.toBeInTheDocument();
		});
	});

	describe('expand/collapse', () => {
		it('should toggle expanded state when header is clicked', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			await userEvent.click(getByTestId('credential-type-setup-card-header'));

			expect(emitted('update:expanded')).toEqual([[false]]);
		});

		// Auto-collapse on completion and initial-collapse-if-complete
		// are handled by the parent (SetupPanelCards) which owns expanded state.
	});

	describe('complete state', () => {
		it('should show check icon in header when collapsed and complete', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ isComplete: true }), expanded: false },
			});

			expect(getByTestId('credential-type-setup-card-complete-icon')).toBeInTheDocument();
		});

		it('should apply completed class when isComplete is true', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ isComplete: true }), expanded: false },
			});

			expect(getByTestId('credential-type-setup-card').className).toMatch(/completed/);
		});
	});

	describe('credential events', () => {
		it('should emit credentialSelected with type and id when credential is selected', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			await userEvent.click(getByTestId('select-btn'));

			expect(emitted('credentialSelected')).toEqual([
				[{ credentialType: 'openAiApi', credentialId: 'cred-456' }],
			]);
		});

		it('should emit credentialDeselected with credential type when credential is deselected', async () => {
			const state = createState({
				selectedCredentialId: 'cred-123',
			});

			const { getByTestId, emitted } = renderComponent({
				props: { state, expanded: true },
			});

			await userEvent.click(getByTestId('deselect-btn'));

			expect(emitted('credentialDeselected')).toEqual([['openAiApi']]);
		});
	});

	describe('trigger section', () => {
		it('should not render trigger buttons when there are no trigger nodes', () => {
			const { queryByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(queryByTestId('trigger-execute-button')).not.toBeInTheDocument();
		});

		it('should render trigger execute button when firstTriggerName matches a trigger in nodes', () => {
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.slackTrigger',
			);
			const triggerNode = createTestNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			}) as INodeUi;

			const { getByTestId } = renderComponent({
				props: {
					state: createState({ nodes: [triggerNode] }),
					firstTriggerName: 'SlackTrigger',
					expanded: true,
				},
			});

			expect(getByTestId('trigger-execute-button')).toBeInTheDocument();
		});

		it('should not render trigger execute button when firstTriggerName does not match', () => {
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.slackTrigger',
			);
			const triggerNode = createTestNode({
				name: 'SlackTrigger2',
				type: 'n8n-nodes-base.slackTrigger',
			}) as INodeUi;

			const { queryByTestId } = renderComponent({
				props: {
					state: createState({ nodes: [triggerNode] }),
					firstTriggerName: 'SlackTrigger1',
					expanded: true,
				},
			});

			expect(queryByTestId('trigger-execute-button')).not.toBeInTheDocument();
		});

		it('should only render execute button for the first trigger even with multiple trigger nodes', () => {
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.slackTrigger',
			);
			const trigger1 = createTestNode({
				name: 'Trigger1',
				type: 'n8n-nodes-base.slackTrigger',
			}) as INodeUi;
			const trigger2 = createTestNode({
				name: 'Trigger2',
				type: 'n8n-nodes-base.slackTrigger',
			}) as INodeUi;

			const { getAllByTestId } = renderComponent({
				props: {
					state: createState({ nodes: [trigger1, trigger2] }),
					firstTriggerName: 'Trigger1',
					expanded: true,
				},
			});

			expect(getAllByTestId('trigger-execute-button')).toHaveLength(1);
		});

		it('should not render trigger buttons when collapsed', () => {
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.slackTrigger',
			);
			const triggerNode = createTestNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			}) as INodeUi;

			const { queryByTestId } = renderComponent({
				props: {
					state: createState({ nodes: [triggerNode] }),
					firstTriggerName: 'SlackTrigger',
					expanded: false,
				},
			});

			expect(queryByTestId('trigger-execute-button')).not.toBeInTheDocument();
		});

		it('should not render trigger buttons when firstTriggerName is null', () => {
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.slackTrigger',
			);
			const triggerNode = createTestNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			}) as INodeUi;

			const { queryByTestId } = renderComponent({
				props: {
					state: createState({ nodes: [triggerNode] }),
					firstTriggerName: null,
					expanded: true,
				},
			});

			expect(queryByTestId('trigger-execute-button')).not.toBeInTheDocument();
		});
	});

	describe('listening callout', () => {
		it('should show callout when trigger node is listening', () => {
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.slackTrigger',
			);
			mockComposableState.isInListeningState = true;
			mockComposableState.listeningHint = 'Go to Slack and create an event';

			const triggerNode = createTestNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			}) as INodeUi;

			const { getByTestId } = renderComponent({
				props: {
					state: createState({ nodes: [triggerNode] }),
					firstTriggerName: 'SlackTrigger',
					expanded: true,
				},
			});

			const callout = getByTestId('trigger-listening-callout');
			expect(callout).toBeInTheDocument();
			expect(callout).toHaveTextContent('Go to Slack and create an event');
		});

		it('should not show callout when not listening', () => {
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.slackTrigger',
			);
			const triggerNode = createTestNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			}) as INodeUi;

			const { queryByTestId } = renderComponent({
				props: {
					state: createState({ nodes: [triggerNode] }),
					firstTriggerName: 'SlackTrigger',
					expanded: true,
				},
			});

			expect(queryByTestId('trigger-listening-callout')).not.toBeInTheDocument();
		});

		it('should not show callout when there is no trigger node', () => {
			mockComposableState.isInListeningState = true;
			mockComposableState.listeningHint = 'Some hint';

			const { queryByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(queryByTestId('trigger-listening-callout')).not.toBeInTheDocument();
		});
	});
});
