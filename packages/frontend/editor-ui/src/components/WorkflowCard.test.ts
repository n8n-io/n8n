import type { MockInstance } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/constants';
import WorkflowCard from '@/components/WorkflowCard.vue';
import type { IWorkflowDb } from '@/Interface';
import { useRouter } from 'vue-router';
import { useProjectsStore } from '@/stores/projects.store';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '' });
	return {
		useRouter: () => ({
			push,
			resolve,
		}),
		useRoute: () => ({}),
		RouterLink: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(WorkflowCard);

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
	let pinia: ReturnType<typeof createPinia>;
	let windowOpenSpy: MockInstance;
	let router: ReturnType<typeof useRouter>;
	let projectsStore: ReturnType<typeof useProjectsStore>;

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
		router = useRouter();
		projectsStore = useProjectsStore();
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

	it('should show Move action only if there is resource permission and team projects available', async () => {
		vi.spyOn(projectsStore, 'isTeamProjectFeatureEnabled', 'get').mockReturnValue(true);

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
		expect(actions).toHaveTextContent('Change owner');
	});

	it('should show Archive action on non archived workflows', async () => {
		const data = createWorkflow({
			isArchived: false,
			scopes: ['workflow:delete'],
		});

		const onAction = vi.fn();
		const { getByTestId } = renderComponent({
			props: { data },
			global: {
				mocks: {
					onAction,
				},
			},
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
		expect(onAction).toHaveBeenCalledWith('archive');
	});

	it('should show Unarchive and Delete action on archived workflows', async () => {
		const data = createWorkflow({
			isArchived: true,
			scopes: ['workflow:delete'],
		});

		const onAction = vi.fn();
		const { getByTestId } = renderComponent({
			props: { data },
			global: {
				mocks: {
					onAction,
				},
			},
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
		expect(onAction).toHaveBeenCalledWith('unarchive');
		await userEvent.click(getByTestId('action-delete'));
		expect(onAction).toHaveBeenCalledWith('delete');
	});

	it('should show Read only mode', async () => {
		const data = createWorkflow();
		const { getByRole } = renderComponent({ props: { data } });

		const heading = getByRole('heading');
		expect(heading).toHaveTextContent('Read only');
	});

	it('should show Archived badge on archived workflows', async () => {
		const data = createWorkflow({ isArchived: true });
		const { getByTestId } = renderComponent({ props: { data } });

		expect(getByTestId('workflow-archived-tag')).toBeInTheDocument();
	});

	it('should not show Archived badge on non archived workflows', async () => {
		const data = createWorkflow({ isArchived: false });
		const { queryByTestId } = renderComponent({ props: { data } });

		expect(queryByTestId('workflow-archived-tag')).not.toBeInTheDocument();
	});
});
