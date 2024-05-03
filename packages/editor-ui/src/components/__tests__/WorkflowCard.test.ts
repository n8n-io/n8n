import type { MockInstance } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/constants';
import WorkflowCard from '@/components/WorkflowCard.vue';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IWorkflowDb } from '@/Interface';

const $router = {
	push: vi.fn(),
	resolve: vi.fn().mockImplementation(() => ({ href: '' })),
};

const renderComponent = createComponentRenderer(WorkflowCard, {
	global: {
		mocks: {
			$router,
		},
	},
});

const createWorkflow = (overrides = {}): IWorkflowDb => ({
	id: '1',
	name: 'My Workflow',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	nodes: [],
	connections: {},
	active: true,
	versionId: '1',
	...overrides,
});

describe('WorkflowCard', () => {
	let pinia: ReturnType<typeof createPinia>;
	let windowOpenSpy: MockInstance;
	let uiStore: ReturnType<typeof useUIStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let usersStore: ReturnType<typeof useUsersStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
		uiStore = useUIStore();
		settingsStore = useSettingsStore();
		usersStore = useUsersStore();
		workflowsStore = useWorkflowsStore();
		windowOpenSpy = vi.spyOn(window, 'open');
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render a card with the workflow name and open workflow clicking on it', async () => {
		const data = createWorkflow();
		const { getByRole } = renderComponent({ props: { data } });
		const cardTitle = getByRole('heading', { level: 2, name: data.name });

		expect(cardTitle).toBeInTheDocument();

		await userEvent.click(cardTitle);
		await waitFor(() => {
			expect($router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW,
				params: { name: data.id },
			});
		});

		// Opens in new tab if meta key is used
		const user = userEvent.setup();

		await user.keyboard('[ControlLeft>]');
		await user.click(cardTitle);
		await waitFor(() => {
			expect($router.push).toHaveBeenCalledTimes(1);
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
			expect($router.push).not.toHaveBeenCalled();
		});

		const actions = document.querySelector(`#${controllingId}`);
		await waitFor(() => {
			expect(actions).toBeInTheDocument();
		});
		await userEvent.click(actions!.querySelectorAll('li')[0]);
		await waitFor(() => {
			expect($router.push).toHaveBeenCalledWith({
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
		const { getByRole, getByTestId } = renderComponent({ props: { data } });

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
		const { getByRole, getByTestId } = renderComponent({ props: { data } });

		const heading = getByRole('heading');
		const badge = getByTestId('card-badge');

		expect(heading).toHaveTextContent(data.name);
		expect(badge).toHaveTextContent('John Doe');
	});
});
