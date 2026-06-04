import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import InstanceAiWorkflowPreview from '../components/InstanceAiWorkflowPreview.vue';

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

const WorkflowCanvasHostStub = defineComponent({
	name: 'WorkflowCanvasHost',
	props: {
		workflowId: { type: String, required: true },
		refreshKey: { type: Number, default: 0 },
	},
	setup(props, { expose }) {
		expose({ requestFitView: vi.fn() });

		return () =>
			h(
				'div',
				{
					'data-test-id': 'workflow-canvas-host-stub',
					'data-workflow-id': props.workflowId,
				},
				[],
			);
	},
});

describe('InstanceAiWorkflowPreview', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let renderPreview: ReturnType<
		typeof createThreadComponentRenderer<typeof InstanceAiWorkflowPreview>
	>;

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		renderPreview = createThreadComponentRenderer(InstanceAiWorkflowPreview, {
			pinia,
			props: {
				workflowId: 'workflow-1',
				refreshKey: 0,
			},
			global: {
				stubs: {
					WorkflowCanvasHost: WorkflowCanvasHostStub,
				},
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the workflow canvas host for the selected workflow', () => {
		const { getByTestId } = renderPreview();

		expect(getByTestId('workflow-canvas-host-stub')).toHaveAttribute(
			'data-workflow-id',
			'workflow-1',
		);
	});
});
