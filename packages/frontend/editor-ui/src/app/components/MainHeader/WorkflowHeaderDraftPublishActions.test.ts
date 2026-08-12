import type { WorkflowReviewRequestForWorkflow } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createMockEnterpriseSettings, mockNodeTypeDescription } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import WorkflowHeaderDraftPublishActions from '@/app/components/MainHeader/WorkflowHeaderDraftPublishActions.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { WORKFLOW_PUBLISH_MODAL_KEY, EnterpriseEditionFeature } from '@/app/constants';
import { STORES } from '@n8n/stores';
import type { INodeUi } from '@/Interface';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import {
	LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN,
	LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW,
	LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN,
} from '@/app/constants/localStorage';
import { useUsersStore } from '@n8n/stores/users.store';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '@/features/workflow-reviews/constants';
import {
	createWorkflowReviewRequest,
	fetchEligibleReviewers,
	fetchWorkflowReviewRequests,
	updateWorkflowReviewRequestVersion,
} from '@/features/workflow-reviews/workflowReviews.api';
import { ResponseError } from '@n8n/rest-api-client';

// Hoisted: the vue-router mock factory runs before module-level consts initialize
const { mockRouterPush, mockRouterResolve } = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockRouterResolve: vi.fn(({ params }: { params: { reviewRequestId: string } }) => ({
		href: `/workflow-review-requests/${params.reviewRequestId}`,
	})),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: vi.fn().mockReturnValue({
		params: { workflowId: 'test' },
		query: {},
	}),
	useRouter: vi.fn().mockReturnValue({
		replace: vi.fn(),
		push: mockRouterPush,
		resolve: mockRouterResolve,
		currentRoute: {
			value: {
				params: { workflowId: 'test' },
				query: {},
			},
		},
	}),
}));

const mockSaveCurrentWorkflow = vi.fn().mockResolvedValue(true);
const mockUnpublishWorkflowFromHistory = vi.fn().mockResolvedValue(true);
const mockPublishWorkflow = vi.fn().mockResolvedValue({ success: true });
const mockShowMessage = vi.fn();
const mockShowToast = vi.fn();
const mockShowError = vi.fn();

vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({
		saveCurrentWorkflow: mockSaveCurrentWorkflow,
	}),
}));

vi.mock('@/app/composables/useWorkflowActivate', () => ({
	useWorkflowActivate: () => ({
		unpublishWorkflowFromHistory: mockUnpublishWorkflowFromHistory,
		publishWorkflow: mockPublishWorkflow,
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
		showToast: mockShowToast,
		showError: mockShowError,
	}),
}));

