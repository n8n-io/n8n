import { ref, computed } from 'vue';
import { createTestingPinia } from '@pinia/testing';

import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeUi } from '@/Interface';

import { useTriggerExecution } from '@/features/setupPanel/composables/useTriggerExecution';

const mockExecutionState = vi.hoisted(() => ({
	isExecuting: false,
	isListening: false,
	isListeningForWorkflowEvents: false,
	buttonLabel: 'Test node',
	buttonIcon: 'flask-conical' as const,
	disabledReason: '',
	hasIssues: false,
	execute: vi.fn(),
}));

vi.mock('@/app/composables/useNodeExecution', () => ({
	useNodeExecution: vi.fn(() => ({
		isExecuting: computed(() => mockExecutionState.isExecuting),
		isListening: computed(() => mockExecutionState.isListening),
		isListeningForWorkflowEvents: computed(() => mockExecutionState.isListeningForWorkflowEvents),
		buttonLabel: computed(() => mockExecutionState.buttonLabel),
		buttonIcon: computed(() => mockExecutionState.buttonIcon),
		disabledReason: computed(() => mockExecutionState.disabledReason),
		hasIssues: computed(() => mockExecutionState.hasIssues),
		execute: mockExecutionState.execute,
	})),
}));

const createNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
	createTestNode({
		name: 'SlackTrigger',
		type: 'n8n-nodes-base.slackTrigger',
		typeVersion: 1,
		position: [0, 0],
		...overrides,
	}) as INodeUi;

