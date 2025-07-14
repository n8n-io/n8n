import WorkflowDetails from '@/components/MainHeader/WorkflowDetails.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import {
	EnterpriseEditionFeature,
	MODAL_CONFIRM,
	VIEWS,
	WORKFLOW_SHARE_MODAL_KEY,
	PROJECT_MOVE_RESOURCE_MODAL,
} from '@/constants';
import type { IWorkflowDb } from '@/Interface';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '@/stores/ui.store';
import type { Mock } from 'vitest';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useWorkflowsStore } from '@/stores/workflows.store';

vi.mock('vue-router', async (importOriginal) => ({
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: vi.fn().mockReturnValue({}),
	useRouter: vi.fn().mockReturnValue({
		replace: vi.fn(),
		push: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('@/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
	}),
}));

vi.mock('@/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
		}),
	};
});

vi.mock('@/composables/useMessage', () => {
	const confirm = vi.fn(async () => MODAL_CONFIRM);
	return {
		useMessage: () => ({
			confirm,
		}),
	};
});

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: {
				[EnterpriseEditionFeature.Sharing]: true,
				[EnterpriseEditionFeature.WorkflowHistory]: true,
				projects: {
					team: {
						limit: -1,
					},
				},
			},
		},
		areTagsEnabled: true,
	},
	[STORES.TAGS]: {
		tagsById: {
			1: {
				id: '1',
				name: 'tag1',
			},
			2: {
				id: '2',
				name: 'tag2',
			},
		},
	},
};

const renderComponent = createComponentRenderer(WorkflowDetails, {
	pinia: createTestingPinia({ initialState }),
	global: {
		stubs: {
			RouterLink: true,
			FolderBreadcrumbs: {
				template: '<div><slot name="append" /></div>',
			},
		},
	},
});

let uiStore: ReturnType<typeof useUIStore>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let message: ReturnType<typeof useMessage>;
let toast: ReturnType<typeof useToast>;
let router: ReturnType<typeof useRouter>;

const workflow = {
	id: '1',
	name: 'Test Workflow',
	tags: ['1', '2'],
	active: false,
	isArchived: false,
};

