import type { MockInstance } from 'vitest';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import WorkflowCard from '@/app/components/WorkflowCard.vue';
import type { WorkflowResource } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import type { FrontendSettings } from '@n8n/api-types';
import * as vueRouter from 'vue-router';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUIStore } from '@/app/stores/ui.store';
import { SURFACE_MCP_ONBOARDING_MODAL_KEY } from '@/experiments/surfaceMcpToNewCloudUsers/constants';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '' });
	return {
		useRouter: () => ({
			push,
			resolve,
		}),
		useRoute: () => ({
			params: {},
			location: {},
		}),
		RouterLink: vi.fn(),
	};
});

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	const showToast = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
			showToast,
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

vi.mock('@/app/composables/useWorkflowActivate', () => {
	const unpublishWorkflowFromHistory = vi.fn().mockResolvedValue(true);
	return {
		useWorkflowActivate: () => ({
			unpublishWorkflowFromHistory,
		}),
	};
});

vi.mock('@n8n/utils/event-bus', () => ({
	createEventBus: () => ({
		once: vi.fn((event, callback) => {
			// Auto-trigger the callback for testing
			if (event === 'unpublish') {
				callback();
			}
		}),
		emit: vi.fn(),
	}),
}));

const renderComponent = createComponentRenderer(WorkflowCard, {
	pinia: createTestingPinia({}),
});

const createWorkflow = (overrides = {}): WorkflowResource => ({
	resourceType: 'workflow',
	id: '1',
	name: 'My Workflow',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	active: true,
	activeVersionId: 'v1',
	isArchived: false,
	readOnly: false,
	...overrides,
});

