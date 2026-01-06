import WorkflowDetails from '@/app/components/MainHeader/WorkflowDetails.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import {
	EnterpriseEditionFeature,
	MODAL_CONFIRM,
	VIEWS,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/app/constants';
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/features/collaboration/projects/projects.constants';
import type { IWorkflowDb } from '@/Interface';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '@/app/stores/ui.store';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
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

vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({
		saveCurrentWorkflow: vi.fn().mockResolvedValue(true),
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
let projectsStore: MockedStore<typeof useProjectsStore>;
let message: ReturnType<typeof useMessage>;
let toast: ReturnType<typeof useToast>;
let router: ReturnType<typeof useRouter>;

const workflow = {
	id: '1',
	name: 'Test Workflow',
	tags: ['1', '2'],
	active: false,
	isArchived: false,
	scopes: [],
	meta: {},
};

describe('WorkflowDetails', () => {
	beforeEach(() => {
		uiStore = useUIStore();
		workflowsStore = mockedStore(useWorkflowsStore);
		projectsStore = mockedStore(useProjectsStore);

		// Set up default mocks
		workflowsStore.saveCurrentWorkflow = vi.fn().mockResolvedValue(true);
		workflowsStore.workflowsById = {
			'1': workflow as unknown as IWorkflowDb,
			'123': workflow as unknown as IWorkflowDb,
		};
		workflowsStore.isWorkflowSaved = { '1': true, '123': true };
		projectsStore.currentProject = null;
		projectsStore.personalProject = { id: 'personal', name: 'Personal' } as Project;

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

		it('should not have workflow duplicate and import without update permission', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
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
					...workflow,
					readOnly: false,
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

			workflowsStore.getWorkflowById = vi.fn().mockReturnValue(teamWorkflow);
			workflowsStore.archiveWorkflow.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent({
				props: {
					...teamWorkflow,
					active: false,
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-archive'));

			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledWith(teamWorkflow.id);
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

			workflowsStore.getWorkflowById = vi.fn().mockReturnValue(personalWorkflow);
			workflowsStore.archiveWorkflow.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent({
				props: {
					...personalWorkflow,
					active: false,
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-archive'));

			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledWith(personalWorkflow.id);
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

			workflowsStore.getWorkflowById = vi.fn().mockReturnValue(teamWorkflow);
			workflowsStore.deleteWorkflow.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent({
				props: {
					...teamWorkflow,
					readOnly: false,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-delete'));

			expect(workflowsStore.deleteWorkflow).toHaveBeenCalledWith(teamWorkflow.id);
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

			workflowsStore.getWorkflowById = vi.fn().mockReturnValue(personalWorkflow);
			workflowsStore.deleteWorkflow.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent({
				props: {
					...personalWorkflow,
					readOnly: false,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-delete'));

			expect(workflowsStore.deleteWorkflow).toHaveBeenCalledWith(personalWorkflow.id);
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOWS,
			});
		});

		it("should call onWorkflowMenuSelect on 'Change owner' option click", async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			workflowsStore.workflowsById = { [workflow.id]: workflow as unknown as IWorkflowDb };

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

	describe('Toast notifications', () => {
		it('should show personal toast when creating workflow without project context', async () => {
			vi.mocked(useRoute).mockReturnValueOnce({
				meta: {
					nodeView: true,
				},
				query: { new: 'true' },
				params: { name: 'test' },
			} as unknown as ReturnType<typeof useRoute>);

			projectsStore.currentProject = null;

			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					id: 'new',
					readOnly: false,
				},
			});

			await userEvent.click(getByTestId('workflow-save-button'));

			expect(toast.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'success',
					title: 'Workflow successfully created inside your personal space',
				}),
			);
		});

		it('should show project toast when creating workflow in non-personal project', async () => {
			vi.mocked(useRoute).mockReturnValueOnce({
				meta: {
					nodeView: true,
				},
				query: { new: 'true' },
				params: { name: 'test' },
			} as unknown as ReturnType<typeof useRoute>);

			projectsStore.currentProject = {
				id: 'project-1',
				name: 'Test Project',
				type: 'team',
				icon: null,
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
				relations: [],
				scopes: [],
			};

			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					id: 'new',
					readOnly: false,
				},
			});

			await userEvent.click(getByTestId('workflow-save-button'));

			expect(toast.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'success',
					title: 'Workflow successfully created in Test Project',
					message: 'All members from Test Project will have access to this workflow.',
				}),
			);
		});

		it('should show folder toast when creating workflow in folder context', async () => {
			vi.mocked(useRoute).mockReturnValueOnce({
				meta: {
					nodeView: true,
				},
				query: { new: 'true' },
				params: { name: 'test' },
			} as unknown as ReturnType<typeof useRoute>);

			projectsStore.currentProject = {
				id: 'project-1',
				name: 'Test Project',
				type: 'team',
				icon: null,
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
				relations: [],
				scopes: [],
			};

			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					id: 'new',
					readOnly: false,
					currentFolder: { id: 'folder-1', name: 'Test Folder' },
				},
			});

			await userEvent.click(getByTestId('workflow-save-button'));

			expect(toast.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'success',
					title: 'Workflow successfully created in "Test Project", within "Test Folder"',
					message: 'All members from Test Project will have access to this workflow.',
				}),
			);
		});

		it('should not show toast when saving existing workflow', async () => {
			vi.mocked(useRoute).mockReturnValueOnce({
				meta: {
					nodeView: true,
				},
				query: { parentFolderId: '1' },
				params: { name: 'test' },
			} as unknown as ReturnType<typeof useRoute>);

			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					id: '123',
					readOnly: false,
				},
			});

			await userEvent.click(getByTestId('workflow-save-button'));

			expect(toast.showMessage).not.toHaveBeenCalled();
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
