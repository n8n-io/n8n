import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InstanceAiWorkflowPreview from '../components/InstanceAiWorkflowPreview.vue';

const mocks = vi.hoisted(() => ({
	consumePendingHandoff: vi.fn(),
	sendMessage: vi.fn(),
	restoreExecutionResult: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'push-ref' }),
}));

// Execution-restore is covered in InstanceAiWorkflowPreview.test.ts against the
// real composable; here we isolate the editor/executions view toggle.
vi.mock('../composables/useInstanceAiWorkflowPreviewExecution', () => ({
	useInstanceAiWorkflowPreviewExecution: () => ({
		restoreExecutionResult: mocks.restoreExecutionResult,
	}),
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

describe('InstanceAiWorkflowPreview executions view', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.consumePendingHandoff.mockReturnValue(undefined);
	});

	it('shows only the editor when there is no agent execution', () => {
		const wrapper = mount(InstanceAiWorkflowPreview, {
			props: { workflowId: 'wf-1' },
		});

		expect(wrapper.find('[data-test-id="instance-ai-workflow-view-tabs"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="workflow-canvas-host-stub"]').exists()).toBe(true);
		expect(wrapper.find('[data-test-id="execution-preview-host-stub"]').exists()).toBe(false);
	});

	it('shows the latest agent execution in the artifact executions tab', async () => {
		const wrapper = mount(InstanceAiWorkflowPreview, {
			props: {
				workflowId: 'wf-1',
				executionResult: { executionId: 'exec-1', status: 'success' },
			},
		});

		await flushPromises();

		expect(wrapper.find('[data-test-id="workflow-canvas-host-stub"]').exists()).toBe(true);
		expect(wrapper.find('[data-test-id="execution-preview-host-stub"]').exists()).toBe(false);

		await wrapper.get('[data-test-id="instance-ai-workflow-view-tab-executions"]').trigger('click');

		expect(wrapper.get('[data-test-id="execution-preview-host-stub"]').text()).toBe('wf-1:exec-1');
		expect(wrapper.get('[data-test-id="workflow-canvas-host-stub"]').isVisible()).toBe(false);
	});
});