describe('WorkflowCard', () => {
	let windowOpenSpy: MockInstance;
	let router: ReturnType<typeof vueRouter.useRouter>;
	let projectsStore: MockedStore<typeof useProjectsStore>;
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
	let usersStore: MockedStore<typeof useUsersStore>;
	let mcpStore: MockedStore<typeof useMCPStore>;
	let uiStore: MockedStore<typeof useUIStore>;
	let message: ReturnType<typeof useMessage>;
	let toast: ReturnType<typeof useToast>;

	beforeEach(async () => {
		router = vueRouter.useRouter();
		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
		usersStore = mockedStore(useUsersStore);
		mcpStore = mockedStore(useMCPStore);
		uiStore = mockedStore(useUIStore);
		message = useMessage();
		toast = useToast();

		settingsStore.settings = {
			envFeatureFlags: {
				N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
			},
			activeModules: ['dynamic-credentials'],
		} as unknown as FrontendSettings;
		vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

		windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render a card with the workflow name and open workflow clicking on it', async () => {
		const data = createWorkflow();
		const { getByRole } = renderComponent({ props: { data } });
		const cardTitle = getByRole('heading', { level: 2, name: new RegExp(data.name) });

		expect(cardTitle).toBeInTheDocument();

		await userEvent.click(cardTitle);
		await waitFor(() => {
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW,
				params: { workflowId: data.id },
			});
		});

		// Opens in new tab if meta key is used
		const user = userEvent.setup();

		await user.keyboard('[ControlLeft>]');
		await user.click(cardTitle);
		await waitFor(() => {
			expect(router.push).toHaveBeenCalledTimes(1);
		});
		expect(windowOpenSpy).toHaveBeenCalled();
	});

	it('should open card actions menu and not open workflow, open only on card action', async () => {
		const data = createWorkflow();
		const { getByTestId } = renderComponent({ props: { data } });
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActionsOpener);
		await waitFor(() => {
			expect(router.push).not.toHaveBeenCalled();
		});

		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		await userEvent.click(within(actions).getByTestId('action-open'));
		expect(actions).not.toHaveTextContent('Move');
		await waitFor(() => {
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW,
				params: { workflowId: data.id },
			});
		});
	});

	it('should render name and home project name', () => {
		const projectName = 'Test Project';
		const data = createWorkflow({
			homeProject: {
				name: projectName,
			},
		});
		const { getByRole, getByTestId } = renderComponent({
			props: { data, showOwnershipBadge: true },
		});

		const heading = getByRole('heading');
		const badge = getByTestId('card-badge');

		expect(heading).toHaveTextContent(data.name);
		expect(badge).toHaveTextContent(projectName);
	});

	it('should render name and personal project name', () => {
		const projectName = 'John Doe <john@n8n.io>';
		const data = createWorkflow({
			homeProject: {
				name: projectName,
			},
		});
		const { getByRole, getByTestId } = renderComponent({
			props: { data, showOwnershipBadge: true },
		});

		const heading = getByRole('heading');
		const badge = getByTestId('card-badge');

		expect(heading).toHaveTextContent(data.name);
		expect(badge).toHaveTextContent('John Doe');
	});

	it("should show 'Move' action if there is move resource permission and team projects available", async () => {
		vi.spyOn(projectsStore, 'isTeamProjectFeatureEnabled', 'get').mockReturnValue(true);
		vi.spyOn(settingsStore, 'isFoldersFeatureEnabled', 'get').mockReturnValue(true);
		vi.spyOn(vueRouter, 'useRoute').mockReturnValueOnce({
			name: VIEWS.PROJECTS,
		} as vueRouter.RouteLocationNormalizedLoadedGeneric);

		const data = createWorkflow({
			scopes: ['workflow:move'],
		});
		const { getByTestId } = renderComponent({ props: { data, areFoldersEnabled: true } });
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).toHaveTextContent('Move');
	});

	it("should show 'Move' action if there is update resource permission and folders available", async () => {
		vi.spyOn(settingsStore, 'isFoldersFeatureEnabled', 'get').mockReturnValue(true);
		vi.spyOn(vueRouter, 'useRoute').mockReturnValueOnce({
			name: VIEWS.PROJECTS,
		} as vueRouter.RouteLocationNormalizedLoadedGeneric);

		const data = createWorkflow({
			scopes: ['workflow:update'],
		});

		const { getByTestId } = renderComponent({ props: { data, areFoldersEnabled: true } });
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).toHaveTextContent('Move');
	});

	it("should not show 'Move' action on the 'Shared with you' page", async () => {
		vi.spyOn(settingsStore, 'isFoldersFeatureEnabled', 'get').mockReturnValue(true);

		const data = createWorkflow({
			scopes: ['workflow:update'],
		});

		vi.spyOn(vueRouter, 'useRoute').mockReturnValueOnce({
			name: VIEWS.SHARED_WORKFLOWS,
		} as vueRouter.RouteLocationNormalizedLoadedGeneric);

		const { getByTestId } = renderComponent({ props: { data } });
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).not.toHaveTextContent('Move');
	});

	it("should not show 'Move' action on read only instance", async () => {
		vi.spyOn(projectsStore, 'isTeamProjectFeatureEnabled', 'get').mockReturnValue(true);
		vi.spyOn(settingsStore, 'isFoldersFeatureEnabled', 'get').mockReturnValue(true);
		vi.spyOn(vueRouter, 'useRoute').mockReturnValueOnce({
			name: VIEWS.PROJECTS,
		} as vueRouter.RouteLocationNormalizedLoadedGeneric);

		const data = createWorkflow({
			scopes: ['workflow:update'],
		});

		const { getByTestId } = renderComponent({
			props: { data, areFoldersEnabled: true, readOnly: true },
		});
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).not.toHaveTextContent('Move');
	});

	it("should have 'Archive' action on non archived nonactive workflows", async () => {
		const data = createWorkflow({
			active: false,
			isArchived: false,
			scopes: ['workflow:delete'],
		});

		const { getByTestId, emitted } = renderComponent({
			props: { data },
		});
		const cardActions = getByTestId('workflow-card-actions');
		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');
		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).toHaveTextContent('Archive');
		expect(actions).not.toHaveTextContent('Unarchive');
		expect(actions).not.toHaveTextContent('Delete');

		await userEvent.click(getByTestId('action-archive'));

		expect(message.confirm).not.toHaveBeenCalled();
		expect(workflowsStore.archiveWorkflow).toHaveBeenCalledTimes(1);
		expect(workflowsStore.archiveWorkflow).toHaveBeenCalledWith(data.id);
		expect(toast.showError).not.toHaveBeenCalled();
		expect(toast.showToast).toHaveBeenCalledTimes(1);
		expect(emitted()['workflow:archived']).toHaveLength(1);
	});

	it("should confirm 'Archive' action on active workflows", async () => {
		const data = createWorkflow({
			isArchived: false,
			active: true,
			scopes: ['workflow:delete'],
		});

		const { getByTestId, emitted } = renderComponent({
			props: { data },
		});
		const cardActions = getByTestId('workflow-card-actions');
		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');
		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).toHaveTextContent('Archive');
		expect(actions).not.toHaveTextContent('Unarchive');
		expect(actions).not.toHaveTextContent('Delete');

		await userEvent.click(getByTestId('action-archive'));

		expect(message.confirm).toHaveBeenCalledTimes(1);
		expect(workflowsStore.archiveWorkflow).toHaveBeenCalledTimes(1);
		expect(workflowsStore.archiveWorkflow).toHaveBeenCalledWith(data.id);
		expect(toast.showError).not.toHaveBeenCalled();
		expect(toast.showToast).toHaveBeenCalledTimes(1);
		expect(emitted()['workflow:archived']).toHaveLength(1);
	});

	it('should show a "Delete permanently" link in the archive toast that deletes the archived workflow', async () => {
		const data = createWorkflow({
			active: false,
			isArchived: false,
			scopes: ['workflow:delete'],
		});

		const { getByTestId, emitted, rerender } = renderComponent({ props: { data } });
		await userEvent.click(within(getByTestId('workflow-card-actions')).getByRole('button'));
		await userEvent.click(getByTestId('action-archive'));

		expect(toast.showToast).toHaveBeenCalledTimes(1);
		const toastConfig = vi.mocked(toast.showToast).mock.calls[0][0];
		expect(toastConfig.message).toContain('archive-toast-delete-permanently-link');
		expect(toastConfig.onClick).toBeDefined();

		// Simulate v-for reuse: parent replaces props.data with a different workflow.
		// The toast onClick must still delete the originally archived workflow.
		await rerender({ data: createWorkflow({ id: 'different-id', name: 'Other Workflow' }) });

		const anchor = document.createElement('a');
		toastConfig.onClick?.({ target: anchor, preventDefault: vi.fn() } as unknown as MouseEvent);
		await waitFor(() => {
			expect(workflowsListStore.deleteWorkflow).toHaveBeenCalledTimes(1);
		});
		expect(workflowsListStore.deleteWorkflow).toHaveBeenCalledWith(data.id);
		expect(emitted()['workflow:deleted']).toHaveLength(1);
	});

	it('should not delete when "Delete permanently" confirmation is cancelled', async () => {
		const data = createWorkflow({
			active: false,
			isArchived: false,
			scopes: ['workflow:delete'],
		});

		const { getByTestId } = renderComponent({ props: { data } });
		await userEvent.click(within(getByTestId('workflow-card-actions')).getByRole('button'));
		await userEvent.click(getByTestId('action-archive'));

		const toastConfig = vi.mocked(toast.showToast).mock.calls[0][0];
		vi.mocked(message.confirm).mockResolvedValueOnce('cancel');

		const anchor = document.createElement('a');
		toastConfig.onClick?.({ target: anchor, preventDefault: vi.fn() } as unknown as MouseEvent);
		await waitFor(() => {
			expect(message.confirm).toHaveBeenCalled();
		});
		expect(workflowsListStore.deleteWorkflow).not.toHaveBeenCalled();
	});

	it("should have 'Unarchive' action on archived workflows", async () => {
		const data = createWorkflow({
			isArchived: true,
			scopes: ['workflow:delete'],
		});

		const { getByTestId, emitted } = renderComponent({
			props: { data },
		});
		const cardActions = getByTestId('workflow-card-actions');
		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');
		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).not.toHaveTextContent('Archive');
		expect(actions).toHaveTextContent('Unarchive');
		expect(actions).toHaveTextContent('Delete');

		await userEvent.click(getByTestId('action-unarchive'));

		expect(workflowsStore.unarchiveWorkflow).toHaveBeenCalledTimes(1);
		expect(workflowsStore.unarchiveWorkflow).toHaveBeenCalledWith(data.id);
		expect(toast.showError).not.toHaveBeenCalled();
		expect(toast.showMessage).toHaveBeenCalledTimes(1);
		expect(emitted()['workflow:unarchived']).toHaveLength(1);
	});

	it("should show 'Delete' action on archived workflows", async () => {
		const data = createWorkflow({
			isArchived: true,
			scopes: ['workflow:delete'],
		});

		const { getByTestId, emitted } = renderComponent({
			props: { data },
		});
		const cardActions = getByTestId('workflow-card-actions');
		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');
		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).not.toHaveTextContent('Archive');
		expect(actions).toHaveTextContent('Unarchive');
		expect(actions).toHaveTextContent('Delete');

		await userEvent.click(getByTestId('action-delete'));

		expect(message.confirm).toHaveBeenCalledTimes(1);
		expect(workflowsListStore.deleteWorkflow).toHaveBeenCalledTimes(1);
		expect(workflowsListStore.deleteWorkflow).toHaveBeenCalledWith(data.id);
		expect(toast.showError).not.toHaveBeenCalled();
		expect(toast.showMessage).toHaveBeenCalledTimes(1);
		expect(emitted()['workflow:deleted']).toHaveLength(1);
	});

	it('should show Read only mode', async () => {
		const data = createWorkflow();
		const { getByRole } = renderComponent({ props: { data } });

		const heading = getByRole('heading');
		expect(heading).toHaveTextContent('Read only');
	});

	it('should show MCP toggle on the card when module is enabled and user can update', () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: false,
			},
			isArchived: false,
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		const mcpToggle = getByTestId('workflow-card-mcp-toggle');
		expect(mcpToggle).toBeVisible();
		expect(mcpToggle).toHaveAttribute('aria-checked', 'false');
	});

	it('should mark MCP toggle as pressed when workflow is available in MCP', () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: true,
			},
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		const mcpToggle = getByTestId('workflow-card-mcp-toggle');
		expect(mcpToggle).toHaveAttribute('aria-checked', 'true');
	});

	it('should render the MCP toggle as off when the instance module is disabled, even if the workflow is available in MCP', () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: true,
			},
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: false,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		const mcpToggle = getByTestId('workflow-card-mcp-toggle');
		expect(mcpToggle).toHaveAttribute('aria-checked', 'false');
	});

	it('should toggle MCP access when the MCP button is clicked', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: false,
			},
		});

		mcpStore.toggleWorkflowMcpAccess.mockResolvedValue({
			updatedCount: 1,
			skippedCount: 0,
			failedCount: 0,
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		await userEvent.click(getByTestId('workflow-card-mcp-toggle'));

		expect(mcpStore.toggleWorkflowMcpAccess).toHaveBeenCalledWith(data.id, true);
	});

	it('should not include MCP actions in the dropdown menu', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: true,
			},
			isArchived: false,
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		const actionsToggle = getByTestId('workflow-card-actions');
		const toggleButton = within(actionsToggle).getByRole('button');
		const controllingId = toggleButton.getAttribute('aria-controls');

		await userEvent.click(toggleButton);

		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}

		expect(within(actions).queryByTestId('action-enableMCPAccess')).not.toBeInTheDocument();
		expect(within(actions).queryByTestId('action-removeMCPAccess')).not.toBeInTheDocument();
	});

	it('should open the MCP onboarding modal when the switch is clicked while the instance module is off', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: false,
			},
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: false,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		const mcpToggle = getByTestId('workflow-card-mcp-toggle');
		expect(mcpToggle).toBeVisible();
		expect(mcpToggle).toHaveAttribute('aria-checked', 'false');

		await userEvent.click(mcpToggle);

		expect(mcpStore.toggleWorkflowMcpAccess).not.toHaveBeenCalled();
		expect(uiStore.openModalWithData).toHaveBeenCalledWith(
			expect.objectContaining({
				name: SURFACE_MCP_ONBOARDING_MODAL_KEY,
				data: expect.objectContaining({
					surface: 'workflow_card',
					onMcpAccessEnabled: expect.any(Function),
				}),
			}),
		);
	});

	it('should enable workflow MCP access when the modal callback fires', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: false,
			},
		});

		mcpStore.toggleWorkflowMcpAccess.mockResolvedValue({
			updatedCount: 1,
			skippedCount: 0,
			failedCount: 0,
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: false,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		await userEvent.click(getByTestId('workflow-card-mcp-toggle'));

		const openCall = vi.mocked(uiStore.openModalWithData).mock.calls.at(-1)?.[0];
		const callback = (openCall?.data as { onMcpAccessEnabled?: () => void } | undefined)
			?.onMcpAccessEnabled;
		callback?.();

		await waitFor(() => {
			expect(mcpStore.toggleWorkflowMcpAccess).toHaveBeenCalledWith(data.id, true);
		});
	});

	it('should not re-toggle when the modal callback fires and the workflow is already available', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: true,
			},
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: false,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		await userEvent.click(getByTestId('workflow-card-mcp-toggle'));

		const openCall = vi.mocked(uiStore.openModalWithData).mock.calls.at(-1)?.[0];
		const callback = (openCall?.data as { onMcpAccessEnabled?: () => void } | undefined)
			?.onMcpAccessEnabled;
		callback?.();

		expect(mcpStore.toggleWorkflowMcpAccess).not.toHaveBeenCalled();
	});

	it('should leave workflow MCP off if the modal callback never fires', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: false,
			},
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: false,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		await userEvent.click(getByTestId('workflow-card-mcp-toggle'));
		await waitFor(() => {
			expect(uiStore.openModalWithData).toHaveBeenCalled();
		});

		expect(mcpStore.toggleWorkflowMcpAccess).not.toHaveBeenCalled();
	});

	it('should show MCP toggle as disabled when user cannot update but workflow is available', () => {
		const data = createWorkflow({
			settings: {
				availableInMCP: true,
			},
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		const mcpToggle = getByTestId('workflow-card-mcp-toggle');
		expect(mcpToggle).toBeVisible();
		expect(mcpToggle).toBeDisabled();
	});

	it('should hide MCP toggle when user cannot update and workflow is not available', () => {
		const data = createWorkflow({
			settings: {
				availableInMCP: false,
			},
		});

		const { queryByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		expect(queryByTestId('workflow-card-mcp-toggle')).not.toBeInTheDocument();
	});

	it('should disable the MCP toggle for non-admins when instance MCP is off', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: false,
			},
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: false,
				isMcpModuleActive: true,
				canManageInstanceMcp: false,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		const mcpToggle = getByTestId('workflow-card-mcp-toggle');
		expect(mcpToggle).toBeVisible();
		expect(mcpToggle).toBeDisabled();

		await userEvent.click(mcpToggle);
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
		expect(mcpStore.toggleWorkflowMcpAccess).not.toHaveBeenCalled();
	});

	it('should hide MCP toggle when the MCP module is not loaded on the instance', () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: true,
			},
		});

		const { queryByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: false,
				isMcpModuleActive: false,
			},
		});

		expect(queryByTestId('workflow-card-mcp-toggle')).not.toBeInTheDocument();
	});

	it('should hide the inline MCP switch when the workflow-card MCP toggle experiment is off', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: false,
			},
		});

		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: false,
			},
		});

		expect(queryByTestId('workflow-card-mcp-toggle')).not.toBeInTheDocument();

		const actionsToggle = getByTestId('workflow-card-actions');
		const toggleButton = within(actionsToggle).getByRole('button');
		const controllingId = toggleButton.getAttribute('aria-controls');

		await userEvent.click(toggleButton);

		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(within(actions).getByTestId('action-enableMCPAccess')).toBeInTheDocument();
	});

	it('should show the legacy MCP indicator in the card description when the experiment is off and the workflow is available', () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: true,
			},
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: false,
			},
		});

		expect(getByTestId('workflow-card-mcp')).toBeVisible();
	});

	it('should hide the legacy MCP indicator when the experiment is on (the inline switch replaces it)', () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: true,
			},
		});

		const { queryByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		expect(queryByTestId('workflow-card-mcp')).not.toBeVisible();
	});

	it('should show Remove MCP access in the menu when the experiment is off and workflow is available', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: true,
			},
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: false,
			},
		});

		const actionsToggle = getByTestId('workflow-card-actions');
		const toggleButton = within(actionsToggle).getByRole('button');
		const controllingId = toggleButton.getAttribute('aria-controls');

		await userEvent.click(toggleButton);

		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(within(actions).getByTestId('action-removeMCPAccess')).toBeInTheDocument();
	});

	it('should call toggleWorkflowMcpAccess from the dropdown menu item when the experiment is off', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: false,
			},
		});

		mcpStore.toggleWorkflowMcpAccess.mockResolvedValue({
			updatedCount: 1,
			skippedCount: 0,
			failedCount: 0,
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: false,
			},
		});

		const actionsToggle = getByTestId('workflow-card-actions');
		const toggleButton = within(actionsToggle).getByRole('button');
		const controllingId = toggleButton.getAttribute('aria-controls');

		await userEvent.click(toggleButton);

		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		await userEvent.click(within(actions).getByTestId('action-enableMCPAccess'));

		expect(mcpStore.toggleWorkflowMcpAccess).toHaveBeenCalledWith(data.id, true);
	});

	it('should hide MCP menu items when the experiment is off and instance MCP is disabled', async () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			settings: {
				availableInMCP: false,
			},
		});

		const { getByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: false,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: false,
			},
		});

		const actionsToggle = getByTestId('workflow-card-actions');
		const toggleButton = within(actionsToggle).getByRole('button');
		const controllingId = toggleButton.getAttribute('aria-controls');

		await userEvent.click(toggleButton);

		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(within(actions).queryByTestId('action-enableMCPAccess')).not.toBeInTheDocument();
		expect(within(actions).queryByTestId('action-removeMCPAccess')).not.toBeInTheDocument();
	});

	it('should hide MCP toggle when workflow is archived', () => {
		const data = createWorkflow({
			scopes: ['workflow:update'],
			isArchived: true,
			settings: {
				availableInMCP: false,
			},
		});

		const { queryByTestId } = renderComponent({
			props: {
				data,
				isMcpEnabled: true,
				isMcpModuleActive: true,
				canManageInstanceMcp: true,
				isWorkflowCardMcpToggleEnabled: true,
			},
		});

		expect(queryByTestId('workflow-card-mcp-toggle')).not.toBeInTheDocument();
	});

	it('should show dynamic credentials indicator when workflow has resolvable credentials', () => {
		const data = createWorkflow({
			hasResolvableCredentials: true,
		});

		const { getByTestId } = renderComponent({ props: { data } });

		const indicator = getByTestId('workflow-card-dynamic-credentials');
		expect(indicator).toBeVisible();
	});

	it('should hide dynamic credentials indicator when workflow has no resolvable credentials', () => {
		const data = createWorkflow({
			hasResolvableCredentials: false,
		});

		const { queryByTestId } = renderComponent({ props: { data } });

		const indicator = queryByTestId('workflow-card-dynamic-credentials');
		expect(indicator).toBeNull();
	});

	it('should show resolver missing badge when workflow has resolvable credentials but no resolver configured', () => {
		const data = createWorkflow({
			hasResolvableCredentials: true,
			settings: {
				credentialResolverId: undefined,
			},
		});

		const { getByTestId } = renderComponent({ props: { data } });

		const badge = getByTestId('workflow-card-resolver-missing');
		expect(badge).toBeVisible();
	});

	it('should hide resolver missing badge when workflow has resolver configured', () => {
		const data = createWorkflow({
			hasResolvableCredentials: true,
			settings: {
				credentialResolverId: 'resolver-123',
			},
		});

		const { queryByTestId } = renderComponent({ props: { data } });

		const badge = queryByTestId('workflow-card-resolver-missing');
		expect(badge).toBeNull();
	});

	it('should show Archived text on archived workflows', async () => {
		const data = createWorkflow({ isArchived: true });
		const { getByTestId, queryByTestId } = renderComponent({ props: { data } });

		expect(getByTestId('workflow-card-archived')).toBeInTheDocument();
		expect(getByTestId('workflow-card-archived')).toHaveTextContent('Archived');
		expect(queryByTestId('workflow-card-activator')).not.toBeInTheDocument();
	});

	it('should not show Archived text on non archived workflows', async () => {
		const data = createWorkflow({ isArchived: false });
		const { queryByTestId } = renderComponent({ props: { data } });

		expect(queryByTestId('workflow-card-archived')).not.toBeInTheDocument();
	});

	it("should show 'Duplicate' action when user has read permission and can create workflows", async () => {
		const data = createWorkflow({
			scopes: ['workflow:read'],
			isArchived: false,
		});

		vi.spyOn(vueRouter, 'useRoute').mockReturnValueOnce({
			name: VIEWS.PROJECTS,
		} as vueRouter.RouteLocationNormalizedLoadedGeneric);

		// Mock user with global workflow create permission
		usersStore.currentUser = {
			id: '1',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
			isDefaultUser: false,
			isPendingUser: false,
			mfaEnabled: false,
			globalScopes: ['workflow:create'],
		} as IUser;

		const { getByTestId } = renderComponent({ props: { data } });
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).toHaveTextContent('Duplicate');
	});

	it("should show 'Duplicate' action when user has project-level create workflow permission", async () => {
		const projectId = 'project-123';
		const data = createWorkflow({
			scopes: ['workflow:read'],
			isArchived: false,
			homeProject: {
				id: projectId,
				name: 'Test Project',
			},
		});

		vi.spyOn(vueRouter, 'useRoute').mockReturnValueOnce({
			name: VIEWS.PROJECTS,
		} as vueRouter.RouteLocationNormalizedLoadedGeneric);

		// Mock user without global workflow create permission
		usersStore.currentUser = {
			id: '1',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
			isDefaultUser: false,
			isPendingUser: false,
			mfaEnabled: false,
			globalScopes: [],
		} as IUser;

		// Mock project with workflow create permission
		projectsStore.myProjects = [
			{
				id: projectId,
				name: 'Test Project',
				icon: null,
				type: 'team',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				role: 'project:editor',
				scopes: ['workflow:create'],
			} as ProjectListItem,
		];

		const { getByTestId } = renderComponent({ props: { data } });
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).toHaveTextContent('Duplicate');
	});

	it("should not show 'Duplicate' action when user does not have create workflow permission", async () => {
		const data = createWorkflow({
			scopes: ['workflow:read'],
			isArchived: false,
		});

		vi.spyOn(vueRouter, 'useRoute').mockReturnValueOnce({
			name: VIEWS.PROJECTS,
		} as vueRouter.RouteLocationNormalizedLoadedGeneric);

		// Mock user without workflow create permission
		usersStore.currentUser = {
			id: '1',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
			isDefaultUser: false,
			isPendingUser: false,
			mfaEnabled: false,
			globalScopes: [],
		} as IUser;

		const { getByTestId } = renderComponent({ props: { data } });
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).not.toHaveTextContent('Duplicate');
	});

	describe('Unpublish functionality', () => {
		beforeEach(() => {
			// Enable draft/publish feature by default for unpublish tests
			settingsStore.isFeatureEnabled = vi.fn().mockReturnValue(true);
		});

		it('should show "Unpublish" action when workflow is published and user has permissions', async () => {
			const data = createWorkflow({
				activeVersionId: 'v1', // Published workflow
				scopes: ['workflow:unpublish'],
			});

			const { getByTestId } = renderComponent({ props: { data } });
			const cardActions = getByTestId('workflow-card-actions');
			const cardActionsOpener = within(cardActions).getByRole('button');
			const controllingId = cardActionsOpener.getAttribute('aria-controls');

			await userEvent.click(cardActionsOpener);
			const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
			if (!actions) {
				throw new Error('Actions menu not found');
			}

			expect(actions).toHaveTextContent('Unpublish');
		});

		it('should not show "Unpublish" action when workflow is not published', async () => {
			const data = createWorkflow({
				activeVersionId: null, // Not published
				scopes: ['workflow:unpublish'],
			});

			const { getByTestId } = renderComponent({ props: { data } });
			const cardActions = getByTestId('workflow-card-actions');
			const cardActionsOpener = within(cardActions).getByRole('button');
			const controllingId = cardActionsOpener.getAttribute('aria-controls');

			await userEvent.click(cardActionsOpener);
			const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
			if (!actions) {
				throw new Error('Actions menu not found');
			}

			expect(actions).not.toHaveTextContent('Unpublish');
		});

		it('should not show "Unpublish" action when user lacks unpublish permission', async () => {
			const data = createWorkflow({
				activeVersionId: 'v1',
				scopes: ['workflow:read'], // No unpublish permission
			});

			const { getByTestId } = renderComponent({ props: { data } });
			const cardActions = getByTestId('workflow-card-actions');
			const cardActionsOpener = within(cardActions).getByRole('button');
			const controllingId = cardActionsOpener.getAttribute('aria-controls');

			await userEvent.click(cardActionsOpener);
			const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
			if (!actions) {
				throw new Error('Actions menu not found');
			}

			expect(actions).not.toHaveTextContent('Unpublish');
		});

		it('should emit workflow:unpublished event when unpublish action is successful', async () => {
			const data = createWorkflow({
				activeVersionId: 'v1',
				scopes: ['workflow:unpublish'],
			});

			const { getByTestId, emitted } = renderComponent({ props: { data } });
			const cardActions = getByTestId('workflow-card-actions');
			const cardActionsOpener = within(cardActions).getByRole('button');
			const controllingId = cardActionsOpener.getAttribute('aria-controls');

			await userEvent.click(cardActionsOpener);
			const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
			if (!actions) {
				throw new Error('Actions menu not found');
			}

			// Find and click the unpublish action
			const unpublishAction = within(actions).getByTestId('action-unpublish');
			await userEvent.click(unpublishAction);

			await waitFor(() => {
				expect(emitted()['workflow:unpublished']).toBeTruthy();
				expect(emitted()['workflow:unpublished'][0]).toEqual([{ id: '1' }]);
			});
		});
	});
});
