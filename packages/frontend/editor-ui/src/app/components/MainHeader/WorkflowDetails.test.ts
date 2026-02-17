import WorkflowDetails from '@/app/components/MainHeader/WorkflowDetails.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestWorkflow } from '@/__tests__/mocks';
import type { IWorkflowDb } from '@/Interface';
import {
	EnterpriseEditionFeature,
	MODAL_CONFIRM,
	VIEWS,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/app/constants';
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/features/collaboration/projects/projects.constants';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '@/app/stores/ui.store';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { SourceControlPreferences } from '@/features/integrations/sourceControl.ee/sourceControl.types';
import type { Project } from '@/features/collaboration/projects/projects.types';

vi.mock('vue-router', async (importOriginal) => ({
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: vi.fn().mockReturnValue({
		params: { name: 'test' },
		query: { parentFolderId: '1' },
		meta: {
			nodeView: true,
		},
	}),
	useRouter: vi.fn().mockReturnValue({
		replace: vi.fn(),
		push: vi.fn().mockResolvedValue(undefined),
		currentRoute: {
			value: {
				params: {
					name: 'test',
				},
				query: { parentFolderId: '1' },
			},
		},
	}),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
	}),
}));

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
		}),
	};
});

vi.mock('@/app/composables/useMessage', () => {
	const confirm = vi.fn(async () => MODAL_CONFIRM);
	return {
		useMessage: () => ({
			confirm,
		}),
	};
});

const mockSaveCurrentWorkflow = vi.fn().mockResolvedValue(true);

vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({
		saveCurrentWorkflow: mockSaveCurrentWorkflow,
	}),
}));

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: {
				[EnterpriseEditionFeature.Sharing]: true,
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
		directives: {
			loading: {
				mounted() {},
				updated() {},
				unmounted() {},
			},
		},
	},
});

let uiStore: ReturnType<typeof useUIStore>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;
let collaborationStore: MockedStore<typeof useCollaborationStore>;
let sourceControlStore: MockedStore<typeof useSourceControlStore>;
let message: ReturnType<typeof useMessage>;
let toast: ReturnType<typeof useToast>;
let router: ReturnType<typeof useRouter>;

const workflow = createTestWorkflow({
	id: '1',
	name: 'Test Workflow',
	tags: ['1', '2'],
	active: false,
	isArchived: false,
	scopes: [],
	meta: {},
});

// Extract props with correct types for WorkflowDetails component
const defaultProps = {
	id: workflow.id,
	tags: ['1', '2'] as readonly string[],
	name: workflow.name,
	meta: workflow.meta,
	scopes: workflow.scopes,
	active: workflow.active,
	isArchived: workflow.isArchived,
	description: workflow.description,
};