vi.mock('@/app/composables/useWorkflowPublicationStatusSync', () => ({
	useWorkflowPublicationStatusSync: vi.fn().mockReturnValue({ refetch: vi.fn() }),
}));

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	createWorkflowReviewRequest: vi.fn(),
	fetchEligibleReviewers: vi.fn(),
	fetchWorkflowReviewRequests: vi.fn(),
	updateWorkflowReviewRequestVersion: vi.fn(),
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
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	const setupEnabledPublishButton = () => {
		workflowDocumentStore.setNodes([triggerNode]);
	};

	const selectReviewer = async (baseElement: Element) => {
		if (!(baseElement instanceof HTMLElement)) throw new Error('Expected an HTML test container');

		await userEvent.click(within(baseElement).getByRole('combobox'));
		await waitFor(() => expect(within(baseElement).getByRole('listbox')).toBeInTheDocument());
		const option = baseElement.querySelector('#user-select-option-id-reviewer-1');
		expect(option).not.toBeNull();
		await userEvent.click(option as HTMLElement);
	};

	const setWorkflowReviewGates = ({
		licensed = true,
		environmentEnabled = true,
		instanceEnabled = true,
	}: Partial<{
		licensed: boolean;
		environmentEnabled: boolean;
		instanceEnabled: boolean;
	}> = {}) => {
		settingsStore.isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
			[EnterpriseEditionFeature.WorkflowReviews]: licensed,
		});
		settingsStore.settings = {
			...settingsStore.settings,
			workflowReviews: { enabled: instanceEnabled },
			envFeatureFlags: {
				...settingsStore.settings.envFeatureFlags,
				N8N_ENV_FEAT_WORKFLOW_REVIEWS: environmentEnabled ? 'true' : 'false',
			},
		};
	};

	beforeEach(async () => {
		workflowsStore = mockedStore(useWorkflowsStore);
		uiStore = mockedStore(useUIStore);
		collaborationStore = mockedStore(useCollaborationStore);
		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isEnterpriseFeatureEnabled = createMockEnterpriseSettings();
		settingsStore.settings = {
			...settingsStore.settings,
			workflowReviews: { enabled: false },
			envFeatureFlags: {
				...settingsStore.settings.envFeatureFlags,
				N8N_ENV_FEAT_WORKFLOW_REVIEWS: 'false',
			},
		};
		useUsersStore().currentUserId = 'user-1';
		localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW('user-1'));
		localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN('user-1'));
		localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN('user-1'));
		useReviewRequiredStore().setReviewRequired(defaultWorkflowProps.id, false);
		// The testing pinia is shared across this file, so reset the review status to
		// "fetched, no open review" between tests.
		vi.mocked(fetchWorkflowReviewRequests).mockResolvedValue({ count: 0, data: [] });
		await useWorkflowReviewStatusStore().fetchStatus(defaultWorkflowProps.id);

		const nodeTypesStore = useNodeTypesStore();
		nodeTypesStore.setNodeTypes([
			mockNodeTypeDescription({
				name: 'n8n-nodes-base.webhook',
				group: ['trigger'],
			}),
		]);

		workflowsStore.setWorkflowId('1');
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('1'));
		workflowDocumentStore.setVersionData({ versionId: 'version-1', name: null, description: null });
		workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });
		uiStore.markStateClean();
		collaborationStore.shouldBeReadOnly = false;

		mockSaveCurrentWorkflow.mockClear();
		mockSaveCurrentWorkflow.mockResolvedValue(true);
		mockPublishWorkflow.mockClear();
		mockPublishWorkflow.mockResolvedValue({ success: true });
		mockRouterPush.mockClear();
		mockRouterPush.mockResolvedValue(undefined);
		vi.mocked(createWorkflowReviewRequest).mockResolvedValue({
			id: 'review-1',
			state: 'open',
			decision: 'pending',
			workflowVersionId: 'version-1',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		});
		vi.mocked(fetchEligibleReviewers).mockResolvedValue({
			count: 1,
			data: [
				{
					id: 'reviewer-1',
					email: 'reviewer@n8n.io',
					firstName: 'Rae',
					lastName: 'Viewer',
				},
			],
		});
		vi.mocked(updateWorkflowReviewRequestVersion).mockResolvedValue({
			id: 'req-1',
			state: 'open',
			decision: 'pending',
			workflowVersionId: 'version-1',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Active version indicator', () => {
		it('should not show active version indicator when there is no active version', () => {
			workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-active-version-info')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-active-version-indicator')).not.toBeInTheDocument();
		});

		it('should show active version indicator when there is an active version', () => {
			workflowDocumentStore.setActiveState({
				activeVersionId: 'active-version-1',
				activeVersion: createMockActiveVersion('active-version-1'),
			});

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-active-version-info')).toBeInTheDocument();
			expect(getByTestId('workflow-active-version-indicator')).toBeInTheDocument();
		});

		it('should use latest activation date from workflowPublishHistory when available', () => {
			const oldDate = '2024-01-01T00:00:00.000Z';
			const latestActivationDate = '2024-06-15T10:30:00.000Z';
			const activeVersionWithHistory = {
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
			workflowDocumentStore.setActiveState({
				activeVersionId: 'active-version-1',
				activeVersion: activeVersionWithHistory,
			});

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
			workflowDocumentStore.setActiveState({
				activeVersionId: 'active-version-1',
				activeVersion: createMockActiveVersion('active-version-1'),
			});
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
			setupEnabledPublishButton();
			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-2',
				activeVersion: createMockActiveVersion('version-2'),
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

		it('opens the review choice when workflow reviews are enabled', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			setWorkflowReviewGates();
			setupEnabledPublishButton();

			const { getByTestId, findByRole } = renderComponent();
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(
				await findByRole('dialog', { name: 'New: Submit for review before publishing' }),
			).toBeInTheDocument();
			expect(openModalSpy).not.toHaveBeenCalled();
		});

		it('continues to the existing publish modal from the review choice', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			setWorkflowReviewGates();
			setupEnabledPublishButton();

			const { getByTestId, findByRole } = renderComponent();
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));
			const choiceDialog = await findByRole('dialog', {
				name: 'New: Submit for review before publishing',
			});
			await userEvent.click(within(choiceDialog).getByRole('button', { name: 'Publish' }));

			expect(openModalSpy).toHaveBeenCalledWith({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: {},
			});
		});

		it('opens submit for review from the review choice', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();

			const { getByTestId, findByRole } = renderComponent();
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));
			const choiceDialog = await findByRole('dialog', {
				name: 'New: Submit for review before publishing',
			});
			await userEvent.click(
				within(choiceDialog).getByRole('button', { name: 'Submit for review' }),
			);

			expect(await findByRole('dialog', { name: 'Submit for review' })).toBeInTheDocument();
		});

		it('opens submit for review directly when review is required', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			useReviewRequiredStore().setReviewRequired(defaultWorkflowProps.id, true);

			const { getByTestId, findByRole, queryByRole } = renderComponent();
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(await findByRole('dialog', { name: 'Submit for review' })).toBeInTheDocument();
			expect(
				queryByRole('dialog', { name: 'New: Submit for review before publishing' }),
			).not.toBeInTheDocument();
		});

		const seedOpenReview = (overrides: Partial<WorkflowReviewRequestForWorkflow> = {}) => {
			vi.mocked(fetchWorkflowReviewRequests).mockResolvedValue({
				count: 1,
				data: [
					{
						id: 'req-1',
						state: 'open',
						decision: 'pending',
						workflowVersionId: 'version-0',
						createdAt: '2026-07-20T10:00:00.000Z',
						updatedAt: '2026-07-20T10:00:00.000Z',
						decisionBy: null,
						approvedVersionPublicationState: null,
						...overrides,
					},
				],
			});
		};

		it('disables Publish when the open review already contains the saved version', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			seedOpenReview({ workflowVersionId: 'version-1' });

			const { getByTestId, findByTestId } = renderComponent();
			await waitFor(() =>
				expect(useWorkflowReviewStatusStore().hasOpenReview(defaultWorkflowProps.id)).toBe(true),
			);

			expect(getByTestId('workflow-open-publish-modal-button')).toBeDisabled();
			expect(await findByTestId('workflow-review-status-pill')).toHaveTextContent(
				'Waiting for review',
			);
		});

		it('rechecks the saved version after saving unsaved workflow changes', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			seedOpenReview({ workflowVersionId: 'version-1' });
			uiStore.markStateDirty();

			const { getByTestId, queryByRole } = renderComponent();
			await waitFor(() =>
				expect(useWorkflowReviewStatusStore().hasOpenReview(defaultWorkflowProps.id)).toBe(true),
			);

			const publishButton = getByTestId('workflow-open-publish-modal-button');
			expect(publishButton).toBeEnabled();
			await userEvent.click(publishButton);

			expect(mockSaveCurrentWorkflow).toHaveBeenCalledWith({}, true);
			expect(
				queryByRole('dialog', { name: 'Submit latest changes to existing review' }),
			).not.toBeInTheDocument();
		});

		it('opens the update-review dialog for an open review even with the local preference off', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			expect(useReviewRequiredStore().isReviewRequired(defaultWorkflowProps.id)).toBe(false);
			seedOpenReview();

			const { getByTestId, findByRole, queryByRole } = renderComponent();
			await waitFor(() =>
				expect(useWorkflowReviewStatusStore().hasOpenReview(defaultWorkflowProps.id)).toBe(true),
			);
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(
				await findByRole('dialog', { name: 'Submit latest changes to existing review' }),
			).toBeInTheDocument();
			expect(queryByRole('dialog', { name: 'Submit for review' })).not.toBeInTheDocument();
			expect(
				queryByRole('dialog', { name: 'New: Submit for review before publishing' }),
			).not.toBeInTheDocument();
			expect(openModalSpy).not.toHaveBeenCalled();
		});

		it('opens the update-review dialog instead of the submit dialog when review is required and a review is open', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			useReviewRequiredStore().setReviewRequired(defaultWorkflowProps.id, true);
			seedOpenReview();

			const { getByTestId, findByRole, queryByRole } = renderComponent();
			await waitFor(() =>
				expect(useWorkflowReviewStatusStore().hasOpenReview(defaultWorkflowProps.id)).toBe(true),
			);
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(
				await findByRole('dialog', { name: 'Submit latest changes to existing review' }),
			).toBeInTheDocument();
			expect(queryByRole('dialog', { name: 'Submit for review' })).not.toBeInTheDocument();
		});

		it('shows the success toast after updating the review to the latest version', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			seedOpenReview();
			// The dialog prefills its version-name field from the current version.
			workflowDocumentStore.setVersionData({
				versionId: 'version-1',
				name: 'Release 3',
				description: null,
			});

			const { getByTestId, findByRole } = renderComponent();
			await waitFor(() =>
				expect(useWorkflowReviewStatusStore().hasOpenReview(defaultWorkflowProps.id)).toBe(true),
			);
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));
			const updateDialog = await findByRole('dialog', {
				name: 'Submit latest changes to existing review',
			});
			await userEvent.click(
				within(updateDialog).getByTestId('workflow-update-review-submit-button'),
			);

			await waitFor(() => {
				expect(updateWorkflowReviewRequestVersion).toHaveBeenCalledWith(
					expect.any(Object),
					'req-1',
					{
						workflowId: defaultWorkflowProps.id,
						workflowVersionId: 'version-1',
						workflowVersionName: 'Release 3',
						workflowVersionDescription: undefined,
					},
				);
			});
			expect(mockShowToast).toHaveBeenCalledWith({
				type: 'success',
				title: 'Latest changes submitted to the existing review',
				message: '<a href="/workflow-review-requests/req-1">Open review</a>',
				onClick: expect.any(Function),
			});
			const toastConfig = mockShowToast.mock.calls.at(-1)?.[0];
			if (!toastConfig) throw new Error('Expected a review success toast');
			const preventDefault = vi.fn();
			toastConfig.onClick({
				target: document.createElement('a'),
				preventDefault,
			} as unknown as MouseEvent);
			expect(preventDefault).toHaveBeenCalledOnce();
			expect(mockRouterPush).toHaveBeenCalledWith({
				name: WORKFLOW_REVIEW_REQUESTS_VIEW,
				params: { reviewRequestId: 'req-1' },
			});
		});

		it('hands off from the submit dialog to the update-review dialog on conflict', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			useReviewRequiredStore().setReviewRequired(defaultWorkflowProps.id, true);
			vi.mocked(createWorkflowReviewRequest).mockRejectedValue(
				new ResponseError('Conflict', {
					httpStatusCode: 409,
					meta: { workflowReviewRequestId: 'req-1' },
				}),
			);

			const { baseElement, getByTestId, findByRole, queryByRole } = renderComponent();
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));
			const submitDialog = await findByRole('dialog', { name: 'Submit for review' });
			await userEvent.click(within(submitDialog).getByTestId('workflow-review-next-button'));
			await userEvent.type(
				within(submitDialog).getByTestId('workflow-review-title-input'),
				'Review payments',
			);
			await selectReviewer(baseElement);
			await userEvent.click(within(submitDialog).getByTestId('workflow-review-submit-button'));

			expect(
				await findByRole('dialog', { name: 'Submit latest changes to existing review' }),
			).toBeInTheDocument();
			expect(queryByRole('dialog', { name: 'Submit for review' })).not.toBeInTheDocument();
		});

		it('skips the review choice when the user dismissed it', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			localStorage.setItem(LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN('user-1'), 'true');

			const { getByTestId, queryByRole } = renderComponent();
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(openModalSpy).toHaveBeenCalledWith({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: {},
			});
			expect(
				queryByRole('dialog', { name: 'New: Submit for review before publishing' }),
			).not.toBeInTheDocument();
		});

		it("applies Don't show again without requiring a reload", async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			setWorkflowReviewGates();
			setupEnabledPublishButton();

			const { getByTestId, findByRole } = renderComponent();
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));
			const choiceDialog = await findByRole('dialog', {
				name: 'New: Submit for review before publishing',
			});
			await userEvent.click(
				within(choiceDialog).getByRole('checkbox', { name: "Don't show again" }),
			);
			await userEvent.click(within(choiceDialog).getByRole('button', { name: 'Close dialog' }));
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));

			expect(openModalSpy).toHaveBeenCalledWith({
				name: WORKFLOW_PUBLISH_MODAL_KEY,
				data: {},
			});
		});

		it('shows the success toast and confirmation after a review is submitted', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			useReviewRequiredStore().setReviewRequired(defaultWorkflowProps.id, true);

			const { baseElement, getByTestId, findByRole } = renderComponent();
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));
			const submitDialog = await findByRole('dialog', { name: 'Submit for review' });
			await userEvent.click(within(submitDialog).getByTestId('workflow-review-next-button'));
			await userEvent.type(
				within(submitDialog).getByTestId('workflow-review-title-input'),
				'Review payments',
			);
			await selectReviewer(baseElement);
			await userEvent.click(within(submitDialog).getByTestId('workflow-review-submit-button'));

			expect(
				await findByRole('dialog', { name: 'Workflow version submitted for review' }),
			).toBeInTheDocument();
			expect(mockShowToast).toHaveBeenCalledWith({
				type: 'success',
				title: 'Workflow version submitted for review',
				message: '<a href="/workflow-review-requests/review-1">Open review</a>',
				onClick: expect.any(Function),
			});
		});

		it('keeps the success toast but suppresses the confirmation when dismissed', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			useReviewRequiredStore().setReviewRequired(defaultWorkflowProps.id, true);
			localStorage.setItem(LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN('user-1'), 'true');

			const { baseElement, getByTestId, findByRole, queryByRole } = renderComponent();
			await userEvent.click(getByTestId('workflow-open-publish-modal-button'));
			const submitDialog = await findByRole('dialog', { name: 'Submit for review' });
			await userEvent.click(within(submitDialog).getByTestId('workflow-review-next-button'));
			await userEvent.type(
				within(submitDialog).getByTestId('workflow-review-title-input'),
				'Review payments',
			);
			await selectReviewer(baseElement);
			await userEvent.click(within(submitDialog).getByTestId('workflow-review-submit-button'));

			await waitFor(() => {
				expect(mockShowToast).toHaveBeenCalledWith({
					type: 'success',
					title: 'Workflow version submitted for review',
					message: '<a href="/workflow-review-requests/review-1">Open review</a>',
					onClick: expect.any(Function),
				});
			});
			expect(
				queryByRole('dialog', { name: 'Workflow version submitted for review' }),
			).not.toBeInTheDocument();
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
			workflowDocumentStore.setNodes([]);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-2',
				activeVersion: createMockActiveVersion('version-2'),
			});
			uiStore.markStateDirty();

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});

		it('should show publish button disabled when trigger node is disabled', () => {
			workflowDocumentStore.setNodes([{ ...triggerNode, disabled: true }]);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-2',
				activeVersion: createMockActiveVersion('version-2'),
			});
			uiStore.markStateDirty();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});

		it('should show publish button enabled when there are unpublished changes (versionId mismatch)', () => {
			workflowDocumentStore.setNodes([triggerNode]);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-2',
				activeVersion: createMockActiveVersion('version-2'),
			});
			uiStore.markStateClean();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).not.toBeDisabled();
		});

		it('should show publish button enabled when state is dirty', () => {
			workflowDocumentStore.setNodes([triggerNode]);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-1',
				activeVersion: createMockActiveVersion('version-1'),
			});
			uiStore.markStateDirty();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).not.toBeDisabled();
		});

		it('should show publish button disabled when versions match and state is not dirty', () => {
			workflowDocumentStore.setNodes([triggerNode]);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-1',
				activeVersion: createMockActiveVersion('version-1'),
			});
			uiStore.markStateClean();

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});

		it('should keep the version menu enabled when workflow is published with no changes', () => {
			workflowDocumentStore.setNodes([triggerNode]);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-1',
				activeVersion: createMockActiveVersion('version-1'),
			});
			uiStore.markStateClean();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).toBeDisabled();
			expect(getByTestId('version-menu-button')).not.toBeDisabled();
		});

		it('should keep the version menu enabled when workflow is published with no changes and unpublish is unavailable', () => {
			workflowDocumentStore.setNodes([triggerNode]);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-1',
				activeVersion: createMockActiveVersion('version-1'),
			});
			uiStore.markStateClean();

			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					workflowPermissions: {
						...defaultWorkflowProps.workflowPermissions,
						unpublish: false,
					},
				},
			});

			expect(getByTestId('workflow-open-publish-modal-button')).toBeDisabled();
			expect(getByTestId('version-menu-button')).not.toBeDisabled();
		});

		it('should show publish button enabled when workflow has never been published (no active version)', () => {
			workflowDocumentStore.setNodes([triggerNode]);

			workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });
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
			workflowDocumentStore.setVersionData({
				versionId: 'version-1',
				name: 'Test Version',
				description: 'Test description',
			});
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
			workflowDocumentStore.setActiveState({
				activeVersionId: 'active-version-1',
				activeVersion: createMockActiveVersion('active-version-1'),
			});
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
			workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });
			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});

		it('should be disabled when user lacks workflow:unpublish permission', async () => {
			setupEnabledPublishButton();

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

			const unpublishItem = getByTestId('version-menu-item-unpublish');
			expect(unpublishItem).toBeInTheDocument();
			expect(unpublishItem).toHaveClass('is-disabled');
		});
	});

	describe('Dropdown menu actions', () => {
		beforeEach(() => {
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

			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});

		it('should render when active version exists for unpublish action', () => {
			workflowDocumentStore.setActiveState({
				activeVersionId: 'active-version-1',
				activeVersion: createMockActiveVersion('active-version-1'),
			});

			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});

		it('should disable the menu button when workflow is new', () => {
			settingsStore.isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
				[EnterpriseEditionFeature.NamedVersions]: false,
			});

			const { getByTestId } = renderComponent({
				props: {
					...defaultWorkflowProps,
					isNewWorkflow: true,
				},
			});

			const versionMenuButton = getByTestId('version-menu-button');
			expect(versionMenuButton).toBeDisabled();
		});
	});

	describe('Review required toggle', () => {
		const openVersionMenu = async (getByTestId: (id: string) => HTMLElement) => {
			await userEvent.click(getByTestId('version-menu-button'));
		};

		it.each([
			{ licensed: false, environmentEnabled: true, instanceEnabled: true },
			{ licensed: true, environmentEnabled: false, instanceEnabled: true },
			{ licensed: true, environmentEnabled: true, instanceEnabled: false },
		])('is hidden when an enabled gate is false', async (gates) => {
			setWorkflowReviewGates(gates);
			const { getByTestId, queryByTestId } = renderComponent();

			await openVersionMenu(getByTestId);

			expect(queryByTestId('workflow-review-required-toggle')).not.toBeInTheDocument();
		});

		it('is hidden for a new workflow', () => {
			setWorkflowReviewGates();

			const { queryByTestId } = renderComponent({
				props: { ...defaultWorkflowProps, isNewWorkflow: true },
			});

			expect(queryByTestId('workflow-review-required-toggle')).not.toBeInTheDocument();
		});

		it('is visible for a saved workflow when all gates pass', async () => {
			setWorkflowReviewGates();
			const { getByTestId, findByTestId } = renderComponent();

			await openVersionMenu(getByTestId);

			expect(await findByTestId('workflow-review-required-toggle')).toBeInTheDocument();
		});

		it('updates the preference and leaves the dropdown open', async () => {
			setWorkflowReviewGates();
			const reviewRequiredStore = useReviewRequiredStore();
			const { getByTestId, findByTestId } = renderComponent();

			await openVersionMenu(getByTestId);
			await userEvent.click(await findByTestId('workflow-review-required-toggle'));

			expect(reviewRequiredStore.isReviewRequired(defaultWorkflowProps.id)).toBe(true);
			expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			expect(getByTestId('version-menu-item-publish')).toHaveTextContent('Publish');
			expect(getByTestId('version-menu-item-publish-timeline')).toHaveTextContent('View timeline');
			expect(getByTestId('version-menu-item-unpublish')).toHaveTextContent('Unpublish');
		});

		it('can be reached and toggled using keyboard menu navigation', async () => {
			setWorkflowReviewGates();
			const user = userEvent.setup();
			const reviewRequiredStore = useReviewRequiredStore();
			const { getByTestId, findByRole } = renderComponent();
			const versionMenuButton = getByTestId('version-menu-button');

			versionMenuButton.focus();
			await user.keyboard('{Enter}');
			const reviewRequiredItem = await findByRole('menuitemcheckbox', {
				name: /Review required/,
			});

			await user.keyboard('{End}');
			expect(reviewRequiredItem).toHaveFocus();

			await user.keyboard('{Enter}');
			expect(reviewRequiredStore.isReviewRequired(defaultWorkflowProps.id)).toBe(true);
			expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
		});
	});

	describe('Review status banner', () => {
		const seedLatestReview = (overrides: Partial<WorkflowReviewRequestForWorkflow> = {}) => {
			vi.mocked(fetchWorkflowReviewRequests).mockResolvedValue({
				count: 1,
				data: [
					{
						id: 'req-1',
						state: 'open',
						decision: 'pending',
						// Differs from the saved 'version-1', so the review is out of date
						workflowVersionId: 'version-0',
						createdAt: '2026-07-20T10:00:00.000Z',
						updatedAt: '2026-07-20T10:00:00.000Z',
						decisionBy: null,
						approvedVersionPublicationState: null,
						...overrides,
					},
				],
			});
		};

		const seedApprovedUnpublishedReview = () =>
			seedLatestReview({
				state: 'closed',
				decision: 'approved',
				approvedVersionPublicationState: 'not_published',
			});

		const renderWithBanner = async () => {
			const result = renderComponent();
			return { ...result, pill: await result.findByTestId('workflow-review-status-pill') };
		};

		it.each([
			{ licensed: false, environmentEnabled: true, instanceEnabled: true },
			{ licensed: true, environmentEnabled: false, instanceEnabled: true },
			{ licensed: true, environmentEnabled: true, instanceEnabled: false },
		])('requests no status and hides the banner when a gate is false', async (gates) => {
			setWorkflowReviewGates(gates);
			seedLatestReview();
			// The suite seeds the store through fetchStatus in beforeEach
			vi.mocked(fetchWorkflowReviewRequests).mockClear();

			const { queryByTestId } = renderComponent();
			await waitFor(() => expect(queryByTestId('version-menu-button')).toBeInTheDocument());

			expect(fetchWorkflowReviewRequests).not.toHaveBeenCalled();
			expect(queryByTestId('workflow-review-status-pill')).not.toBeInTheDocument();
		});

		it('is hidden for a new workflow', () => {
			setWorkflowReviewGates();
			seedLatestReview();

			const { queryByTestId } = renderComponent({
				props: { ...defaultWorkflowProps, isNewWorkflow: true },
			});

			expect(queryByTestId('workflow-review-status-pill')).not.toBeInTheDocument();
		});

		it('sits next to the publish button and opens the update-review dialog', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			seedLatestReview();

			const { pill, getByTestId, findByRole } = await renderWithBanner();

			expect(pill).toHaveTextContent('Update review');
			expect(pill.compareDocumentPosition(getByTestId('workflow-open-publish-modal-button'))).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);

			await userEvent.click(pill);
			await userEvent.click(getByTestId('workflow-review-submit-changes-button'));

			expect(
				await findByRole('dialog', { name: 'Submit latest changes to existing review' }),
			).toBeInTheDocument();
		});

		it('saves a dirty workflow before opening the update-review dialog', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			seedLatestReview();
			uiStore.markStateDirty();

			const { pill, getByTestId, findByRole } = await renderWithBanner();

			await userEvent.click(pill);
			await userEvent.click(getByTestId('workflow-review-submit-changes-button'));

			expect(mockSaveCurrentWorkflow).toHaveBeenCalledWith({}, true);
			expect(
				await findByRole('dialog', { name: 'Submit latest changes to existing review' }),
			).toBeInTheDocument();
		});

		it('keeps the update-review dialog closed when saving a dirty workflow fails', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			seedLatestReview();
			uiStore.markStateDirty();
			mockSaveCurrentWorkflow.mockResolvedValue(false);

			const { pill, getByTestId, queryByRole } = await renderWithBanner();

			await userEvent.click(pill);
			await userEvent.click(getByTestId('workflow-review-submit-changes-button'));

			expect(
				queryByRole('dialog', { name: 'Submit latest changes to existing review' }),
			).not.toBeInTheDocument();
		});

		it.each([
			{
				name: 'the workflow is archived',
				props: { isArchived: true },
				// Publish rights survive archiving, so the review is still reachable
				canOpenReview: true,
			},
			{
				name: 'the user cannot publish',
				props: {
					workflowPermissions: { ...defaultWorkflowProps.workflowPermissions, publish: false },
				},
				// the detail route would 404
				canOpenReview: false,
			},
		])(
			'keeps the status readable but disables writes when $name',
			async ({ props, canOpenReview }) => {
				setWorkflowReviewGates();
				seedLatestReview();

				const { findByTestId, getByTestId, queryByTestId } = renderComponent({
					props: { ...defaultWorkflowProps, ...props },
				});
				await userEvent.click(await findByTestId('workflow-review-status-pill'));

				if (canOpenReview) {
					expect(getByTestId('workflow-review-open-review-button')).toBeEnabled();
				} else {
					expect(queryByTestId('workflow-review-open-review-button')).not.toBeInTheDocument();
				}
				expect(getByTestId('workflow-review-submit-changes-button')).toBeDisabled();
			},
		);

		it.each([
			{
				name: 'an open review, leaving the inbox on its default tab',
				seed: () => seedLatestReview(),
				query: undefined,
			},
			{
				name: 'a closed review, selecting the closed inbox tab',
				seed: seedApprovedUnpublishedReview,
				query: { state: 'closed' },
			},
		])('opens $name', async ({ seed, query }) => {
			setWorkflowReviewGates();
			seed();

			const { pill, getByTestId } = await renderWithBanner();
			await userEvent.click(pill);
			await userEvent.click(getByTestId('workflow-review-open-review-button'));

			expect(mockRouterPush).toHaveBeenCalledWith({
				name: WORKFLOW_REVIEW_REQUESTS_VIEW,
				params: { reviewRequestId: 'req-1' },
				query,
			});
		});

		it('retries publishing the approved pinned version, then refreshes the status', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			seedApprovedUnpublishedReview();

			const { pill, getByTestId } = await renderWithBanner();
			vi.mocked(fetchWorkflowReviewRequests).mockClear();

			await userEvent.click(pill);
			await userEvent.click(getByTestId('workflow-review-retry-publish-button'));

			// The pinned approved version, not the newer working copy ('version-1')
			expect(mockPublishWorkflow).toHaveBeenCalledWith(defaultWorkflowProps.id, 'version-0');
			await waitFor(() => expect(fetchWorkflowReviewRequests).toHaveBeenCalled());
		});

		it('keeps the banner and skips the refresh when the retry fails', async () => {
			setWorkflowReviewGates();
			setupEnabledPublishButton();
			seedApprovedUnpublishedReview();
			mockPublishWorkflow.mockResolvedValue({ success: false, errorHandled: true });

			const { pill, getByTestId, findByTestId } = await renderWithBanner();
			vi.mocked(fetchWorkflowReviewRequests).mockClear();

			await userEvent.click(pill);
			await userEvent.click(getByTestId('workflow-review-retry-publish-button'));

			expect(await findByTestId('workflow-review-status-pill')).toBeInTheDocument();
			expect(fetchWorkflowReviewRequests).not.toHaveBeenCalled();
		});

		it('refetches the status when the active version changes, without duplicating the mount fetch', async () => {
			setWorkflowReviewGates();
			seedApprovedUnpublishedReview();
			vi.mocked(fetchWorkflowReviewRequests).mockClear();

			await renderWithBanner();
			expect(fetchWorkflowReviewRequests).toHaveBeenCalledTimes(1);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-2',
				activeVersion: createMockActiveVersion('version-2'),
			});

			await waitFor(() => expect(fetchWorkflowReviewRequests).toHaveBeenCalledTimes(2));
		});
	});

	describe('Publication service states (flag on)', () => {
		let settingsStore: ReturnType<typeof useSettingsStore>;

		beforeEach(() => {
			settingsStore = useSettingsStore();
			// Enable the publication service flag
			settingsStore.$patch((state) => {
				state.settings = {
					...state.settings,
					useWorkflowPublicationService: true,
				};
			});
			// Set up an active version so the workflow is considered published
			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-1',
				activeVersion: createMockActiveVersion('version-1'),
			});
			workflowDocumentStore.setNodes([triggerNode]);
			uiStore.markStateClean();
		});

		it('should show "Publishing…" text alongside an inline spinner, and be disabled when status is publishing', () => {
			workflowDocumentStore.setPublicationStatus({ status: 'publishing' });

			const { getByTestId, getByText } = renderComponent();

			const publishButton = getByTestId('workflow-open-publish-modal-button');
			expect(publishButton).toBeDisabled();
			// Text and spinner coexist — text visible alongside the spinner
			expect(getByText('Publishing…')).toBeInTheDocument();
			expect(getByTestId('publishing-spinner')).toBeInTheDocument();
		});

		it('should show publish button enabled with error indicator when status is partial', () => {
			workflowDocumentStore.setPublicationStatus({
				status: 'partial',
				failures: [{ nodeId: 'n1', nodeName: 'Webhook', errorMessage: 'Failed' }],
			});

			const { getByTestId } = renderComponent();

			const publishButton = getByTestId('workflow-open-publish-modal-button');
			expect(publishButton).not.toBeDisabled();
			expect(publishButton).toHaveTextContent('Publish');

			const indicator = getByTestId('workflow-active-version-indicator');
			expect(indicator).toBeInTheDocument();
		});

		it('should show publish button enabled with error indicator when status is failed', () => {
			workflowDocumentStore.setPublicationStatus({ status: 'failed' });

			const { getByTestId } = renderComponent();

			const publishButton = getByTestId('workflow-open-publish-modal-button');
			expect(publishButton).not.toBeDisabled();
			expect(publishButton).toHaveTextContent('Publish');

			const indicator = getByTestId('workflow-active-version-indicator');
			expect(indicator).toBeInTheDocument();
		});

		it('should enable publish button for partial status even with no diff (re-attempt)', () => {
			// versions match and state is clean — no diff, but partial overrides
			workflowDocumentStore.setPublicationStatus({ status: 'partial' });
			uiStore.markStateClean();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).not.toBeDisabled();
		});

		it('should enable publish button for failed status even with no diff (re-attempt)', () => {
			workflowDocumentStore.setPublicationStatus({ status: 'failed' });
			uiStore.markStateClean();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).not.toBeDisabled();
		});

		it('should fall through to existing logic when flag is off and status is partial', () => {
			// Disable the flag
			settingsStore.$patch((state) => {
				state.settings = {
					...state.settings,
					useWorkflowPublicationService: false,
				};
			});
			workflowDocumentStore.setPublicationStatus({ status: 'partial' });
			// versions match, no diff → published-no-changes → button disabled
			uiStore.markStateClean();

			const { getByTestId } = renderComponent();

			// Should be disabled because flag is off and no changes
			expect(getByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});

		it('should use partial indicator class (not error) when status is partial', () => {
			workflowDocumentStore.setPublicationStatus({
				status: 'partial',
				failures: [{ nodeId: 'n1', nodeName: 'Webhook', errorMessage: 'Connection refused' }],
			});

			const { getByTestId } = renderComponent();

			const indicator = getByTestId('workflow-active-version-indicator');
			expect(indicator.className).toMatch(/indicatorPartial/);
			expect(indicator.className).not.toMatch(/indicatorIssues/);
		});

		it('should use error indicator class when status is failed', () => {
			workflowDocumentStore.setPublicationStatus({ status: 'failed' });

			const { getByTestId } = renderComponent();

			const indicator = getByTestId('workflow-active-version-indicator');
			expect(indicator.className).toMatch(/indicatorIssues/);
			expect(indicator.className).not.toMatch(/indicatorPartial/);
		});

		it('should show non-empty tooltip text when publishing', () => {
			workflowDocumentStore.setPublicationStatus({ status: 'publishing' });

			const { getByText } = renderComponent();
			// The N8nTooltip stub renders the content slot unconditionally — assert the
			// informative text is actually present in the DOM.
			expect(getByText('Activating triggers — this can take a moment.')).toBeInTheDocument();
		});

		it('should show partial tooltip message in button tooltip when status is partial', () => {
			workflowDocumentStore.setPublicationStatus({
				status: 'partial',
				failures: [{ nodeId: 'n1', nodeName: 'Webhook', errorMessage: 'Connection refused' }],
			});

			const { getByText, queryByText } = renderComponent();

			// Tooltip message should be present
			expect(
				getByText(
					/The workflow is partially published, but some triggers failed to activate\. Publish again to retry\./,
				),
			).toBeInTheDocument();
			// Node name should be present
			expect(getByText('Webhook')).toBeInTheDocument();
			// Error message should NOT be present in the tooltip
			expect(queryByText('Connection refused')).not.toBeInTheDocument();
		});

		it('should show failed tooltip message in button tooltip when status is failed', () => {
			workflowDocumentStore.setPublicationStatus({
				status: 'failed',
				failures: [{ nodeId: 'n1', nodeName: 'Webhook', errorMessage: 'Auth failed' }],
			});

			const { getByText, queryByText } = renderComponent();

			// Tooltip message should be present
			expect(
				getByText(/This workflow isn't running\. Publish again to retry\./),
			).toBeInTheDocument();
			// Node name should be present
			expect(getByText('Webhook')).toBeInTheDocument();
			// Error message should NOT be present in the tooltip
			expect(queryByText('Auth failed')).not.toBeInTheDocument();
		});
	});
});
