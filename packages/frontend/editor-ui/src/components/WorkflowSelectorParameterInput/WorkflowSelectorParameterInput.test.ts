import { createTestingPinia } from '@pinia/testing';
import WorkflowSelectorParameterInput, {
	type Props,
} from '@/components/WorkflowSelectorParameterInput/WorkflowSelectorParameterInput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { cleanupAppModals, createAppModals, mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/stores/projects.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

const { onDocumentVisible } = vi.hoisted(() => ({
	onDocumentVisible: vi.fn(),
}));

const flushPromises = async () => await new Promise(setImmediate);

vi.mock('@/composables/useDocumentVisibility', () => ({
	useDocumentVisibility: () => ({ onDocumentVisible }),
}));

vi.mock('vue-router', () => {
	const push = vi.fn();
	return {
		useRouter: () => ({
			push,
			resolve: vi.fn().mockReturnValue({
				href: '/projects/1/folders/1',
			}),
		}),
		useRoute: () => ({}),
		RouterLink: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(WorkflowSelectorParameterInput, {
	pinia: createTestingPinia({}),
});

const projectsStore = mockedStore(useProjectsStore);
projectsStore.isTeamProjectFeatureEnabled = false;

const workflowsStore = mockedStore(useWorkflowsStore);

describe('WorkflowSelectorParameterInput', () => {
	beforeEach(() => {
		createAppModals();
	});

	afterEach(() => {
		cleanupAppModals();
		vi.clearAllMocks();
	});

	it('should update cached workflow when page is visible', async () => {
		const props: Props = {
			modelValue: {
				__rl: true,
				value: 'workflow-id',
				mode: 'list',
			},
			path: '',
			parameter: {
				displayName: 'display-name',
				type: 'workflowSelector',
				name: 'name',
				default: '',
			},
		};
		const { emitted } = renderComponent({ props });
		await flushPromises();
		expect(emitted()['update:modelValue']?.[0]).toEqual([props.modelValue]);
		expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith(props.modelValue.value);
	});

	it('should update cached workflow when page is visible', async () => {
		const props: Props = {
			modelValue: {
				__rl: true,
				value: 'workflow-id',
				mode: 'list',
			},
			path: '',
			parameter: {
				displayName: 'display-name',
				type: 'workflowSelector',
				name: 'name',
				default: '',
			},
		};
		const { emitted } = renderComponent({ props });
		await flushPromises();

		// on mount
		expect(emitted()['update:modelValue']?.[0]).toEqual([props.modelValue]);
		expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith(props.modelValue.value);
		workflowsStore.fetchWorkflow.mockReset();

		expect(onDocumentVisible).toHaveBeenCalled();
		const onDocumentVisibleCallback = onDocumentVisible.mock.lastCall?.[0];
		await onDocumentVisibleCallback();

		expect(emitted()['update:modelValue']?.[1]).toEqual([props.modelValue]);
		expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith(props.modelValue.value);
	});

	it('should show parameter issues selector with resource link', async () => {
		const props: Props = {
			modelValue: {
				__rl: true,
				value: 'workflow-id',
				mode: 'list',
			},
			path: '',
			parameter: {
				displayName: 'display-name',
				type: 'workflowSelector',
				name: 'name',
				default: '',
			},
			parameterIssues: ['Some issue'],
		};

		const { getByTestId } = renderComponent({ props });
		await flushPromises();
		expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith(props.modelValue.value);

		expect(getByTestId('parameter-issues')).toBeInTheDocument();
		expect(getByTestId('rlc-open-resource-link')).toBeInTheDocument();
	});
});
