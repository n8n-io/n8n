import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';
import WorkflowHeaderDraftPublishActions from '@/app/components/MainHeader/WorkflowHeaderDraftPublishActions.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import type { INodeUi } from '@/Interface';

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

vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({
		saveCurrentWorkflow: mockSaveCurrentWorkflow,
	}),
}));

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: {},
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
	},
};

const renderComponent = createComponentRenderer(WorkflowHeaderDraftPublishActions, {
	props: defaultWorkflowProps,
	pinia: createTestingPinia({ initialState }),
	global: {
		stubs: {
			ActionsMenu: {
				template: '<div data-test-id="actions-menu-stub"></div>',
			},
			WorkflowHistoryButton: {
				template: '<div data-test-id="workflow-history-button-stub"></div>',
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

describe('WorkflowHeaderDraftPublishActions', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let uiStore: MockedStore<typeof useUIStore>;

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		uiStore = mockedStore(useUIStore);

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
		uiStore.stateIsDirty = false;
		uiStore.isActionActive = { workflowSaving: false };

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

			expect(queryByTestId('workflow-active-version-indicator')).not.toBeInTheDocument();
		});

		it('should show active version indicator when there is an active version', () => {
			workflowsStore.workflow.activeVersion = createMockActiveVersion('active-version-1');

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-active-version-indicator')).toBeInTheDocument();
		});
	});

	describe('Publish button behavior', () => {
		it('should open publish modal when clicked and workflow is saved', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			uiStore.stateIsDirty = false;

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
			uiStore.stateIsDirty = true;

			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(mockSaveCurrentWorkflow).toHaveBeenCalledWith({}, true);
			expect(openModalSpy).toHaveBeenCalledWith({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: {},
			});
		});

		it('should save workflow first when isNewWorkflow is true then open publish modal', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			uiStore.stateIsDirty = false;

			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					isNewWorkflow: true,
				},
			});

			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(mockSaveCurrentWorkflow).toHaveBeenCalledWith({}, true);
			expect(openModalSpy).toHaveBeenCalledWith({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: {},
			});
		});

		it('should not open publish modal if save fails', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			uiStore.stateIsDirty = true;
			mockSaveCurrentWorkflow.mockResolvedValue(false);

			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(mockSaveCurrentWorkflow).toHaveBeenCalled();
			expect(openModalSpy).not.toHaveBeenCalled();
		});
	});

	describe('Publish indicator visibility', () => {
		const triggerNode: INodeUi = {
			id: 'trigger-1',
			name: 'Webhook Trigger',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			disabled: false,
		};

		it('should not show publish indicator when there are no trigger nodes', () => {
			workflowsStore.workflowTriggerNodes = [];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = createMockActiveVersion('version-2');
			uiStore.stateIsDirty = true;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-indicator')).not.toBeInTheDocument();
		});

		it('should not show publish indicator when trigger node is disabled', () => {
			workflowsStore.workflowTriggerNodes = [{ ...triggerNode, disabled: true }];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = createMockActiveVersion('version-2');
			uiStore.stateIsDirty = true;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-indicator')).not.toBeInTheDocument();
		});

		it('should show publish indicator when there are unpublished changes (versionId mismatch)', () => {
			workflowsStore.workflowTriggerNodes = [triggerNode];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = createMockActiveVersion('version-2');
			uiStore.stateIsDirty = false;

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-publish-indicator')).toBeInTheDocument();
		});

		it('should show publish indicator when state is dirty', () => {
			workflowsStore.workflowTriggerNodes = [triggerNode];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = createMockActiveVersion('version-1');
			uiStore.stateIsDirty = true;

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-publish-indicator')).toBeInTheDocument();
		});

		it('should not show publish indicator when versions match and state is not dirty', () => {
			workflowsStore.workflowTriggerNodes = [triggerNode];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = createMockActiveVersion('version-1');
			uiStore.stateIsDirty = false;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-publish-indicator')).not.toBeInTheDocument();
		});

		it('should show publish indicator when workflow has never been published (no active version)', () => {
			workflowsStore.workflowTriggerNodes = [triggerNode];
			workflowsStore.workflow.versionId = 'version-1';
			workflowsStore.workflow.activeVersion = null;
			uiStore.stateIsDirty = false;

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-publish-indicator')).toBeInTheDocument();
		});
	});

	describe('Save button state', () => {
		it('should show "Saved" label when workflow is saved', () => {
			uiStore.stateIsDirty = false;

			const { getByText } = renderComponent();

			expect(getByText('Saved')).toBeInTheDocument();
		});

		it('should show save button when workflow has unsaved changes', () => {
			uiStore.stateIsDirty = true;

			const { queryByText, getByTestId } = renderComponent();

			expect(queryByText('Saved')).not.toBeInTheDocument();
			expect(getByTestId('workflow-save-button')).toBeInTheDocument();
		});

		it('should emit workflow:saved event when save button is clicked', async () => {
			uiStore.stateIsDirty = true;

			const { getByTestId, emitted } = renderComponent();

			await userEvent.click(getByTestId('workflow-save-button'));

			expect(emitted('workflow:saved')).toBeTruthy();
		});

		it('should contain disabled save button when update permission is missing', () => {
			uiStore.stateIsDirty = true;

			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: { ...defaultWorkflowProps.workflowPermissions, update: false },
				},
			});

			const saveButtonContainer = getByTestId('workflow-save-button');
			const saveButton = within(saveButtonContainer).getByRole('button');
			expect(saveButton).toBeDisabled();
		});

		it('should contain disabled save button when workflow is saving', () => {
			uiStore.stateIsDirty = true;
			uiStore.isActionActive.workflowSaving = true;

			const { getByTestId } = renderComponent();

			const saveButtonContainer = getByTestId('workflow-save-button');
			const saveButton = within(saveButtonContainer).getByRole('button');
			expect(saveButton).toBeDisabled();
		});
	});

	describe('Read-only mode', () => {
		it('should render save button when not read-only and has update permission', () => {
			uiStore.stateIsDirty = true;
			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					readOnly: false,
					workflowPermissions: { update: true },
				},
			});

			const saveButtonContainer = getByTestId('workflow-save-button');
			const saveButton = within(saveButtonContainer).getByRole('button');
			expect(saveButtonContainer).toBeInTheDocument();
			expect(saveButton).not.toBeDisabled();
		});

		it('should render disabled save button when read-only', () => {
			uiStore.stateIsDirty = true;

			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					readOnly: true,
				},
			});

			const saveButtonContainer = getByTestId('workflow-save-button');
			const saveButton = within(saveButtonContainer).getByRole('button');
			expect(saveButtonContainer).toBeInTheDocument();
			expect(saveButton).toBeDisabled();
		});

		it('should render publish button when read-only', () => {
			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					readOnly: true,
				},
			});

			const publishButton = getByTestId('workflow-open-publish-modal-button');
			expect(publishButton).toBeInTheDocument();
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

		it('should render disabled save button when workflow is archived', () => {
			uiStore.stateIsDirty = true;

			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					isArchived: true,
				},
			});

			const saveButtonContainer = getByTestId('workflow-save-button');
			const saveButton = within(saveButtonContainer).getByRole('button');
			expect(saveButtonContainer).toBeInTheDocument();
			expect(saveButton).toBeDisabled();
		});
	});
});
