import { ref } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type router from 'vue-router';
import {
	AI_TRANSFORM_NODE_TYPE,
	AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT,
	AI_TRANSFORM_JS_CODE,
} from 'n8n-workflow';
import type { INodeTypeDescription } from 'n8n-workflow';

import { useNodeExecution } from '@/app/composables/useNodeExecution';
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/app/composables/useWorkflowState';
import { useUIStore } from '@/app/stores/ui.store';
import { nodeViewEventBus } from '@/app/event-bus';
import { needsAgentInput } from '@/app/utils/nodes/nodeTransforms';
import { generateCodeForAiTransform } from '@/features/ndv/parameters/utils/buttonParameter.utils';
import type { INodeUi } from '@/Interface';
import {
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	MODAL_CONFIRM,
	FROM_AI_PARAMETERS_MODAL_KEY,
} from '@/app/constants';

const {
	mockWorkflowsStore,
	mockNodeTypesStore,
	mockNdvStore,
	mockRunWorkflow,
	mockPinnedData,
	mockMessage,
} = vi.hoisted(() => ({
	mockWorkflowsStore: {
		isWorkflowRunning: false,
		executedNode: undefined as string | undefined,
		executionWaitingForWebhook: false,
		workflowId: '123',
		chatPartialExecutionDestinationNode: undefined as string | undefined,
		checkIfNodeHasChatParent: vi.fn(),
		getNodeByName: vi.fn(),
		removeTestWebhook: vi.fn(),
	},
	mockNodeTypesStore: {
		getNodeType: vi.fn(),
		isTriggerNode: vi.fn(),
	},
	mockNdvStore: {
		activeNode: null as INodeUi | null,
		isInputPanelEmpty: false,
		pushRef: 'push-ref-123',
		unsetActiveNodeName: vi.fn(),
	},
	mockRunWorkflow: {
		runWorkflow: vi.fn(),
		stopCurrentExecution: vi.fn(),
	},
	mockPinnedData: {
		hasData: { value: false },
		unsetData: vi.fn(),
	},
	mockMessage: {
		confirm: vi.fn(),
	},
}));

vi.mock('vue-router', async (importOriginal) => {
	const { RouterLink } = await importOriginal<typeof router>();
	return {
		RouterLink,
		useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
		useRoute: vi.fn(),
	};
});

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn().mockReturnValue(mockWorkflowsStore),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn().mockReturnValue(mockNodeTypesStore),
}));

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: vi.fn().mockReturnValue(mockNdvStore),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn().mockReturnValue({
		openModalWithData: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: vi.fn().mockReturnValue(mockRunWorkflow),
}));

