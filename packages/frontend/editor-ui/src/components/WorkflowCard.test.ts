import type { MockInstance } from 'vitest';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { MODAL_CONFIRM, VIEWS } from '@/constants';
import WorkflowCard from '@/components/WorkflowCard.vue';
import type { IWorkflowDb } from '@/Interface';
import * as vueRouter from 'vue-router';
import { useProjectsStore } from '@/stores/projects.store';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@/stores/settings.store';

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

const renderComponent = createComponentRenderer(WorkflowCard, {
	pinia: createTestingPinia({}),
});

const createWorkflow = (overrides = {}): IWorkflowDb => ({
	id: '1',
	name: 'My Workflow',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	nodes: [],
	connections: {},
	active: true,
	isArchived: false,
	versionId: '1',
	...overrides,
});

describe('WorkflowCard', () => {
	let windowOpenSpy: MockInstance;
	let router: ReturnType<typeof vueRouter.useRouter>;
	let projectsStore: MockedStore<typeof useProjectsStore>;
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let message: ReturnType<typeof useMessage>;
	let toast: ReturnType<typeof useToast>;

	beforeEach(async () => {
		router = vueRouter.useRouter();
		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);
		workflowsStore = mockedStore(useWorkflowsStore);
		message = useMessage();
		toast = useToast();

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
				params: { name: data.id },
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

		await userEvent.click(cardActions);
		await waitFor(() => {
			expect(router.push).not.toHaveBeenCalled();
		});

		const actions = document.querySelector(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		await userEvent.click(actions.querySelectorAll('li')[0]);
		expect(actions).not.toHaveTextContent('Move');
		await waitFor(() => {
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW,
				params: { name: data.id },
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
		const { getByTestId } = renderComponent({ props: { data } });
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActions);
		const actions = document.querySelector(`#${controllingId}`);
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

		const { getByTestId } = renderComponent({ props: { data } });
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActions);
		const actions = document.querySelector(`#${controllingId}`);
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

		await userEvent.click(cardActions);
		const actions = document.querySelector(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).not.toHaveTextContent('Move');
	});

	it("should not show 'Move' action on the 'Workflows' page", async () => {
		vi.spyOn(settingsStore, 'isFoldersFeatureEnabled', 'get').mockReturnValue(true);

		const data = createWorkflow({
			scopes: ['workflow:update'],
		});

		vi.spyOn(vueRouter, 'useRoute').mockReturnValueOnce({
			name: VIEWS.WORKFLOWS,
		} as vueRouter.RouteLocationNormalizedLoadedGeneric);

		const { getByTestId } = renderComponent({ props: { data } });
		const cardActions = getByTestId('workflow-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActions);
		const actions = document.querySelector(`#${controllingId}`);
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
		await userEvent.click(cardActions);
		const actions = document.querySelector(`#${controllingId}`);
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
		expect(toast.showMessage).toHaveBeenCalledTimes(1);
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
		await userEvent.click(cardActions);
		const actions = document.querySelector(`#${controllingId}`);
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
		expect(toast.showMessage).toHaveBeenCalledTimes(1);
		expect(emitted()['workflow:archived']).toHaveLength(1);
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
		await userEvent.click(cardActions);
		const actions = document.querySelector(`#${controllingId}`);
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
		await userEvent.click(cardActions);
		const actions = document.querySelector(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).not.toHaveTextContent('Archive');
		expect(actions).toHaveTextContent('Unarchive');
		expect(actions).toHaveTextContent('Delete');

		await userEvent.click(getByTestId('action-delete'));

		expect(message.confirm).toHaveBeenCalledTimes(1);
		expect(workflowsStore.deleteWorkflow).toHaveBeenCalledTimes(1);
		expect(workflowsStore.deleteWorkflow).toHaveBeenCalledWith(data.id);
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
		expect(queryByTestId('workflow-card-activator')).toBeInTheDocument();
	});
});