describe('WorkflowDetails', () => {
	beforeEach(() => {
		uiStore = useUIStore();
		workflowsStore = mockedStore(useWorkflowsStore);

		message = useMessage();
		toast = useToast();
		router = useRouter();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders workflow name and tags', async () => {
		(useRoute as Mock).mockReturnValue({
			query: { parentFolderId: '1' },
		});
		const { getByTestId, getByText } = renderComponent({
			props: {
				...workflow,
				readOnly: false,
			},
		});

		const workflowNameInput = getByTestId('inline-edit-input');

		expect(workflowNameInput).toHaveValue('Test Workflow');
		expect(getByText('tag1')).toBeInTheDocument();
		expect(getByText('tag2')).toBeInTheDocument();
	});

	it('calls save function on save button click', async () => {
		const onSaveButtonClick = vi.fn();
		const { getByTestId } = renderComponent({
			props: {
				...workflow,
				readOnly: false,
			},
			global: {
				mocks: {
					onSaveButtonClick,
				},
			},
		});

		await userEvent.click(getByTestId('workflow-save-button'));
		expect(onSaveButtonClick).toHaveBeenCalled();
	});

	it('opens share modal on share button click', async () => {
		const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

		const { getByTestId } = renderComponent({
			props: {
				...workflow,
				readOnly: false,
			},
		});

		await userEvent.click(getByTestId('workflow-share-button'));
		expect(openModalSpy).toHaveBeenCalledWith({
			name: WORKFLOW_SHARE_MODAL_KEY,
			data: { id: '1' },
		});
	});

	describe('Workflow menu', () => {
		beforeEach(() => {
			(useRoute as Mock).mockReturnValue({
				meta: {
					nodeView: true,
				},
				query: { parentFolderId: '1' },
			});
		});

		it("should have disabled 'Archive' option on new workflow", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					id: 'new',
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-archive')).toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-archive')).toHaveClass('disabled');
		});

		it("should have 'Archive' option on non archived workflow", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-archive')).toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-archive')).not.toHaveClass('disabled');
		});

		it("should not have 'Archive' option on non archived readonly workflow", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: true,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
		});

		it("should not have 'Archive' option on non archived workflow without permission", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:update'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
		});

		it("should have 'Unarchive' and 'Delete' options on archived workflow", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					isArchived: true,
					readOnly: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-delete')).toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-delete')).not.toHaveClass('disabled');
			expect(getByTestId('workflow-menu-item-unarchive')).toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-unarchive')).not.toHaveClass('disabled');
		});

		it("should not have 'Unarchive' or 'Delete' options on archived readonly workflow", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					isArchived: true,
					readOnly: true,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
		});

		it("should not have 'Unarchive' or 'Delete' options on archived workflow without permission", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					isArchived: true,
					readOnly: false,
					scopes: ['workflow:update'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
		});

		it("should call onWorkflowMenuSelect on 'Archive' option click on nonactive workflow", async () => {
			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					active: false,
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			workflowsStore.archiveWorkflow.mockResolvedValue(undefined);

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-archive'));

			expect(message.confirm).toHaveBeenCalledTimes(0);
			expect(toast.showError).toHaveBeenCalledTimes(0);
			expect(toast.showMessage).toHaveBeenCalledTimes(1);
			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledWith(workflow.id);
			expect(router.push).toHaveBeenCalledTimes(1);
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOWS,
			});
		});

		it("should confirm onWorkflowMenuSelect on 'Archive' option click on active workflow", async () => {
			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					active: true,
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			workflowsStore.archiveWorkflow.mockResolvedValue(undefined);

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-archive'));

			expect(message.confirm).toHaveBeenCalledTimes(1);
			expect(toast.showError).toHaveBeenCalledTimes(0);
			expect(toast.showMessage).toHaveBeenCalledTimes(1);
			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledWith(workflow.id);
			expect(router.push).toHaveBeenCalledTimes(1);
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOWS,
			});
		});

		it("should call onWorkflowMenuSelect on 'Unarchive' option click", async () => {
			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-unarchive'));

			expect(toast.showError).toHaveBeenCalledTimes(0);
			expect(toast.showMessage).toHaveBeenCalledTimes(1);
			expect(workflowsStore.unarchiveWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowsStore.unarchiveWorkflow).toHaveBeenCalledWith(workflow.id);
		});

		it("should call onWorkflowMenuSelect on 'Delete' option click", async () => {
			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-delete'));

			expect(message.confirm).toHaveBeenCalledTimes(1);
			expect(toast.showError).toHaveBeenCalledTimes(0);
			expect(toast.showMessage).toHaveBeenCalledTimes(1);
			expect(workflowsStore.deleteWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowsStore.deleteWorkflow).toHaveBeenCalledWith(workflow.id);
			expect(router.push).toHaveBeenCalledTimes(1);
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOWS,
			});
		});

		it("should call onWorkflowMenuSelect on 'Change owner' option click", async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			workflowsStore.workflowsById = { [workflow.id]: workflow as IWorkflowDb };

			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					scopes: ['workflow:move'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-change-owner'));

			expect(openModalSpy).toHaveBeenCalledWith({
				name: PROJECT_MOVE_RESOURCE_MODAL,
				data: expect.objectContaining({ resource: expect.objectContaining({ id: workflow.id }) }),
			});
		});
	});

	describe('Archived badge', () => {
		it('should show badge on archived workflow', async () => {
			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
			});

			expect(getByTestId('workflow-archived-tag')).toBeVisible();
		});

		it('should not show badge on non archived workflow', async () => {
			const { queryByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			expect(queryByTestId('workflow-archived-tag')).not.toBeInTheDocument();
		});
	});
});