vi.mock('@/app/composables/usePinnedData', () => ({
	usePinnedData: vi.fn().mockReturnValue(mockPinnedData),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: vi.fn().mockReturnValue(mockMessage),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({
		track: vi.fn(),
		trackAiTransform: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	i18n: { baseText: vi.fn().mockImplementation((key: string) => key) },
	useI18n: vi.fn().mockReturnValue({
		baseText: vi.fn().mockImplementation((key: string) => key),
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn().mockReturnValue({
		run: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/app/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

vi.mock('@/app/utils/nodes/nodeTransforms', () => ({
	needsAgentInput: vi.fn().mockReturnValue(false),
}));

vi.mock('@/features/ndv/parameters/utils/buttonParameter.utils', () => ({
	generateCodeForAiTransform: vi.fn(),
}));

vi.mock('@/app/event-bus', () => ({
	nodeViewEventBus: { emit: vi.fn() },
}));

function createTestNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return {
		id: 'test-id',
		name: 'Test Node',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	} as INodeUi;
}

let workflowState: WorkflowState;
let uiStore: ReturnType<typeof useUIStore>;

describe('useNodeExecution', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		workflowState = vi.mocked(useWorkflowState());
		vi.mocked(injectWorkflowState).mockReturnValue(workflowState);

		uiStore = useUIStore();

		// Reset store properties to defaults
		mockWorkflowsStore.isWorkflowRunning = false;
		mockWorkflowsStore.executedNode = undefined;
		mockWorkflowsStore.executionWaitingForWebhook = false;
		mockWorkflowsStore.chatPartialExecutionDestinationNode = undefined;
		mockWorkflowsStore.checkIfNodeHasChatParent.mockReturnValue(false);
		mockWorkflowsStore.removeTestWebhook.mockReset();
		mockWorkflowsStore.getNodeByName.mockReset();

		mockNodeTypesStore.getNodeType.mockReturnValue(null);
		mockNodeTypesStore.isTriggerNode.mockReturnValue(false);

		mockNdvStore.activeNode = null;
		mockNdvStore.isInputPanelEmpty = false;
		mockNdvStore.unsetActiveNodeName.mockReset();

		mockRunWorkflow.runWorkflow.mockReset();
		mockRunWorkflow.stopCurrentExecution.mockReset();

		mockPinnedData.hasData.value = false;
		mockPinnedData.unsetData.mockReset();

		mockMessage.confirm.mockReset();

		vi.mocked(needsAgentInput).mockReturnValue(false);
		vi.mocked(generateCodeForAiTransform).mockReset();
	});

	describe('isTriggerNode', () => {
		it('should return true when the node is a trigger node', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			const node = ref(createTestNode({ type: WEBHOOK_NODE_TYPE }));

			const { isTriggerNode } = useNodeExecution(node);

			expect(isTriggerNode.value).toBe(true);
			expect(mockNodeTypesStore.isTriggerNode).toHaveBeenCalledWith(WEBHOOK_NODE_TYPE);
		});

		it('should return false when the node is not a trigger node', () => {
			const node = ref(createTestNode());

			const { isTriggerNode } = useNodeExecution(node);

			expect(isTriggerNode.value).toBe(false);
		});

		it('should return false when node is null', () => {
			const node = ref<INodeUi | null>(null);

			const { isTriggerNode } = useNodeExecution(node);

			expect(isTriggerNode.value).toBe(false);
		});
	});

	describe('hasIssues', () => {
		it('should return true when node has parameter issues', () => {
			const node = ref(
				createTestNode({
					issues: { parameters: { param1: ['error'] } },
				}),
			);

			const { hasIssues } = useNodeExecution(node);

			expect(hasIssues.value).toBe(true);
		});

		it('should return true when node has credential issues', () => {
			const node = ref(
				createTestNode({
					issues: { credentials: { cred1: ['error'] } },
				}),
			);

			const { hasIssues } = useNodeExecution(node);

			expect(hasIssues.value).toBe(true);
		});

		it('should return false when node has no issues', () => {
			const node = ref(createTestNode());

			const { hasIssues } = useNodeExecution(node);

			expect(hasIssues.value).toBe(false);
		});
	});

	describe('isListening', () => {
		it('should return true when trigger node is waiting for webhook', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockWorkflowsStore.executionWaitingForWebhook = true;
			const node = ref(createTestNode({ disabled: false }));

			const { isListening } = useNodeExecution(node);

			expect(isListening.value).toBe(true);
		});

		it('should return false when node is disabled', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockWorkflowsStore.executionWaitingForWebhook = true;
			const node = ref(createTestNode({ disabled: true }));

			const { isListening } = useNodeExecution(node);

			expect(isListening.value).toBe(false);
		});

		it('should return false when not a trigger node', () => {
			mockWorkflowsStore.executionWaitingForWebhook = true;
			const node = ref(createTestNode());

			const { isListening } = useNodeExecution(node);

			expect(isListening.value).toBe(false);
		});

		it('should return false when not waiting for webhook', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			const node = ref(createTestNode());

			const { isListening } = useNodeExecution(node);

			expect(isListening.value).toBe(false);
		});

		it('should return false when executed node is a different node', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockWorkflowsStore.executionWaitingForWebhook = true;
			mockWorkflowsStore.executedNode = 'Other Node';
			const node = ref(createTestNode({ name: 'Test Node' }));

			const { isListening } = useNodeExecution(node);

			expect(isListening.value).toBe(false);
		});
	});

	describe('isListeningForWorkflowEvents', () => {
		it('should return true when running trigger node that is not schedule or manual', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: WEBHOOK_NODE_TYPE,
				group: ['trigger'],
			} as INodeTypeDescription);
			mockWorkflowsStore.isWorkflowRunning = true;
			mockWorkflowsStore.executedNode = 'Test Node';
			const node = ref(createTestNode({ name: 'Test Node' }));

			const { isListeningForWorkflowEvents } = useNodeExecution(node);

			expect(isListeningForWorkflowEvents.value).toBe(true);
		});

		it('should return false for schedule trigger nodes', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: 'n8n-nodes-base.scheduleTrigger',
				group: ['schedule'],
			} as INodeTypeDescription);
			mockWorkflowsStore.isWorkflowRunning = true;
			mockWorkflowsStore.executedNode = 'Test Node';
			const node = ref(createTestNode({ name: 'Test Node' }));

			const { isListeningForWorkflowEvents } = useNodeExecution(node);

			expect(isListeningForWorkflowEvents.value).toBe(false);
		});

		it('should return false for manual trigger nodes', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: MANUAL_TRIGGER_NODE_TYPE,
				group: ['trigger'],
			} as INodeTypeDescription);
			mockWorkflowsStore.isWorkflowRunning = true;
			mockWorkflowsStore.executedNode = 'Test Node';
			const node = ref(createTestNode({ name: 'Test Node' }));

			const { isListeningForWorkflowEvents } = useNodeExecution(node);

			expect(isListeningForWorkflowEvents.value).toBe(false);
		});
	});

	describe('isExecuting', () => {
		it('should return true when node is running and not listening', () => {
			mockWorkflowsStore.isWorkflowRunning = true;
			mockWorkflowsStore.executedNode = 'Test Node';
			const node = ref(createTestNode({ name: 'Test Node' }));

			const { isExecuting } = useNodeExecution(node);

			expect(isExecuting.value).toBe(true);
		});

		it('should return false when workflow is not running', () => {
			const node = ref(createTestNode());

			const { isExecuting } = useNodeExecution(node);

			expect(isExecuting.value).toBe(false);
		});
	});

	describe('disabledReason', () => {
		it('should return empty string when listening', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockWorkflowsStore.executionWaitingForWebhook = true;
			const node = ref(createTestNode({ disabled: false }));

			const { disabledReason } = useNodeExecution(node);

			expect(disabledReason.value).toBe('');
		});

		it('should return disabled message when node is disabled', () => {
			const node = ref(createTestNode({ disabled: true }));

			const { disabledReason } = useNodeExecution(node);

			expect(disabledReason.value).toBe('ndv.execute.nodeIsDisabled');
		});

		it('should return missing fields message for trigger node with issues', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			const node = ref(
				createTestNode({
					issues: { parameters: { param1: ['error'] } },
				}),
			);

			const { disabledReason } = useNodeExecution(node);

			expect(disabledReason.value).toBe('ndv.execute.requiredFieldsMissing');
		});

		it('should return workflow running message when another node is executing', () => {
			mockWorkflowsStore.isWorkflowRunning = true;
			mockWorkflowsStore.executedNode = 'Other Node';
			const node = ref(createTestNode({ name: 'Test Node' }));

			const { disabledReason } = useNodeExecution(node);

			expect(disabledReason.value).toBe('ndv.execute.workflowAlreadyRunning');
		});

		it('should return empty string when no disabled condition applies', () => {
			const node = ref(createTestNode());

			const { disabledReason } = useNodeExecution(node);

			expect(disabledReason.value).toBe('');
		});
	});

	describe('buttonLabel', () => {
		it('should return stopListening when isListening', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockWorkflowsStore.executionWaitingForWebhook = true;
			const node = ref(createTestNode({ disabled: false }));

			const { buttonLabel } = useNodeExecution(node);

			expect(buttonLabel.value).toBe('ndv.execute.stopListening');
		});

		it('should return testChat for chat trigger node', () => {
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: CHAT_TRIGGER_NODE_TYPE,
				group: ['trigger'],
			} as INodeTypeDescription);
			const node = ref(createTestNode({ type: CHAT_TRIGGER_NODE_TYPE }));

			const { buttonLabel } = useNodeExecution(node);

			expect(buttonLabel.value).toBe('ndv.execute.testChat');
		});

		it('should return listenForTestEvent for webhook node', () => {
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: WEBHOOK_NODE_TYPE,
				group: ['trigger'],
			} as INodeTypeDescription);
			const node = ref(createTestNode({ type: WEBHOOK_NODE_TYPE }));

			const { buttonLabel } = useNodeExecution(node);

			expect(buttonLabel.value).toBe('ndv.execute.listenForTestEvent');
		});

		it('should return testStep for form trigger node', () => {
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: FORM_TRIGGER_NODE_TYPE,
				group: ['trigger'],
			} as INodeTypeDescription);
			const node = ref(createTestNode({ type: FORM_TRIGGER_NODE_TYPE }));

			const { buttonLabel } = useNodeExecution(node);

			expect(buttonLabel.value).toBe('ndv.execute.testStep');
		});

		it('should return fetchEvent for polling type node', () => {
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: 'n8n-nodes-base.emailReadImap',
				group: ['trigger'],
				polling: true,
			} as unknown as INodeTypeDescription);
			const node = ref(createTestNode());

			const { buttonLabel } = useNodeExecution(node);

			expect(buttonLabel.value).toBe('ndv.execute.fetchEvent');
		});

		it('should return fetchEvent for mockManualExecution node', () => {
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: 'n8n-nodes-base.someNode',
				group: [],
				mockManualExecution: true,
			} as unknown as INodeTypeDescription);
			const node = ref(createTestNode());

			const { buttonLabel } = useNodeExecution(node);

			expect(buttonLabel.value).toBe('ndv.execute.fetchEvent');
		});

		it('should return testNode as default', () => {
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: 'n8n-nodes-base.set',
				group: [] as string[],
			} as INodeTypeDescription);
			const node = ref(createTestNode());

			const { buttonLabel } = useNodeExecution(node);

			expect(buttonLabel.value).toBe('ndv.execute.testNode');
		});
	});

	describe('buttonIcon', () => {
		it('should return flask-conical when not listening', () => {
			const node = ref(createTestNode());

			const { buttonIcon } = useNodeExecution(node);

			expect(buttonIcon.value).toBe('flask-conical');
		});

		it('should return undefined when listening', () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockWorkflowsStore.executionWaitingForWebhook = true;
			const node = ref(createTestNode({ disabled: false }));

			const { buttonIcon } = useNodeExecution(node);

			expect(buttonIcon.value).toBeUndefined();
		});

		it('should return terminal when should generate code', () => {
			const node = ref(
				createTestNode({
					type: AI_TRANSFORM_NODE_TYPE,
					parameters: { instructions: 'do something' },
				}),
			);

			const { buttonIcon } = useNodeExecution(node);

			expect(buttonIcon.value).toBe('terminal');
		});
	});

	describe('shouldGenerateCode', () => {
		it('should return false for non-AI transform nodes', () => {
			const node = ref(createTestNode());

			const { shouldGenerateCode } = useNodeExecution(node);

			expect(shouldGenerateCode.value).toBe(false);
		});

		it('should return false when AI transform has no instructions', () => {
			const node = ref(
				createTestNode({
					type: AI_TRANSFORM_NODE_TYPE,
					parameters: {},
				}),
			);

			const { shouldGenerateCode } = useNodeExecution(node);

			expect(shouldGenerateCode.value).toBe(false);
		});

		it('should return true when AI transform has instructions but no code', () => {
			const node = ref(
				createTestNode({
					type: AI_TRANSFORM_NODE_TYPE,
					parameters: { instructions: 'do something' },
				}),
			);

			const { shouldGenerateCode } = useNodeExecution(node);

			expect(shouldGenerateCode.value).toBe(true);
		});

		it('should return false when AI transform has matching prompt and code', () => {
			const node = ref(
				createTestNode({
					type: AI_TRANSFORM_NODE_TYPE,
					parameters: {
						instructions: 'do something',
						[AI_TRANSFORM_JS_CODE]: 'return items;',
						[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT]: 'do something',
					},
				}),
			);

			const { shouldGenerateCode } = useNodeExecution(node);

			expect(shouldGenerateCode.value).toBe(false);
		});

		it('should return true when AI transform instructions differ from generated prompt', () => {
			const node = ref(
				createTestNode({
					type: AI_TRANSFORM_NODE_TYPE,
					parameters: {
						instructions: 'do something new',
						[AI_TRANSFORM_JS_CODE]: 'return items;',
						[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT]: 'do something old',
					},
				}),
			);

			const { shouldGenerateCode } = useNodeExecution(node);

			expect(shouldGenerateCode.value).toBe(true);
		});
	});

	describe('execute', () => {
		it('should return noop when node is null', async () => {
			const node = ref<INodeUi | null>(null);

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(result).toBe('noop');
		});

		it('should open chat for chat trigger nodes', async () => {
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: CHAT_TRIGGER_NODE_TYPE,
				group: ['trigger'],
			} as INodeTypeDescription);
			const node = ref(createTestNode({ name: 'Chat Node', type: CHAT_TRIGGER_NODE_TYPE }));

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(result).toBe('opened-chat');
			expect(mockNdvStore.unsetActiveNodeName).toHaveBeenCalled();
			expect(nodeViewEventBus.emit).toHaveBeenCalledWith('openChat');
			expect(mockWorkflowsStore.chatPartialExecutionDestinationNode).toBe('Chat Node');
		});

		it('should open chat for chat child nodes when input panel is empty', async () => {
			mockWorkflowsStore.checkIfNodeHasChatParent.mockReturnValue(true);
			mockNdvStore.isInputPanelEmpty = true;
			const node = ref(createTestNode({ name: 'Child Node' }));

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(result).toBe('opened-chat');
		});

		it('should stop webhook when listening', async () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockWorkflowsStore.executionWaitingForWebhook = true;
			const node = ref(createTestNode({ disabled: false }));

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(result).toBe('stopped-webhook');
			expect(mockWorkflowsStore.removeTestWebhook).toHaveBeenCalledWith('123');
		});

		it('should stop execution when listening for workflow events', async () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: WEBHOOK_NODE_TYPE,
				group: ['trigger'],
			} as INodeTypeDescription);
			mockWorkflowsStore.isWorkflowRunning = true;
			mockWorkflowsStore.executedNode = 'Test Node';
			const node = ref(createTestNode({ name: 'Test Node' }));

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(result).toBe('stopped-execution');
			expect(mockRunWorkflow.stopCurrentExecution).toHaveBeenCalled();
		});

		it('should open modal for nodes needing agent input', async () => {
			vi.mocked(needsAgentInput).mockReturnValue(true);
			const node = ref(createTestNode({ name: 'Agent Node' }));

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(result).toBe('opened-modal');
			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: FROM_AI_PARAMETERS_MODAL_KEY,
				data: { nodeName: 'Agent Node' },
			});
		});

		it('should run workflow for normal execution', async () => {
			const node = ref(createTestNode({ name: 'Set Node' }));

			const { execute } = useNodeExecution(node, {
				telemetrySource: 'ndv',
				executionMode: 'inclusive',
				source: 'RunData.ExecuteNodeButton',
			});
			const result = await execute();

			expect(result).toBe('executed');
			expect(mockRunWorkflow.runWorkflow).toHaveBeenCalledWith({
				destinationNode: { nodeName: 'Set Node', mode: 'inclusive' },
				source: 'RunData.ExecuteNodeButton',
			});
		});

		it('should handle pinned data with confirm dialog', async () => {
			mockPinnedData.hasData.value = true;
			mockMessage.confirm.mockResolvedValue(MODAL_CONFIRM);
			const node = ref(createTestNode({ name: 'Set Node' }));

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(mockMessage.confirm).toHaveBeenCalled();
			expect(mockPinnedData.unsetData).toHaveBeenCalledWith('unpin-and-execute-modal');
			expect(result).toBe('executed');
		});

		it('should return cancelled when pinned data confirm is dismissed', async () => {
			mockPinnedData.hasData.value = true;
			mockMessage.confirm.mockResolvedValue('cancel');
			const node = ref(createTestNode({ name: 'Set Node' }));

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(result).toBe('cancelled');
		});

		it('should generate code before executing AI transform node', async () => {
			vi.mocked(generateCodeForAiTransform).mockResolvedValue({
				name: `parameters.${AI_TRANSFORM_JS_CODE}`,
				value: 'return items;',
			});
			vi.spyOn(workflowState, 'updateNodeProperties').mockImplementation(() => {});
			const node = ref(
				createTestNode({
					name: 'AI Transform',
					type: AI_TRANSFORM_NODE_TYPE,
					parameters: { instructions: 'do something' },
				}),
			);

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(generateCodeForAiTransform).toHaveBeenCalled();
			expect(workflowState.updateNodeProperties).toHaveBeenCalled();
			expect(result).toBe('executed');
		});

		it('should call onCodeGenerated callback when code is generated', async () => {
			vi.mocked(generateCodeForAiTransform).mockResolvedValue({
				name: `parameters.${AI_TRANSFORM_JS_CODE}`,
				value: 'return items;',
			});
			vi.spyOn(workflowState, 'updateNodeProperties').mockImplementation(() => {});
			const onCodeGenerated = vi.fn();
			const node = ref(
				createTestNode({
					name: 'AI Transform',
					type: AI_TRANSFORM_NODE_TYPE,
					parameters: { instructions: 'do something' },
				}),
			);

			const { execute } = useNodeExecution(node, { onCodeGenerated });
			await execute();

			expect(onCodeGenerated).toHaveBeenCalledTimes(2);
			expect(onCodeGenerated).toHaveBeenCalledWith({
				name: `parameters.${AI_TRANSFORM_JS_CODE}`,
				value: 'return items;',
			});
			expect(onCodeGenerated).toHaveBeenCalledWith({
				name: `parameters.${AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT}`,
				value: 'do something',
			});
		});

		it('should return cancelled when code generation fails', async () => {
			vi.mocked(generateCodeForAiTransform).mockResolvedValue(undefined as never);
			const node = ref(
				createTestNode({
					name: 'AI Transform',
					type: AI_TRANSFORM_NODE_TYPE,
					parameters: { instructions: 'do something' },
				}),
			);

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(result).toBe('cancelled');
		});
	});

	describe('stopExecution', () => {
		it('should stop webhook when listening', async () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockWorkflowsStore.executionWaitingForWebhook = true;
			const node = ref(createTestNode({ disabled: false }));

			const { stopExecution } = useNodeExecution(node);
			await stopExecution();

			expect(mockWorkflowsStore.removeTestWebhook).toHaveBeenCalledWith('123');
		});

		it('should stop current execution when listening for workflow events', async () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockNodeTypesStore.getNodeType.mockReturnValue({
				name: WEBHOOK_NODE_TYPE,
				group: ['trigger'],
			} as INodeTypeDescription);
			mockWorkflowsStore.isWorkflowRunning = true;
			mockWorkflowsStore.executedNode = 'Test Node';
			const node = ref(createTestNode({ name: 'Test Node' }));

			const { stopExecution } = useNodeExecution(node);
			await stopExecution();

			expect(mockRunWorkflow.stopCurrentExecution).toHaveBeenCalled();
		});
	});
});
