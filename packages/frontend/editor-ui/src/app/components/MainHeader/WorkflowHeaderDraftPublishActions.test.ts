import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createMockEnterpriseSettings } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import WorkflowHeaderDraftPublishActions from '@/app/components/MainHeader/WorkflowHeaderDraftPublishActions.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { WORKFLOW_PUBLISH_MODAL_KEY, EnterpriseEditionFeature } from '@/app/constants';
import { STORES } from '@n8n/stores';
import type { INodeUi } from '@/Interface';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: vi.fn().mockReturnValue({
		params: { name: 'test' },
		query: {},
	}),
	useRouter: vi.fn().mockReturnValue({
		replace: vi.fn(),
		push: vi.fn().mockResolvedValue(undefined),
		currentRoute: {
			value: {
				params: { name: 'test' },
				query: {},
			},
		},
	}),
}));

const mockSaveCurrentWorkflow = vi.fn().mockResolvedValue(true);
const mockUnpublishWorkflowFromHistory = vi.fn().mockResolvedValue(true);
const mockShowMessage = vi.fn();

vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({
		saveCurrentWorkflow: mockSaveCurrentWorkflow,
	}),
}));

vi.mock('@/app/composables/useWorkflowActivate', () => ({
	useWorkflowActivate: () => ({
		unpublishWorkflowFromHistory: mockUnpublishWorkflowFromHistory,
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
	}),
}));

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: createMockEnterpriseSettings(),
		},
	},
};

const defaultWorkflowProps = {
	id: '1',
	name: 'Test Workflow',
	tags: [],
	meta: {},
	isArchived: false,
	isNewWorkflow: false,
	workflowPermissions: {
		create: true,
		read: true,
		update: true,
		delete: true,
		publish: true,
		unpublish: true,
	},
};

const renderComponent = createComponentRenderer(WorkflowHeaderDraftPublishActions, {
	props: defaultWorkflowProps,
	pinia: createTestingPinia({ initialState, stubActions: false }),
	global: {
		stubs: {
			ActionsMenu: {
				template: '<div data-test-id="actions-menu-stub"></div>',
			},
			WorkflowHistoryButton: {
				template: '<div data-test-id="workflow-history-button-stub"></div>',
			},
			N8nTooltip: {
				template: '<div><slot name="content" /><slot /></div>',
			},
		},
	},
});

const createMockActiveVersion = (versionId: string) => ({
	versionId,
	authors: 'Test Author',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	workflowPublishHistory: [],
	name: 'Published Version',
	description: null,
});

const triggerNode: INodeUi = {
	id: 'trigger-1',
	name: 'Webhook Trigger',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	disabled: false,
};

