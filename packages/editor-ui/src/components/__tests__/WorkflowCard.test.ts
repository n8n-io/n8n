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

const createWorkflow = (overrides = {}) => ({
	id: '1',
	name: 'My Workflow',
	createdAt: new Date().toISOString(),
	...overrides,
});

describe('WorkflowCard', () => {
	let pinia: ReturnType<typeof createPinia>;
	let windowOpenSpy: MockInstance;

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
		const data = createWorkflow({
			homeProject: {
				name: 'Test Project',
			},
		});
		const { getByRole } = renderComponent({ props: { data } });

		const heading = getByRole('heading');
		const span = heading.querySelector('span');

		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent(data.name);
		expect(heading).toContain(span);
		expect(span).toHaveTextContent(data.homeProject.name);
	});

	it('should render name only', () => {
		const data = createWorkflow();
		const { getByRole } = renderComponent({ props: { data } });

		const heading = getByRole('heading');
		const span = heading.querySelector('span');

		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent(data.name);
		expect(span).toBeNull();
	});
});