describe('WorkflowDetails', () => {
	beforeEach(() => {
		uiStore = useUIStore();
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
		projectsStore = mockedStore(useProjectsStore);
		collaborationStore = mockedStore(useCollaborationStore);
		sourceControlStore = mockedStore(useSourceControlStore);

		// Set up default mocks
		mockSaveCurrentWorkflow.mockClear();
		mockSaveCurrentWorkflow.mockResolvedValue(true);
		workflowsListStore.workflowsById = {
			'1': workflow,
			'123': workflow,
		};
		workflowsStore.isWorkflowSaved = { '1': true, '123': true };
		workflowsStore.workflowId = workflow.id;
		workflowsStore.workflowChecksum = 'test-checksum';
		projectsStore.currentProject = null;
		projectsStore.personalProject = { id: 'personal', name: 'Personal' } as Project;
		collaborationStore.shouldBeReadOnly = false;
		sourceControlStore.preferences = { branchReadOnly: false } as SourceControlPreferences;

		message = useMessage();
		toast = useToast();
		router = useRouter();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders workflow name and tags', async () => {
		vi.mocked(useRoute).mockReturnValueOnce({
			query: { parentFolderId: '1' },
		} as unknown as ReturnType<typeof useRoute>);
		const { getByTestId, getByText } = renderComponent({
			props: {
				...defaultProps,
			},
		});

		const workflowNameInput = getByTestId('inline-edit-input');

		expect(workflowNameInput).toHaveValue('Test Workflow');
		expect(getByText('tag1')).toBeInTheDocument();
		expect(getByText('tag2')).toBeInTheDocument();
	});

	it('opens share modal on share button click', async () => {
		const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

		const { getByTestId } = renderComponent({
			props: {
				...defaultProps,
			},
		});

		await userEvent.click(getByTestId('workflow-menu'));
		await userEvent.click(getByTestId('workflow-menu-item-share'));
		expect(openModalSpy).toHaveBeenCalledWith({
			name: WORKFLOW_SHARE_MODAL_KEY,
			data: { id: '1' },
		});
	});

	describe('Workflow menu', () => {
		beforeEach(() => {
			vi.mocked(useRoute).mockReturnValueOnce({
				meta: {
					nodeView: true,
				},
				query: { parentFolderId: '1' },
				params: { name: 'test' },
			} as unknown as ReturnType<typeof useRoute>);
		});

		it('should not have workflow duplicate and import when branch is read-only', async () => {
			sourceControlStore.preferences.branchReadOnly = true;

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...defaultProps,
					isArchived: false,
					scopes: ['workflow:read'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));

			expect(queryByTestId('workflow-menu-item-duplicate')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-import-from-url')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-import-from-file')).not.toBeInTheDocument();
		});

		it('should not have workflow duplicate and import when collaboration is read-only', async () => {
			collaborationStore.shouldBeReadOnly = true;

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...defaultProps,
					isArchived: false,
					scopes: ['workflow:read'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));

			expect(queryByTestId('workflow-menu-item-duplicate')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-import-from-url')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-import-from-file')).not.toBeInTheDocument();
		});

		it('should have workflow duplicate and import options if permission update is true', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...defaultProps,
					isArchived: false,
					scopes: ['workflow:update'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));

			expect(getByTestId('workflow-menu-item-duplicate')).toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-import-from-url')).toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-import-from-file')).toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-share')).toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
		});

		it("should have disabled 'Archive' option on new workflow", async () => {
			vi.mocked(useRoute)
				.mockReset()
				.mockReturnValue({
					meta: {
						nodeView: true,
					},
					query: { parentFolderId: '1', new: 'true' },
					params: { name: 'test' },
				} as unknown as ReturnType<typeof useRoute>);

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...defaultProps,
					id: 'new',
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
					...defaultProps,
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

		it("should not have 'Archive' option on non archived workflow when branch is read-only", async () => {
			sourceControlStore.preferences.branchReadOnly = true;

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...defaultProps,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
		});

		it("should not have 'Archive' option on non archived workflow when collaboration is read-only", async () => {
			collaborationStore.shouldBeReadOnly = true;

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...defaultProps,
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
					...defaultProps,
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
					...defaultProps,
					isArchived: true,
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

		it("should not have 'Unarchive' or 'Delete' options on archived workflow when branch is read-only", async () => {
			sourceControlStore.preferences.branchReadOnly = true;

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...defaultProps,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
		});

		it("should not have 'Unarchive' or 'Delete' options on archived workflow when collaboration is read-only", async () => {
			collaborationStore.shouldBeReadOnly = true;

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...defaultProps,
					isArchived: true,
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
					...defaultProps,
					isArchived: true,
					scopes: ['workflow:update'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
		});

		it('should not have edit actions on archived workflow even with update permission', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...defaultProps,
					isArchived: true,
					scopes: ['workflow:update', 'workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-duplicate')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-import-from-url')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-import-from-file')).not.toBeInTheDocument();
		});

		it("should call onWorkflowMenuSelect on 'Archive' option click on nonactive workflow", async () => {
			const { getByTestId } = renderComponent({
				props: {
					...defaultProps,
					active: false,
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
			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledWith(workflow.id, 'test-checksum');
			expect(router.push).toHaveBeenCalledTimes(1);
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOWS,
			});
		});

		it("should navigate to team project workflows page on 'Archive' for team project workflow", async () => {
			const teamProjectId = 'team-project-123';
			const teamWorkflow = {
				...workflow,
				homeProject: {
					id: teamProjectId,
					name: 'Team Project',
					type: 'team',
				},
			};

			workflowsListStore.getWorkflowById.mockReturnValue(teamWorkflow as IWorkflowDb);
			workflowsStore.archiveWorkflow.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent({
				props: {
					...defaultProps,
					active: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-archive'));

			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledWith(teamWorkflow.id, 'test-checksum');
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: teamProjectId },
			});
		});

		it("should navigate to personal workflows page on 'Archive' for personal project workflow", async () => {
			const personalWorkflow = {
				...workflow,
				homeProject: {
					id: 'personal-project-123',
					name: 'Personal Project',
					type: 'personal',
				},
			};

			workflowsListStore.getWorkflowById.mockReturnValue(personalWorkflow as IWorkflowDb);
			workflowsStore.archiveWorkflow.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent({
				props: {
					...defaultProps,
					active: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-archive'));

			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledWith(
				personalWorkflow.id,
				'test-checksum',
			);
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOWS,
			});
		});

		it("should confirm onWorkflowMenuSelect on 'Archive' option click on active workflow", async () => {
			const { getByTestId } = renderComponent({
				props: {
					...defaultProps,
					active: true,
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
			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledWith(workflow.id, 'test-checksum');
			expect(router.push).toHaveBeenCalledTimes(1);
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOWS,
			});
		});

		it("should call onWorkflowMenuSelect on 'Unarchive' option click", async () => {
			const { getByTestId } = renderComponent({
				props: {
					...defaultProps,
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
					...defaultProps,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-delete'));

			expect(message.confirm).toHaveBeenCalledTimes(1);
			expect(toast.showError).toHaveBeenCalledTimes(0);
			expect(toast.showMessage).toHaveBeenCalledTimes(1);
			expect(workflowsListStore.deleteWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowsListStore.deleteWorkflow).toHaveBeenCalledWith(workflow.id);
			expect(router.push).toHaveBeenCalledTimes(1);
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOWS,
			});
		});

		it("should navigate to team project workflows page on 'Delete' for team project workflow", async () => {
			const teamProjectId = 'team-project-456';
			const teamWorkflow = {
				...workflow,
				isArchived: true,
				homeProject: {
					id: teamProjectId,
					name: 'Team Project',
					type: 'team',
				},
			};

			workflowsListStore.getWorkflowById.mockReturnValue(teamWorkflow as IWorkflowDb);
			workflowsListStore.deleteWorkflow.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent({
				props: {
					...defaultProps,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-delete'));

			expect(workflowsListStore.deleteWorkflow).toHaveBeenCalledWith(teamWorkflow.id);
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: teamProjectId },
			});
		});

		it("should navigate to personal workflows page on 'Delete' for personal project workflow", async () => {
			const personalWorkflow = {
				...workflow,
				isArchived: true,
				homeProject: {
					id: 'personal-project-456',
					name: 'Personal Project',
					type: 'personal',
				},
			};

			workflowsListStore.getWorkflowById.mockReturnValue(personalWorkflow as IWorkflowDb);
			workflowsListStore.deleteWorkflow.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent({
				props: {
					...defaultProps,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-delete'));

			expect(workflowsListStore.deleteWorkflow).toHaveBeenCalledWith(personalWorkflow.id);
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOWS,
			});
		});

		it("should call onWorkflowMenuSelect on 'Change owner' option click", async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			workflowsListStore.workflowsById = { [workflow.id]: workflow };

			const { getByTestId } = renderComponent({
				props: {
					...defaultProps,
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
					...defaultProps,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
			});

			expect(getByTestId('workflow-archived-tag')).toBeVisible();
		});

		it('should not show badge on non archived workflow', async () => {
			const { queryByTestId } = renderComponent({
				props: {
					...defaultProps,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			expect(queryByTestId('workflow-archived-tag')).not.toBeInTheDocument();
		});
	});
});
