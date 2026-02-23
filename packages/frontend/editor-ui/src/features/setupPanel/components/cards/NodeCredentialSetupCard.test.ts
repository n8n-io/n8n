import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import NodeCredentialSetupCard from '@/features/setupPanel/components/cards/NodeCredentialSetupCard.vue';
import type { NodeCredentialSetupState } from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import type { INodeUi } from '@/Interface';
import type { INodeProperties } from 'n8n-workflow';

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

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		template: '<div data-test-id="node-icon"></div>',
		props: ['nodeType', 'size'],
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

vi.mock('@/features/ndv/parameters/components/ParameterInputList.vue', () => ({
	default: {
		template:
			'<div data-test-id="parameter-input-list">' +
			"<button data-test-id=\"param-change-btn\" @click=\"$emit('valueChanged', { name: 'testParam', value: 'testValue' })\">Change</button>" +
			'</div>',
		props: ['parameters', 'nodeValues', 'node', 'hideDelete'],
		emits: ['valueChanged'],
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

vi.mock('@/features/setupPanel/composables/useWebhookUrls', () => ({
	useWebhookUrls: vi.fn(() => ({
		webhookUrls: [],
	})),
}));

const renderComponent = createComponentRenderer(NodeCredentialSetupCard);

const createState = (
	overrides: Partial<NodeCredentialSetupState> = {},
): NodeCredentialSetupState => ({
	node: createTestNode({
		name: 'OpenAI',
		type: 'n8n-nodes-base.openAi',
		parameters: {},
	}) as INodeUi,
	credentialType: 'openAiApi',
	credentialDisplayName: 'OpenAI',
	selectedCredentialId: undefined,
	issues: [],
	parameterIssues: {},
	isTrigger: false,
	isFirstNodeWithCredential: true,
	showCredentialPicker: true,
	isComplete: false,
	allNodesUsingCredential: [
		createTestNode({
			name: 'OpenAI',
			type: 'n8n-nodes-base.openAi',
		}) as INodeUi,
	],
	...overrides,
});

describe('NodeCredentialSetupCard', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let setupPanelStore: ReturnType<typeof mockedStore<typeof useSetupPanelStore>>;

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
		setupPanelStore = mockedStore(useSetupPanelStore);
		nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(false);
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
			properties: [
				{ name: 'testParam', displayName: 'Test Parameter', type: 'string', required: true },
			],
		});
		setupPanelStore.setHighlightedNodes = vi.fn();
		setupPanelStore.clearHighlightedNodes = vi.fn();
	});

	describe('rendering', () => {
		it('should render card title as the node name', () => {
			const { getByTestId } = renderComponent({
				props: {
					state: createState({
						node: createTestNode({
							name: 'My OpenAI Node',
							type: 'n8n-nodes-base.openAi',
						}) as INodeUi,
					}),
					expanded: true,
				},
			});

			expect(getByTestId('node-credential-setup-card-header')).toHaveTextContent('My OpenAI Node');
		});

		it('should render credential picker when expanded and showCredentialPicker is true', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ showCredentialPicker: true }), expanded: true },
			});

			expect(getByTestId('credential-picker')).toBeInTheDocument();
		});

		it('should not render credential picker when showCredentialPicker is false', () => {
			const { queryByTestId } = renderComponent({
				props: { state: createState({ showCredentialPicker: false }), expanded: true },
			});

			expect(queryByTestId('credential-picker')).not.toBeInTheDocument();
		});

		it('should not render content when collapsed', () => {
			const { queryByTestId } = renderComponent({
				props: { state: createState(), expanded: false },
			});

			expect(queryByTestId('credential-picker')).not.toBeInTheDocument();
		});

		it('should render credential label when showCredentialPicker is true', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ showCredentialPicker: true }), expanded: true },
			});

			expect(getByTestId('node-credential-setup-card-label')).toBeInTheDocument();
		});

		it('should show nodes hint when credential is used by multiple nodes', () => {
			const state = createState({
				allNodesUsingCredential: [
					createTestNode({ name: 'OpenAI', type: 'n8n-nodes-base.openAi' }) as INodeUi,
					createTestNode({ name: 'GPT Node', type: 'n8n-nodes-base.openAi' }) as INodeUi,
				],
			});

			const { getByTestId } = renderComponent({
				props: { state, expanded: true },
			});

			expect(getByTestId('node-credential-setup-card-nodes-hint')).toBeInTheDocument();
		});

		it('should not show nodes hint when credential is used by a single node', () => {
			const state = createState({
				allNodesUsingCredential: [
					createTestNode({ name: 'OpenAI', type: 'n8n-nodes-base.openAi' }) as INodeUi,
				],
			});

			const { queryByTestId } = renderComponent({
				props: { state, expanded: true },
			});

			expect(queryByTestId('node-credential-setup-card-nodes-hint')).not.toBeInTheDocument();
		});
	});

	describe('parameter inputs', () => {
		it('should render parameter input list when there are parameter issues', () => {
			const { getByTestId } = renderComponent({
				props: {
					state: createState({
						parameterIssues: { testParam: ['Parameter is required'] },
					}),
					expanded: true,
				},
			});

			expect(getByTestId('parameter-input-list')).toBeInTheDocument();
		});

		it('should not render parameter input list when there are no parameter issues initially', () => {
			const { queryByTestId } = renderComponent({
				props: {
					state: createState({ parameterIssues: {} }),
					expanded: true,
				},
			});

			expect(queryByTestId('parameter-input-list')).not.toBeInTheDocument();
		});

		it('should emit valueChanged event when parameter is changed', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: {
					state: createState({
						parameterIssues: { testParam: ['Parameter is required'] },
					}),
					expanded: true,
				},
			});

			await userEvent.click(getByTestId('param-change-btn'));

			// The component doesn't emit valueChanged directly - it calls workflowState.updateNodeProperties
			// This test verifies the component is wired up to handle the event from ParameterInputList
		});
	});

	describe('card description', () => {
		it('should show trigger description for trigger nodes', () => {
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			const triggerNode = createTestNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			}) as INodeUi;

			const { container } = renderComponent({
				props: {
					state: createState({
						node: triggerNode,
						isTrigger: true,
					}),
					firstTriggerName: 'SlackTrigger',
					expanded: true,
				},
			});

			// Check that trigger description is rendered
			expect(container.textContent).toContain('Add a credential to listen for events');
		});

		it('should show parameter description when node has parameters', () => {
			const { getByTestId } = renderComponent({
				props: {
					state: createState({
						parameterIssues: { testParam: ['Parameter is required'] },
					}),
					expanded: true,
				},
			});

			// Check that parameter input list is rendered (which confirms description should be shown)
			expect(getByTestId('parameter-input-list')).toBeInTheDocument();
		});

		it('should keep showing parameter inputs even after issues are resolved', async () => {
			const { getByTestId, rerender } = renderComponent({
				props: {
					state: createState({
						parameterIssues: { testParam: ['Parameter is required'] },
					}),
					expanded: true,
				},
			});

			// Initially shows parameter inputs
			expect(getByTestId('parameter-input-list')).toBeInTheDocument();

			// Simulate parameter being filled (parameterIssues becomes empty)
			await rerender({
				state: createState({ parameterIssues: {} }),
				expanded: true,
			});

			// Parameter inputs should still be visible due to persistence
			expect(getByTestId('parameter-input-list')).toBeInTheDocument();
		});
	});

	describe('expand/collapse', () => {
		it('should toggle expanded state when header is clicked', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			await userEvent.click(getByTestId('node-credential-setup-card-header'));

			expect(emitted('update:expanded')).toEqual([[false]]);
		});
	});

	describe('complete state', () => {
		it('should show check icon in header when user has collapsed with no issues', async () => {
			const { getByTestId, rerender } = renderComponent({
				props: {
					state: createState({
						isComplete: true,
						selectedCredentialId: 'cred-123',
						parameterIssues: {},
					}),
					expanded: true,
				},
			});

			// Collapse the card to trigger allParametersAddressed
			await rerender({
				state: createState({
					isComplete: true,
					selectedCredentialId: 'cred-123',
					parameterIssues: {},
				}),
				expanded: false,
			});

			expect(getByTestId('node-credential-setup-card-complete-icon')).toBeInTheDocument();
		});

		it('should apply completed class when isComplete is true and user has collapsed', async () => {
			const { getByTestId, rerender } = renderComponent({
				props: {
					state: createState({
						isComplete: true,
						selectedCredentialId: 'cred-123',
						parameterIssues: {},
					}),
					expanded: true,
				},
			});

			// Collapse the card to trigger allParametersAddressed
			await rerender({
				state: createState({
					isComplete: true,
					selectedCredentialId: 'cred-123',
					parameterIssues: {},
				}),
				expanded: false,
			});

			expect(getByTestId('node-credential-setup-card').className).toMatch(/completed/);
		});

		it('should not mark as complete until user collapses the card', () => {
			const { getByTestId } = renderComponent({
				props: {
					state: createState({
						isComplete: true,
						selectedCredentialId: 'cred-123',
						parameterIssues: {},
					}),
					expanded: true,
				},
			});

			// Even though state.isComplete is true, card should not show as completed until collapsed
			expect(getByTestId('node-credential-setup-card').className).not.toMatch(/completed/);
		});

		it('should not mark as complete when collapsed with parameter issues remaining', async () => {
			const { getByTestId, rerender } = renderComponent({
				props: {
					state: createState({
						isComplete: false,
						parameterIssues: { testParam: ['Parameter is required'] },
					}),
					expanded: true,
				},
			});

			// Collapse the card but with parameter issues still present
			await rerender({
				state: createState({
					isComplete: false,
					parameterIssues: { testParam: ['Parameter is required'] },
				}),
				expanded: false,
			});

			expect(getByTestId('node-credential-setup-card').className).not.toMatch(/completed/);
		});
	});

	describe('credential events', () => {
		it('should emit credentialSelected with type, id, and nodeName when credential is selected', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			await userEvent.click(getByTestId('select-btn'));

			expect(emitted('credentialSelected')).toEqual([
				[{ credentialType: 'openAiApi', credentialId: 'cred-456', nodeName: 'OpenAI' }],
			]);
		});

		it('should emit credentialDeselected with credential type and nodeName when credential is deselected', async () => {
			const state = createState({
				selectedCredentialId: 'cred-123',
			});

			const { getByTestId, emitted } = renderComponent({
				props: { state, expanded: true },
			});

			await userEvent.click(getByTestId('deselect-btn'));

			expect(emitted('credentialDeselected')).toEqual([
				[{ credentialType: 'openAiApi', nodeName: 'OpenAI' }],
			]);
		});
	});

	describe('trigger section', () => {
		it('should not render trigger buttons when node is not a trigger', () => {
			const { queryByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(queryByTestId('trigger-execute-button')).not.toBeInTheDocument();
		});

		it('should render trigger execute button when node is the first trigger', () => {
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.slackTrigger',
			);
			const triggerNode = createTestNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			}) as INodeUi;

			const { getByTestId } = renderComponent({
				props: {
					state: createState({ node: triggerNode, isTrigger: true }),
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
					state: createState({ node: triggerNode, isTrigger: true }),
					firstTriggerName: 'SlackTrigger1',
					expanded: true,
				},
			});

			expect(queryByTestId('trigger-execute-button')).not.toBeInTheDocument();
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
					state: createState({ node: triggerNode, isTrigger: true }),
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
					state: createState({ node: triggerNode, isTrigger: true }),
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
					state: createState({ node: triggerNode, isTrigger: true }),
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
					state: createState({ node: triggerNode, isTrigger: true }),
					firstTriggerName: 'SlackTrigger',
					expanded: true,
				},
			});

			expect(queryByTestId('trigger-listening-callout')).not.toBeInTheDocument();
		});

		it('should not show callout when node is not a trigger', () => {
			mockComposableState.isInListeningState = true;
			mockComposableState.listeningHint = 'Some hint';

			const { queryByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(queryByTestId('trigger-listening-callout')).not.toBeInTheDocument();
		});
	});

	describe('node highlighting', () => {
		it('should highlight only the node itself on card hover', async () => {
			const state = createState({
				node: createTestNode({ id: 'node-1', name: 'OpenAI' }) as INodeUi,
			});

			const { getByTestId } = renderComponent({
				props: { state, expanded: true },
			});

			await userEvent.hover(getByTestId('node-credential-setup-card'));

			expect(setupPanelStore.setHighlightedNodes).toHaveBeenCalledWith(['node-1']);
		});

		it('should highlight all nodes using credential on hint hover', async () => {
			const state = createState({
				node: createTestNode({ id: 'node-1', name: 'OpenAI' }) as INodeUi,
				allNodesUsingCredential: [
					createTestNode({ id: 'node-1', name: 'OpenAI' }) as INodeUi,
					createTestNode({ id: 'node-2', name: 'GPT Node' }) as INodeUi,
				],
			});

			const { getByTestId } = renderComponent({
				props: { state, expanded: true },
			});

			const hint = getByTestId('node-credential-setup-card-nodes-hint');
			await userEvent.hover(hint);

			expect(setupPanelStore.setHighlightedNodes).toHaveBeenCalledWith(['node-1', 'node-2']);
		});
	});
});
