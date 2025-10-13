/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createTestingPinia } from '@pinia/testing';
import WorkflowSelectorParameterInput, {
	type Props,
} from '@/components/WorkflowSelectorParameterInput/WorkflowSelectorParameterInput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

const { onDocumentVisible } = vi.hoisted(() => ({
	onDocumentVisible: vi.fn(),
}));

const flushPromises = async () => await new Promise(setImmediate);

const mockToast = {
	showError: vi.fn(),
};

vi.mock('@/composables/useDocumentVisibility', () => ({
	useDocumentVisibility: () => ({ onDocumentVisible }),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: vi.fn(() => mockToast),
}));

vi.mock('vue-router', () => {
	const push = vi.fn();
	return {
		useRouter: () => ({
			push,
			resolve: vi.fn().mockReturnValue({
				href: '/projects/1/workflows/1',
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
		// Mock store methods to prevent unhandled errors
		workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
		workflowsStore.totalWorkflowCount = 0;
		workflowsStore.getWorkflowById.mockReturnValue(null as any);
		workflowsStore.fetchWorkflow.mockResolvedValue({} as any);
		workflowsStore.createNewWorkflow.mockResolvedValue({
			id: 'new-workflow-id',
			name: 'New Workflow',
		} as any);
		workflowsStore.allWorkflows = [];
		mockToast.showError.mockClear();
	});

	afterEach(() => {
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
		const wrapper = renderComponent({ props });
		await flushPromises();

		// The component adds cachedResultUrl to the model value
		const expectedModelValue = {
			...props.modelValue,
			cachedResultUrl: '/projects/1/workflows/1',
		};

		expect(wrapper.emitted()['update:modelValue']?.[0]).toEqual([expectedModelValue]);
		expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith(props.modelValue.value);
	});

	it('should update cached workflow when document becomes visible', async () => {
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
		const expectedModelValue = {
			...props.modelValue,
			cachedResultUrl: '/projects/1/workflows/1',
		};

		expect(emitted()['update:modelValue']?.[0]).toEqual([expectedModelValue]);
		expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith(props.modelValue.value);
		workflowsStore.fetchWorkflow.mockReset();

		expect(onDocumentVisible).toHaveBeenCalled();
		const onDocumentVisibleCallback = onDocumentVisible.mock.lastCall?.[0];
		await onDocumentVisibleCallback();

		expect(emitted()['update:modelValue']?.[1]).toEqual([expectedModelValue]);
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

	describe('workflow caching behavior', () => {
		it('should include cached URL in model value updates', async () => {
			const props: Props = {
				modelValue: {
					__rl: true,
					value: 'test-workflow',
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

			const wrapper = renderComponent({ props });
			await flushPromises();

			const updateEvents = wrapper.emitted()['update:modelValue'] as any[];
			const lastUpdate = updateEvents[updateEvents.length - 1][0];

			expect(lastUpdate).toMatchObject({
				__rl: true,
				value: 'test-workflow',
				mode: 'list',
				cachedResultUrl: '/projects/1/workflows/1',
			});
		});

		it('should handle workflow name caching from store', async () => {
			const mockWorkflow = {
				id: 'existing-workflow',
				name: 'Existing Workflow',
			};

			workflowsStore.getWorkflowById.mockReturnValue(mockWorkflow as any);

			const props: Props = {
				modelValue: {
					__rl: true,
					value: 'existing-workflow',
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

			renderComponent({ props });
			await flushPromises();

			// Verify workflow was fetched via fetchWorkflow, not getWorkflowById directly
			expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith('existing-workflow');
		});
	});

	describe('error handling', () => {
		it('should show toast when workflow creation fails', async () => {
			// Make createNewWorkflow fail
			const error = new Error('Failed to create workflow');
			workflowsStore.createNewWorkflow.mockRejectedValue(error);

			const props: Props = {
				modelValue: {
					__rl: true,
					value: '',
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

			const { getByTestId } = renderComponent({ props });
			await flushPromises();

			// Get the ResourceLocatorDropdown component to trigger the add resource click
			const addResourceButton = getByTestId('rlc-item-add-resource');
			expect(addResourceButton).toBeInTheDocument();

			// Click the add resource button
			addResourceButton.click();
			await flushPromises();

			// Verify the toast error was shown
			expect(mockToast.showError).toHaveBeenCalledWith(error, 'Error creating sub-workflow');
		});
	});
});
