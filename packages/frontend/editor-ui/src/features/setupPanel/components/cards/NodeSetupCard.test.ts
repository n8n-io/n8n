import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import NodeSetupCard from '@/features/setupPanel/components/cards/NodeSetupCard.vue';
import type { NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import type { INodeUi } from '@/Interface';

vi.mock('@/features/credentials/components/NodeCredentials.vue', () => ({
	default: {
		template:
			'<div data-test-id="node-credentials">' +
			'<slot name="label-postfix" />' +
			'<button data-test-id="select-btn" @click="onSelect">Select</button>' +
			'<button data-test-id="deselect-btn" @click="onDeselect">Deselect</button>' +
			'</div>',
		props: ['node', 'overrideCredType', 'readonly', 'showAll', 'hideIssues'],
		emits: ['credentialSelected'],
		setup(
			props: {
				node: { name: string; credentials?: Record<string, unknown> };
				overrideCredType: string;
			},
			{ emit }: { emit: (event: string, payload: unknown) => void },
		) {
			return {
				onSelect: () =>
					emit('credentialSelected', {
						name: props.node.name,
						properties: {
							credentials: {
								[props.overrideCredType]: { id: 'cred-456', name: 'Test Credential' },
							},
						},
					}),
				onDeselect: () =>
					emit('credentialSelected', {
						name: props.node.name,
						properties: { credentials: {} },
					}),
			};
		},
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

const renderComponent = createComponentRenderer(NodeSetupCard);

const createCredentialState = (overrides: Partial<NodeSetupState> = {}): NodeSetupState => ({
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

const createParameterOnlyState = (overrides: Partial<NodeSetupState> = {}): NodeSetupState => ({
	node: createTestNode({
		name: 'Code',
		type: 'n8n-nodes-base.code',
		parameters: {},
	}) as INodeUi,
	parameterIssues: {},
	isTrigger: false,
	isComplete: false,
	...overrides,
});

describe('NodeSetupCard', () => {
	const WORKFLOW_ID = 'test-workflow';
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
		const workflowsStore = useWorkflowsStore();
		workflowsStore.workflow.id = WORKFLOW_ID;
		nodeTypesStore = mockedStore(useNodeTypesStore);
		setupPanelStore = mockedStore(useSetupPanelStore);
		nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(false);
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
			properties: [
				{ name: 'testParam', displayName: 'Test Parameter', type: 'string', required: true },
			],
			outputs: ['main'],
		});
		setupPanelStore.setHighlightedNodes = vi.fn();
		setupPanelStore.clearHighlightedNodes = vi.fn();
	});

	describe('credential mode', () => {
		describe('rendering', () => {
			it('should render card title as the node name', () => {
				const { getByTestId } = renderComponent({
					props: {
						state: createCredentialState({
							node: createTestNode({
								name: 'My OpenAI Node',
								type: 'n8n-nodes-base.openAi',
							}) as INodeUi,
						}),
						expanded: true,
					},
				});

				expect(getByTestId('node-setup-card-header')).toHaveTextContent('My OpenAI Node');
			});

			it('should render credential picker when expanded and showCredentialPicker is true', () => {
				const { getByTestId } = renderComponent({
					props: { state: createCredentialState({ showCredentialPicker: true }), expanded: true },
				});

				expect(getByTestId('node-credentials')).toBeInTheDocument();
			});

			it('should not render credential picker when showCredentialPicker is false', () => {
				const { queryByTestId } = renderComponent({
					props: { state: createCredentialState({ showCredentialPicker: false }), expanded: true },
				});

				expect(queryByTestId('node-credentials')).not.toBeInTheDocument();
			});

			it('should not render content when collapsed', () => {
				const { queryByTestId } = renderComponent({
					props: { state: createCredentialState(), expanded: false },
				});

				expect(queryByTestId('node-credentials')).not.toBeInTheDocument();
			});

			it('should render credential section when showCredentialPicker is true', () => {
				const { getByTestId } = renderComponent({
					props: { state: createCredentialState({ showCredentialPicker: true }), expanded: true },
				});

				expect(getByTestId('node-credentials')).toBeInTheDocument();
			});

			it('should show nodes hint when credential is used by multiple nodes', () => {
				const state = createCredentialState({
					allNodesUsingCredential: [
						createTestNode({ name: 'OpenAI', type: 'n8n-nodes-base.openAi' }) as INodeUi,
						createTestNode({ name: 'GPT Node', type: 'n8n-nodes-base.openAi' }) as INodeUi,
					],
				});

				const { getByTestId } = renderComponent({
					props: { state, expanded: true },
				});

				expect(getByTestId('node-setup-card-nodes-hint')).toBeInTheDocument();
			});

			it('should not show nodes hint when credential is used by a single node', () => {
				const state = createCredentialState({
					allNodesUsingCredential: [
						createTestNode({ name: 'OpenAI', type: 'n8n-nodes-base.openAi' }) as INodeUi,
					],
				});

				const { queryByTestId } = renderComponent({
					props: { state, expanded: true },
				});

				expect(queryByTestId('node-setup-card-nodes-hint')).not.toBeInTheDocument();
			});
		});

		describe('parameter inputs', () => {
			it('should render parameter input list when there are parameter issues', () => {
				const { getByTestId } = renderComponent({
					props: {
						state: createCredentialState({
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
						state: createCredentialState({ parameterIssues: {} }),
						expanded: true,
					},
				});

				expect(queryByTestId('parameter-input-list')).not.toBeInTheDocument();
			});

			it('should call workflowDocumentStore.updateNodeProperties when parameter is changed', async () => {
				const { getByTestId } = renderComponent({
					props: {
						state: createCredentialState({
							parameterIssues: { testParam: ['Parameter is required'] },
						}),
						expanded: true,
					},
				});

				await userEvent.click(getByTestId('param-change-btn'));

				const workflowDocumentStore = useWorkflowDocumentStore(
					createWorkflowDocumentId(WORKFLOW_ID),
				);
				expect(workflowDocumentStore.updateNodeProperties).toHaveBeenCalledWith({
					name: 'OpenAI',
					properties: {
						parameters: {
							testParam: 'testValue',
						},
					},
				});
			});

			it('should keep showing parameter inputs even after issues are resolved', async () => {
				const { getByTestId, rerender } = renderComponent({
					props: {
						state: createCredentialState({
							parameterIssues: { testParam: ['Parameter is required'] },
						}),
						expanded: true,
					},
				});

				expect(getByTestId('parameter-input-list')).toBeInTheDocument();

				await rerender({
					state: createCredentialState({ parameterIssues: {} }),
					expanded: true,
				});

				expect(getByTestId('parameter-input-list')).toBeInTheDocument();
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
						state: createCredentialState({
							node: triggerNode,
							isTrigger: true,
						}),
						firstTriggerName: 'SlackTrigger',
						expanded: true,
					},
				});

				expect(container.textContent).toContain('Add a credential to listen for events');
			});

			it('should show parameter description when node has parameters', () => {
				const { getByTestId } = renderComponent({
					props: {
						state: createCredentialState({
							parameterIssues: { testParam: ['Parameter is required'] },
						}),
						expanded: true,
					},
				});

				expect(getByTestId('parameter-input-list')).toBeInTheDocument();
			});
		});

		describe('expand/collapse', () => {
			it('should toggle expanded state when header is clicked', async () => {
				const { getByTestId, emitted } = renderComponent({
					props: { state: createCredentialState(), expanded: true },
				});

				await userEvent.click(getByTestId('node-setup-card-header'));

				expect(emitted('update:expanded')).toEqual([[false]]);
			});
		});

		describe('complete state', () => {
			it('should show check icon in header when user has collapsed with no issues', async () => {
				const { getByTestId, rerender } = renderComponent({
					props: {
						state: createCredentialState({
							isComplete: true,
							selectedCredentialId: 'cred-123',
							parameterIssues: {},
						}),
						expanded: true,
					},
				});

				await rerender({
					state: createCredentialState({
						isComplete: true,
						selectedCredentialId: 'cred-123',
						parameterIssues: {},
					}),
					expanded: false,
				});

				expect(getByTestId('node-setup-card-complete-icon')).toBeInTheDocument();
			});

			it('should apply completed class when isComplete is true and user has collapsed', async () => {
				const { getByTestId, rerender } = renderComponent({
					props: {
						state: createCredentialState({
							isComplete: true,
							selectedCredentialId: 'cred-123',
							parameterIssues: {},
						}),
						expanded: true,
					},
				});

				await rerender({
					state: createCredentialState({
						isComplete: true,
						selectedCredentialId: 'cred-123',
						parameterIssues: {},
					}),
					expanded: false,
				});

				expect(getByTestId('node-setup-card').className).toMatch(/completed/);
			});

			it('should not mark as complete until user collapses the card', async () => {
				const { getByTestId, rerender } = renderComponent({
					props: {
						state: createCredentialState({
							isComplete: false,
							selectedCredentialId: 'cred-123',
							parameterIssues: { testParam: ['Parameter is required'] },
						}),
						expanded: true,
					},
				});

				// Resolve parameter issues while card stays expanded
				await rerender({
					state: createCredentialState({
						isComplete: true,
						selectedCredentialId: 'cred-123',
						parameterIssues: {},
					}),
					expanded: true,
				});

				expect(getByTestId('node-setup-card').className).not.toMatch(/completed/);
			});

			it('should not mark as complete when collapsed with parameter issues remaining', async () => {
				const { getByTestId, rerender } = renderComponent({
					props: {
						state: createCredentialState({
							isComplete: false,
							parameterIssues: { testParam: ['Parameter is required'] },
						}),
						expanded: true,
					},
				});

				await rerender({
					state: createCredentialState({
						isComplete: false,
						parameterIssues: { testParam: ['Parameter is required'] },
					}),
					expanded: false,
				});

				expect(getByTestId('node-setup-card').className).not.toMatch(/completed/);
			});
		});

		describe('credential events', () => {
			it('should emit credentialSelected with type, id, and nodeName when credential is selected', async () => {
				const { getByTestId, emitted } = renderComponent({
					props: { state: createCredentialState(), expanded: true },
				});

				await userEvent.click(getByTestId('select-btn'));

				expect(emitted('credentialSelected')).toEqual([
					[{ credentialType: 'openAiApi', credentialId: 'cred-456', nodeName: 'OpenAI' }],
				]);
			});

			it('should emit credentialDeselected with credential type and nodeName when credential is deselected', async () => {
				const state = createCredentialState({
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
			it('should render execute button for non-trigger nodes', () => {
				const { getByTestId } = renderComponent({
					props: { state: createCredentialState({ isComplete: false }), expanded: true },
				});

				expect(getByTestId('trigger-execute-button')).toBeInTheDocument();
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
						state: createCredentialState({ node: triggerNode, isTrigger: true }),
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
						state: createCredentialState({ node: triggerNode, isTrigger: true }),
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
						state: createCredentialState({ node: triggerNode, isTrigger: true }),
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
						state: createCredentialState({ node: triggerNode, isTrigger: true }),
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
						state: createCredentialState({ node: triggerNode, isTrigger: true }),
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
						state: createCredentialState({ node: triggerNode, isTrigger: true }),
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
					props: { state: createCredentialState(), expanded: true },
				});

				expect(queryByTestId('trigger-listening-callout')).not.toBeInTheDocument();
			});
		});

		describe('node highlighting', () => {
			it('should highlight only the node itself on card hover', async () => {
				const node = createTestNode({ id: 'node-1', name: 'OpenAI' }) as INodeUi;
				const state = createCredentialState({
					node,
					allNodesUsingCredential: [node],
				});

				const { getByTestId } = renderComponent({
					props: { state, expanded: true },
				});

				await userEvent.hover(getByTestId('node-setup-card'));

				expect(setupPanelStore.setHighlightedNodes).toHaveBeenCalledWith(['node-1']);
			});

			it('should highlight all nodes using credential on hint hover', async () => {
				const state = createCredentialState({
					node: createTestNode({ id: 'node-1', name: 'OpenAI' }) as INodeUi,
					allNodesUsingCredential: [
						createTestNode({ id: 'node-1', name: 'OpenAI' }) as INodeUi,
						createTestNode({ id: 'node-2', name: 'GPT Node' }) as INodeUi,
					],
				});

				const { getByTestId } = renderComponent({
					props: { state, expanded: true },
				});

				const hint = getByTestId('node-setup-card-nodes-hint');
				await userEvent.hover(hint);

				expect(setupPanelStore.setHighlightedNodes).toHaveBeenCalledWith(['node-1', 'node-2']);
			});
		});
	});

	describe('parameter-only mode', () => {
		describe('rendering', () => {
			it('should render card title as the node name', () => {
				const { getByTestId } = renderComponent({
					props: {
						state: createParameterOnlyState({
							node: createTestNode({
								name: 'My Code Node',
								type: 'n8n-nodes-base.code',
							}) as INodeUi,
						}),
						expanded: true,
					},
				});

				expect(getByTestId('node-setup-card-header')).toHaveTextContent('My Code Node');
			});

			it('should not render credential picker', () => {
				const { queryByTestId } = renderComponent({
					props: {
						state: createParameterOnlyState({
							parameterIssues: { testParam: ['Parameter is required'] },
						}),
						expanded: true,
					},
				});

				expect(queryByTestId('node-credentials')).not.toBeInTheDocument();
			});

			it('should render execute button for parameter-only nodes', () => {
				const { getByTestId } = renderComponent({
					props: {
						state: createParameterOnlyState({ isComplete: false }),
						expanded: true,
					},
				});

				expect(getByTestId('trigger-execute-button')).toBeInTheDocument();
			});
		});

		describe('parameter inputs', () => {
			it('should render parameter input list when there are parameter issues', () => {
				const { getByTestId } = renderComponent({
					props: {
						state: createParameterOnlyState({
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
						state: createParameterOnlyState({ parameterIssues: {} }),
						expanded: true,
					},
				});

				expect(queryByTestId('parameter-input-list')).not.toBeInTheDocument();
			});

			it('should keep showing parameter inputs even after issues are resolved', async () => {
				const { getByTestId, rerender } = renderComponent({
					props: {
						state: createParameterOnlyState({
							parameterIssues: { testParam: ['Parameter is required'] },
						}),
						expanded: true,
					},
				});

				expect(getByTestId('parameter-input-list')).toBeInTheDocument();

				await rerender({
					state: createParameterOnlyState({ parameterIssues: {} }),
					expanded: true,
				});

				expect(getByTestId('parameter-input-list')).toBeInTheDocument();
			});
		});

		describe('complete state', () => {
			it('should show check icon when user collapses card with no issues', async () => {
				const { getByTestId, rerender } = renderComponent({
					props: {
						state: createParameterOnlyState({
							isComplete: true,
							parameterIssues: {},
						}),
						expanded: true,
					},
				});

				await rerender({
					state: createParameterOnlyState({
						isComplete: true,
						parameterIssues: {},
					}),
					expanded: false,
				});

				expect(getByTestId('node-setup-card-complete-icon')).toBeInTheDocument();
			});

			it('should not mark as complete when collapsed with parameter issues remaining', async () => {
				const { getByTestId, rerender } = renderComponent({
					props: {
						state: createParameterOnlyState({
							isComplete: false,
							parameterIssues: { testParam: ['Parameter is required'] },
						}),
						expanded: true,
					},
				});

				await rerender({
					state: createParameterOnlyState({
						isComplete: false,
						parameterIssues: { testParam: ['Parameter is required'] },
					}),
					expanded: false,
				});

				expect(getByTestId('node-setup-card').className).not.toMatch(/completed/);
			});
		});

		describe('node highlighting', () => {
			it('should highlight the node on card hover', async () => {
				const state = createParameterOnlyState({
					node: createTestNode({ id: 'node-1', name: 'Code' }) as INodeUi,
				});

				const { getByTestId } = renderComponent({
					props: { state, expanded: true },
				});

				await userEvent.hover(getByTestId('node-setup-card'));

				expect(setupPanelStore.setHighlightedNodes).toHaveBeenCalledWith(['node-1']);
			});
		});
	});
});
