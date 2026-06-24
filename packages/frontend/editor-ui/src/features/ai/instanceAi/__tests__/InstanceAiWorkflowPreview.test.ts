import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import InstanceAiWorkflowPreview from '../components/InstanceAiWorkflowPreview.vue';

const mocks = vi.hoisted(() => ({
	addEventListener: vi.fn(),
	fetchExecutionDataById: vi.fn(),
	setExecution: vi.fn(),
	setDisplayedExecutionId: vi.fn(),
	setActiveExecutionId: vi.fn(),
	consumePendingHandoff: vi.fn(),
	sendMessage: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'push-ref' }),
}));

vi.mock('@/app/components/WorkflowCanvasHost.vue', async () => {
	const { defineComponent, h } = await import('vue');

	return {
		default: defineComponent({
			name: 'WorkflowCanvasHost',
			setup(_, { expose }) {
				expose({ requestFitView: vi.fn() });
				return () => h('div', { 'data-test-id': 'workflow-canvas-host-stub' });
			},
		}),
	};
});

vi.mock(
	'@/features/execution/executions/components/workflow/ExecutionPreviewHost.vue',
	async () => {
		const { defineComponent, h } = await import('vue');

		return {
			default: defineComponent({
				name: 'ExecutionPreviewHost',
				props: {
					workflowId: { type: String, required: true },
					executionId: { type: String, required: true },
				},
				setup(props) {
					return () =>
						h('div', { 'data-test-id': 'execution-preview-host-stub' }, [
							`${props.workflowId}:${props.executionId}`,
						]);
				},
			}),
		};
	},
);

vi.mock('@n8n/design-system', async () => {
	const { defineComponent, h } = await import('vue');

	return {
		N8nRadioButtons: defineComponent({
			name: 'N8nRadioButtons',
			props: {
				modelValue: { type: String, required: true },
				options: { type: Array, required: true },
			},
			emits: ['update:modelValue'],
			setup(props, { emit }) {
				return () =>
					h(
						'div',
						{ 'data-test-id': 'instance-ai-workflow-view-tabs' },
						(props.options as Array<{ value: string; label: string }>).map((option) =>
							h(
								'button',
								{
									type: 'button',
									'data-test-id': `instance-ai-workflow-view-tab-${option.value}`,
									'aria-pressed': props.modelValue === option.value ? 'true' : 'false',
									onClick: () => emit('update:modelValue', option.value),
								},
								option.label,
							),
						),
					);
			},
		}),
	};
});

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'generic.editor': 'Editor',
				'generic.executions': 'Executions',
			})[key] ?? key,
	}),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ addEventListener: mocks.addEventListener }),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({ fetchExecutionDataById: mocks.fetchExecutionDataById }),
}));

vi.mock('@/app/stores/executionData.store', () => ({
	createExecutionDataId: (id: string) => id,
	useExecutionDataStore: () => ({
		setExecution: mocks.setExecution,
		executionRunData: null,
	}),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	createWorkflowDocumentId: (id: string) => id,
	useWorkflowDocumentStore: () => ({ allNodes: [] }),
}));

vi.mock('@/app/stores/workflowExecutionState.store', () => ({
	useWorkflowExecutionStateStore: () => ({
		activeExecutionId: undefined,
		setDisplayedExecutionId: mocks.setDisplayedExecutionId,
		setActiveExecutionId: mocks.setActiveExecutionId,
	}),
}));

vi.mock('../canvasPreview.utils', () => ({
	isAgentEditingWorkflow: () => false,
}));

vi.mock('../composables/useInstanceAiHandoff', () => ({
	buildInstanceAiArtifactCredentialQuestion: vi.fn(),
}));

vi.mock('../instanceAi.store', () => ({
	useThread: () => ({
		messages: [],
		consumePendingHandoff: mocks.consumePendingHandoff,
		sendMessage: mocks.sendMessage,
	}),
}));

describe('InstanceAiWorkflowPreview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.addEventListener.mockReturnValue(vi.fn());
		mocks.consumePendingHandoff.mockReturnValue(undefined);
	});

	it('shows the latest agent execution in the artifact executions tab', async () => {
		const execution = {
			id: 'exec-1',
			workflowId: 'wf-1',
			workflowData: { id: 'wf-1' },
		} as IExecutionResponse;
		mocks.fetchExecutionDataById.mockResolvedValue(execution);

		const wrapper = mount(InstanceAiWorkflowPreview, {
			props: {
				workflowId: 'wf-1',
				executionResult: { executionId: 'exec-1', status: 'success' },
			},
		});

		await flushPromises();

		expect(mocks.fetchExecutionDataById).toHaveBeenCalledWith('exec-1');
		expect(mocks.setExecution).toHaveBeenCalledWith(execution);
		expect(mocks.setDisplayedExecutionId).toHaveBeenCalledWith('exec-1');

		expect(wrapper.find('[data-test-id="workflow-canvas-host-stub"]').exists()).toBe(true);

		await wrapper.get('[data-test-id="instance-ai-workflow-view-tab-executions"]').trigger('click');

		expect(wrapper.get('[data-test-id="execution-preview-host-stub"]').text()).toBe('wf-1:exec-1');
		expect(wrapper.get('[data-test-id="workflow-canvas-host-stub"]').isVisible()).toBe(false);
	});
});