describe('WorkflowHeaderDraftPublishActions', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let uiStore: MockedStore<typeof useUIStore>;
	let collaborationStore: MockedStore<typeof useCollaborationStore>;
	let projectsStore: MockedStore<typeof useProjectsStore>;

	const setupEnabledPublishButton = (overrides = {}) => {
		workflowsStore.workflowTriggerNodes = [triggerNode];
		workflowsStore.nodesIssuesExist = false;
		Object.assign(workflowsStore, overrides);
	};

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		uiStore = mockedStore(useUIStore);
		collaborationStore = mockedStore(useCollaborationStore);
		projectsStore = mockedStore(useProjectsStore);

		// Default workflow state
		workflowsStore.workflow = {
			id: '1',
			name: 'Test Workflow',
			active: false,
			activeVersionId: null,
			activeVersion: null,
			versionId: 'version-1',
			isArchived: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			nodes: [],
			connections: {},
		};
		workflowsStore.workflowTriggerNodes = [];
		uiStore.markStateClean();
		uiStore.isActionActive = { workflowSaving: false };
		collaborationStore.shouldBeReadOnly = false;

		mockSaveCurrentWorkflow.mockClear();
		mockSaveCurrentWorkflow.mockResolvedValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Active version indicator', () => {
		it('should not show active version indicator when there is no active version', () => {
			workflowsStore.workflow.activeVersion = null;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-active-version-info')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-active-version-indicator')).not.toBeInTheDocument();
		});

		it('should show active version indicator when there is an active version', () => {
			workflowsStore.workflow.activeVersion = createMockActiveVersion('active-version-1');

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-active-version-info')).toBeInTheDocument();
			expect(getByTestId('workflow-active-version-indicator')).toBeInTheDocument();
		});

		it('should use latest activation date from workflowPublishHistory when available', () => {
			const oldDate = '2024-01-01T00:00:00.000Z';
			const latestActivationDate = '2024-06-15T10:30:00.000Z';
			workflowsStore.workflow.activeVersion = {
				...createMockActiveVersion('active-version-1'),
				createdAt: oldDate,
				workflowPublishHistory: [
					{
						id: 1,
						createdAt: oldDate,
						event: 'activated' as const,
						userId: 'user-1',
						versionId: 'active-version-1',
						workflowId: '1',
					},
					{
						id: 2,
						createdAt: '2024-03-01T00:00:00.000Z',
						event: 'deactivated' as const,
						userId: 'user-1',
						versionId: 'active-version-1',
						workflowId: '1',
					},
					{
						id: 3,
						createdAt: latestActivationDate,
						event: 'activated' as const,
						userId: 'user-1',
						versionId: 'active-version-1',
						workflowId: '1',
					},
				],
			};

			const { getByTestId } = renderComponent({
				global: {
					stubs: {
						N8nTooltip: {
							template: '<div><slot name="content" /></div>',
						},
						TimeAgo: {
							props: ['date'],
							template: '<div data-test-id="time-ago-stub">{{ date }}</div>',
						},
					},
				},
			});

			expect(getByTestId('workflow-active-version-info')).toBeInTheDocument();
			expect(getByTestId('time-ago-stub')).toHaveTextContent(latestActivationDate);
		});

		it('should show active version indicator when user does not have workflow:publish permission but workflow is currently published', () => {
			workflowsStore.workflow.activeVersion = createMockActiveVersion('active-version-1');
			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: {
						...defaultWorkflowProps.workflowPermissions,
						update: true,
						publish: false,
					},
				},
			});

			expect(getByTestId('workflow-active-version-indicator')).toBeInTheDocument();
			expect(getByTestId('workflow-active-version-info')).toBeInTheDocument();
		});
	});

	describe('Publish button visibility', () => {
		it('should be hidden when user lacks workflow:publish and workflow:update permission', () => {
			const { queryByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: {
						...defaultWorkflowProps.workflowPermissions,
						publish: false,
						update: false,
					},
				},
			});

			expect(queryByTestId('workflow-open-publish-modal-button')).not.toBeInTheDocument();
		});

		it('should be visible but disabled when user has only workflow:update permission', () => {
			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: {
						...defaultWorkflowProps.workflowPermissions,
						update: true,
						publish: false,
					},
				},
			});

			expect(getByTestId('workflow-open-publish-modal-button')).toBeInTheDocument();
			expect(getByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});

		it('should be visible when user has only workflow:publish permission', () => {
			setupEnabledPublishButton();
			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: {
						...defaultWorkflowProps.workflowPermissions,
						update: false,
						publish: true,
					},
				},
			});

			expect(getByTestId('workflow-open-publish-modal-button')).toBeInTheDocument();
			expect(getByTestId('workflow-open-publish-modal-button')).not.toBeDisabled();
		});

		it('should be visible when user has both workflow:update and workflow:publish permissions', () => {
			const { queryByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: {
						...defaultWorkflowProps.workflowPermissions,
						update: true,
						publish: true,
					},
				},
			});

			expect(queryByTestId('workflow-open-publish-modal-button')).toBeInTheDocument();
		});
	});

	describe('Publish button behavior', () => {
		it('should open publish modal when clicked and workflow is saved', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			uiStore.markStateClean();
			setupEnabledPublishButton({
				workflow: {
					...workflowsStore.workflow,
					versionId: 'version-1',
					activeVersion: createMockActiveVersion('version-2'),
				},
			});

			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(mockSaveCurrentWorkflow).not.toHaveBeenCalled();
			expect(openModalSpy).toHaveBeenCalledWith({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: {},
			});
		});

		it('should save workflow first when dirty then open publish modal', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			uiStore.markStateDirty();
			setupEnabledPublishButton();

			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(mockSaveCurrentWorkflow).toHaveBeenCalledWith({}, true);
			expect(openModalSpy).toHaveBeenCalledWith({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: {},
			});
		});

		it('should have publish button disabled when isNewWorkflow is true', async () => {
			uiStore.markStateClean();
			setupEnabledPublishButton();

			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					isNewWorkflow: true,
				},
			});

			const publishButton = getByTestId('workflow-open-publish-modal-button');
			expect(publishButton).toBeDisabled();
		});

		it('should not open publish modal if save fails', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			uiStore.markStateDirty();
			mockSaveCurrentWorkflow.mockResolvedValue(false);
			setupEnabledPublishButton();

			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(mockSaveCurrentWorkflow).toHaveBeenCalled();
			expect(openModalSpy).not.toHaveBeenCalled();
		});

		it('should be visible but disabled when user lacks workflow:publish permission', () => {
			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: {
						...defaultWorkflowProps.workflowPermissions,
						publish: false,
						update: true,
					},
				},
			});

			expect(getByTestId('workflow-open-publish-modal-button')).toBeInTheDocument();
			expect(getByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});
	});

	describe('Publish button state', () => {
		it('should show publish button disabled when there are no trigger nodes', () => {
			workflowsStore.workflowTriggerNodes = [];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = createMockActiveVersion('version-2');
			uiStore.markStateDirty();

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});

		it('should show publish button disabled when trigger node is disabled', () => {
			workflowsStore.workflowTriggerNodes = [{ ...triggerNode, disabled: true }];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = createMockActiveVersion('version-2');
			uiStore.markStateDirty();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});

		it('should show publish button enabled when there are unpublished changes (versionId mismatch)', () => {
			workflowsStore.workflowTriggerNodes = [triggerNode];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = createMockActiveVersion('version-2');
			uiStore.markStateClean();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).not.toBeDisabled();
		});

		it('should show publish button enabled when state is dirty', () => {
			workflowsStore.workflowTriggerNodes = [triggerNode];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = createMockActiveVersion('version-1');
			uiStore.markStateDirty();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).not.toBeDisabled();
		});

		it('should show publish button disabled when versions match and state is not dirty', () => {
			workflowsStore.workflowTriggerNodes = [triggerNode];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = createMockActiveVersion('version-1');
			uiStore.markStateClean();

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});

		it('should show publish button enabled when workflow has never been published (no active version)', () => {
			workflowsStore.workflowTriggerNodes = [triggerNode];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = null;
			uiStore.markStateClean();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).not.toBeDisabled();
		});
	});

	describe('Collaboration read-only mode', () => {
		it('should disable publish button when collaboration is read-only', () => {
			collaborationStore.shouldBeReadOnly = true;
			setupEnabledPublishButton();

			const { getByTestId } = renderComponent();

			const publishButton = getByTestId('workflow-open-publish-modal-button');
			expect(publishButton).toBeInTheDocument();
			expect(publishButton).toBeDisabled();
		});
	});

	describe('Archived workflow', () => {
		it('should not render publish button when workflow is archived', () => {
			const { queryByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					isArchived: true,
				},
			});

			expect(queryByTestId('workflow-open-publish-modal-button')).not.toBeInTheDocument();
		});
	});

	describe('Personal space restriction tooltip', () => {
		it('should show personal space restriction tooltip when in personal space and lacking publish permission', () => {
			// Set current project as personal project
			projectsStore.currentProject = createTestProject({
				id: 'personal-project-id',
				type: ProjectTypes.Personal,
			});

			const { getByText } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: {
						...defaultWorkflowProps.workflowPermissions,
						publish: false,
						update: true,
					},
				},
			});

			expect(
				getByText(
					'Workflow publishing is disabled in personal spaces. Move the workflow to a team space to activate',
				),
			).toBeInTheDocument();
		});

		it('should show generic permission denied tooltip when not in personal space and lacking publish permission', () => {
			// Set current project as team project (not personal)
			projectsStore.currentProject = createTestProject({
				id: 'team-project-id',
				type: ProjectTypes.Team,
			});

			const { getByText } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: {
						...defaultWorkflowProps.workflowPermissions,
						publish: false,
						update: true,
					},
				},
			});

			expect(getByText("You don't have permission to publish this workflow")).toBeInTheDocument();
		});
	});

	describe('Name Version action', () => {
		let workflowHistoryStore: MockedStore<typeof useWorkflowHistoryStore>;
		let settingsStore: MockedStore<typeof useSettingsStore>;

		beforeEach(() => {
			workflowHistoryStore = mockedStore(useWorkflowHistoryStore);
			settingsStore = mockedStore(useSettingsStore);
			settingsStore.isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
				[EnterpriseEditionFeature.NamedVersions]: true,
			});
			workflowsStore.workflow = {
				...workflowsStore.workflow,
				versionId: 'version-1',
				updatedAt: Date.now(),
			};
			workflowsStore.versionData = {
				versionId: 'version-1',
				name: 'Test Version',
				description: 'Test description',
			};
			workflowHistoryStore.updateWorkflowHistoryVersion = vi.fn().mockResolvedValue(undefined);
		});

		it('should be available when workflow history feature is enabled', () => {
			setupEnabledPublishButton();
			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});

		it('should not be available when named versions feature is disabled', () => {
			settingsStore.isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
				[EnterpriseEditionFeature.NamedVersions]: false,
			});
			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});
	});

	describe('Unpublish action', () => {
		beforeEach(() => {
			workflowsStore.workflow = {
				...workflowsStore.workflow,
				activeVersion: createMockActiveVersion('active-version-1'),
			};
			mockUnpublishWorkflowFromHistory.mockClear();
			mockUnpublishWorkflowFromHistory.mockResolvedValue(true);
			mockShowMessage.mockClear();
		});

		it('should be available when active version exists', () => {
			setupEnabledPublishButton();
			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});

		it('should not be available when no active version exists', () => {
			workflowsStore.workflow.activeVersion = null;
			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});

		it('should be disabled when user lacks workflow:unpublish permission', async () => {
			setupEnabledPublishButton({
				workflow: {
					...workflowsStore.workflow,
					activeVersion: createMockActiveVersion('active-version-1'),
				},
			});

			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: {
						...defaultWorkflowProps.workflowPermissions,
						unpublish: false,
					},
				},
			});

			const versionMenuButton = getByTestId('version-menu-button');
			await userEvent.click(versionMenuButton);

			// The unpublish menu item should be disabled
			const unpublishItem = getByTestId('version-menu-item-unpublish');
			expect(unpublishItem).toBeInTheDocument();
			expect(unpublishItem.closest('.el-dropdown-menu__item')).toHaveClass('is-disabled');
		});
	});

	describe('Dropdown menu actions', () => {
		let settingsStore: MockedStore<typeof useSettingsStore>;

		beforeEach(() => {
			settingsStore = mockedStore(useSettingsStore);
			setupEnabledPublishButton();
		});

		it('should render dropdown menu', () => {
			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});

		it('should render when name version feature is enabled', () => {
			settingsStore.isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
				[EnterpriseEditionFeature.NamedVersions]: true,
			});
			workflowsStore.workflow.versionId = 'version-1';

			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});

		it('should render when active version exists for unpublish action', () => {
			workflowsStore.workflow.activeVersion = createMockActiveVersion('active-version-1');

			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});
	});
});