describe('useTriggerExecution', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		createTestingPinia();
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(null);

		mockExecutionState.isExecuting = false;
		mockExecutionState.isListening = false;
		mockExecutionState.isListeningForWorkflowEvents = false;
		mockExecutionState.buttonLabel = 'Test node';
		mockExecutionState.buttonIcon = 'flask-conical';
		mockExecutionState.disabledReason = '';
		mockExecutionState.hasIssues = false;
		mockExecutionState.execute.mockReset();
	});

	describe('label', () => {
		it('should return button label from useNodeExecution when not listening', () => {
			const node = ref<INodeUi | null>(createNode());
			const { label } = useTriggerExecution(node);

			expect(label.value).toBe('Test node');
		});

		it('should return stop listening label when in listening state', () => {
			mockExecutionState.isListening = true;
			const node = ref<INodeUi | null>(createNode());
			const { label } = useTriggerExecution(node);

			expect(label.value).toContain('Stop');
		});

		it('should return stop listening label when listening for workflow events', () => {
			mockExecutionState.isListeningForWorkflowEvents = true;
			const node = ref<INodeUi | null>(createNode());
			const { label } = useTriggerExecution(node);

			expect(label.value).toContain('Stop');
		});
	});

	describe('isInListeningState', () => {
		it('should be false when not listening', () => {
			const node = ref<INodeUi | null>(createNode());
			const { isInListeningState } = useTriggerExecution(node);

			expect(isInListeningState.value).toBe(false);
		});

		it('should be true when isListening is true', () => {
			mockExecutionState.isListening = true;
			const node = ref<INodeUi | null>(createNode());
			const { isInListeningState } = useTriggerExecution(node);

			expect(isInListeningState.value).toBe(true);
		});

		it('should be true when isListeningForWorkflowEvents is true', () => {
			mockExecutionState.isListeningForWorkflowEvents = true;
			const node = ref<INodeUi | null>(createNode());
			const { isInListeningState } = useTriggerExecution(node);

			expect(isInListeningState.value).toBe(true);
		});
	});

	describe('isButtonDisabled', () => {
		it('should be false when no issues and not executing', () => {
			const node = ref<INodeUi | null>(createNode());
			const { isButtonDisabled } = useTriggerExecution(node);

			expect(isButtonDisabled.value).toBe(false);
		});

		it('should be true when executing', () => {
			mockExecutionState.isExecuting = true;
			const node = ref<INodeUi | null>(createNode());
			const { isButtonDisabled } = useTriggerExecution(node);

			expect(isButtonDisabled.value).toBe(true);
		});

		it('should be true when node has issues', () => {
			mockExecutionState.hasIssues = true;
			const node = ref<INodeUi | null>(createNode());
			const { isButtonDisabled } = useTriggerExecution(node);

			expect(isButtonDisabled.value).toBe(true);
		});

		it('should be true when there is a disabled reason', () => {
			mockExecutionState.disabledReason = 'Workflow not saved';
			const node = ref<INodeUi | null>(createNode());
			const { isButtonDisabled } = useTriggerExecution(node);

			expect(isButtonDisabled.value).toBe(true);
		});
	});

	describe('tooltipItems', () => {
		it('should return empty array when no issues and no disabled reason', () => {
			const node = ref<INodeUi | null>(createNode());
			const { tooltipItems } = useTriggerExecution(node);

			expect(tooltipItems.value).toEqual([]);
		});

		it('should return generic message when node has issues but no issue details', () => {
			mockExecutionState.hasIssues = true;
			const node = ref<INodeUi | null>(createNode());
			const { tooltipItems } = useTriggerExecution(node);

			expect(tooltipItems.value).toHaveLength(1);
			expect(tooltipItems.value[0]).toBeTruthy();
		});

		it('should return credential issue messages when node has credential issues', () => {
			mockExecutionState.hasIssues = true;
			const node = ref<INodeUi | null>(
				createNode({
					issues: {
						credentials: {
							slackApi: ['Credentials for Slack are not set.'],
						},
					},
				}),
			);
			const { tooltipItems } = useTriggerExecution(node);

			expect(tooltipItems.value).toEqual(['Credentials for Slack are not set.']);
		});

		it('should return parameter issue messages when node has parameter issues', () => {
			mockExecutionState.hasIssues = true;
			const node = ref<INodeUi | null>(
				createNode({
					issues: {
						parameters: {
							channel: ['Parameter "Channel" is required.'],
						},
					},
				}),
			);
			const { tooltipItems } = useTriggerExecution(node);

			expect(tooltipItems.value).toEqual(['Parameter "Channel" is required.']);
		});

		it('should return both credential and parameter issues', () => {
			mockExecutionState.hasIssues = true;
			const node = ref<INodeUi | null>(
				createNode({
					issues: {
						credentials: {
							slackApi: ['Credentials for Slack are not set.'],
						},
						parameters: {
							channel: ['Parameter "Channel" is required.'],
						},
					},
				}),
			);
			const { tooltipItems } = useTriggerExecution(node);

			expect(tooltipItems.value).toEqual([
				'Credentials for Slack are not set.',
				'Parameter "Channel" is required.',
			]);
		});

		it('should return disabled reason as single-item array when provided', () => {
			mockExecutionState.disabledReason = 'Workflow not saved';
			const node = ref<INodeUi | null>(createNode());
			const { tooltipItems } = useTriggerExecution(node);

			expect(tooltipItems.value).toEqual(['Workflow not saved']);
		});
	});

	describe('listeningHint', () => {
		it('should return empty string when not listening', () => {
			const node = ref<INodeUi | null>(createNode());
			const { listeningHint } = useTriggerExecution(node);

			expect(listeningHint.value).toBe('');
		});

		it('should return eventTriggerDescription when available and listening', () => {
			mockExecutionState.isListening = true;
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(
				mockNodeTypeDescription({
					name: 'n8n-nodes-base.slackTrigger',
					displayName: 'Slack Trigger',
					eventTriggerDescription: 'Go to Slack and send a message',
				}),
			);
			const node = ref<INodeUi | null>(createNode());
			const { listeningHint } = useTriggerExecution(node);

			expect(listeningHint.value).toBe('Go to Slack and send a message');
		});

		it('should fall back to service name hint when no eventTriggerDescription', () => {
			mockExecutionState.isListening = true;
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(
				mockNodeTypeDescription({
					name: 'n8n-nodes-base.slackTrigger',
					displayName: 'Slack Trigger',
				}),
			);
			const node = ref<INodeUi | null>(createNode());
			const { listeningHint } = useTriggerExecution(node);

			expect(listeningHint.value).toContain('Slack');
		});

		it('should return empty string when listening but node is null', () => {
			mockExecutionState.isListening = true;
			const node = ref<INodeUi | null>(null);
			const { listeningHint } = useTriggerExecution(node);

			expect(listeningHint.value).toBe('');
		});
	});

	describe('execute', () => {
		it('should delegate to useNodeExecution execute', async () => {
			const node = ref<INodeUi | null>(createNode());
			const { execute } = useTriggerExecution(node);

			await execute();

			expect(mockExecutionState.execute).toHaveBeenCalled();
		});
	});
});
