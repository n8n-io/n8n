import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { createEventBus } from '@n8n/utils/event-bus';
import { renderComponent } from '@/__tests__/render';
import { createTestWorkflow, defaultNodeDescriptions } from '@/__tests__/mocks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

describe('WorkflowCanvas production build', () => {
	let pinia: Pinia;

	beforeEach(() => {
		vi.stubEnv('DEV', false);
		pinia = createPinia();
		setActivePinia(pinia);
		useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

		const workflow = createTestWorkflow({
			id: '1',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
		});
		useWorkflowsStore().workflowId = workflow.id;
		useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('mounts no experiment chrome when the dev gate is off', async () => {
		const { default: WorkflowCanvas } = await import('./WorkflowCanvas.vue');
		const { container, getByTestId } = renderComponent(WorkflowCanvas, {
			props: {
				id: 'canvas',
				eventBus: createEventBus(),
			},
		});

		expect(container.querySelector('[data-testid="generative-ui-picker"]')).not.toBeInTheDocument();
		expect(getByTestId('canvas')).toBeVisible();
		expect(Object.keys(pinia.state.value)).not.toContain('workflowGenerativeUi');
	}, 15000);
});
