/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createTestWorkflow } from '@/__tests__/mocks';
import WorkflowSelectorParameterInput, { type Props } from './WorkflowSelectorParameterInput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

const { onDocumentVisible } = vi.hoisted(() => ({
	onDocumentVisible: vi.fn(),
}));

const flushPromises = async () => await new Promise(setImmediate);

const mockToast = {
	showError: vi.fn(),
};

vi.mock('@/app/composables/useDocumentVisibility', () => ({
	useDocumentVisibility: () => ({ onDocumentVisible }),
}));

vi.mock('@n8n/composables/useToast', () => ({
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

const { workflowIdHolder } = vi.hoisted(() => ({
	workflowIdHolder: { current: (): string => '' },
}));

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => workflowIdHolder.current()),
		useRouteWorkflowId: () => computed(() => workflowIdHolder.current()),
	};
});

const renderComponent = createComponentRenderer(WorkflowSelectorParameterInput);

let projectsStore: MockedStore<typeof useProjectsStore>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;

describe('WorkflowSelectorParameterInput', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({}));

		projectsStore = mockedStore(useProjectsStore);
		projectsStore.isTeamProjectFeatureEnabled = false;

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowIdHolder.current = () => useWorkflowsStore().workflowId;
		workflowsListStore = mockedStore(useWorkflowsListStore);

		// Mock store methods to prevent unhandled errors
		workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
		workflowsListStore.totalWorkflowCount = 0;
		workflowsListStore.getWorkflowById.mockReturnValue(null as any);
		workflowsListStore.fetchWorkflow.mockResolvedValue({} as any);
		workflowsStore.createNewWorkflow.mockResolvedValue({
			id: 'new-workflow-id',
			name: 'New Workflow',
		} as any);
		workflowsListStore.allWorkflows = [];
		mockToast.showError.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it.each([undefined, 'Previously selected workflow'])(
		'hides setup markers while preserving the cached name: %s',
		async (cachedResultName) => {
			const view = renderComponent({
				props: {
					modelValue: {
						__rl: true,
						mode: 'list',
						value: '<__PLACEHOLDER_VALUE__Choose a workflow__>',
						cachedResultName,
					},
					path: '',
					parameter: {
						displayName: 'Workflow',
						name: 'workflowId',
						type: 'workflowSelector',
						default: '',
					},
				},
			});
			await flushPromises();
			const input = view.getByRole('textbox');
			expect(input).not.toHaveDisplayValue(/__PLACEHOLDER_VALUE__/);
			expect(input).toHaveValue(cachedResultName ?? '');
			expect(workflowsListStore.fetchWorkflow).not.toHaveBeenCalled();
			expect(view.queryByTestId('rlc-open-resource-link')).not.toBeInTheDocument();
			expect(view.emitted('update:modelValue')).toBeUndefined();
		},
	);

	it('closes with Escape and reopens its workflow list', async () => {
		workflowsListStore.fetchWorkflowsPage.mockResolvedValue([
			{
				...createTestWorkflow({ id: 'wf-choice', name: 'Workflow option' }),
				description: undefined,
			},
		]);
		const view = renderComponent({
			props: {
				modelValue: { __rl: true, mode: 'list', value: '' },
				path: '',
				parameter: {
					displayName: 'Workflow',
					name: 'workflowId',
					type: 'workflowSelector',
					default: '',
				},
			},
		});
		await flushPromises();
		await userEvent.click(view.getByTestId('rlc-input'));
		expect(await view.findByText('Workflow option')).toBeVisible();
		await userEvent.click(view.getByTestId('rlc-search'));
		await userEvent.keyboard('{Escape}');
		await waitFor(() => expect(view.queryByText('Workflow option')).toBeNull());
		await userEvent.click(view.getByTestId('rlc-input'));
		expect(await view.findByText('Workflow option')).toBeVisible();
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
		expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith(props.modelValue.value);
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
		expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith(props.modelValue.value);
		workflowsListStore.fetchWorkflow.mockReset();

		expect(onDocumentVisible).toHaveBeenCalled();
		const onDocumentVisibleCallback = onDocumentVisible.mock.lastCall?.[0];
		await onDocumentVisibleCallback();

		expect(emitted()['update:modelValue']?.[1]).toEqual([expectedModelValue]);
		expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith(props.modelValue.value);
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
		expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith(props.modelValue.value);

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

			workflowsListStore.getWorkflowById.mockReturnValue(mockWorkflow as any);

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
			expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith('existing-workflow');
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

			// Click on the input to open the dropdown
			await userEvent.click(getByTestId('rlc-input'));

			// Get the ResourceLocatorDropdown component to trigger the add resource click
			const addResourceButton = getByTestId('rlc-item-add-resource');
			expect(addResourceButton).toBeInTheDocument();

			// Click the add resource button
			await userEvent.click(addResourceButton);
			await flushPromises();

			// Verify the toast error was shown
			expect(mockToast.showError).toHaveBeenCalledWith(error, 'Error creating sub-workflow');
		});
	});
});
