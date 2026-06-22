/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import AgentSelectorParameterInput, { type Props } from './AgentSelectorParameterInput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

const { listAgentsPage, listAgentsPageGlobal } = vi.hoisted(() => ({
	listAgentsPage: vi.fn(),
	listAgentsPageGlobal: vi.fn(),
}));

const { routerPush } = vi.hoisted(() => ({
	routerPush: vi.fn(),
}));

const flushPromises = async () => await new Promise(setImmediate);

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listAgentsPage,
	listAgentsPageGlobal,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPush,
		resolve: vi.fn().mockReturnValue({ href: '/projects/proj-1/agents/v2/agent-1' }),
	}),
	useRoute: () => ({ params: { projectId: 'proj-1' } }),
	RouterLink: vi.fn(),
}));

const renderComponent = createComponentRenderer(AgentSelectorParameterInput);

let projectsStore: MockedStore<typeof useProjectsStore>;

const baseParameter = {
	displayName: 'Agent',
	type: 'agentSelector' as const,
	name: 'agentId',
	default: '',
};

function makeProps(overrides: Partial<Props> = {}): Props {
	return {
		modelValue: { __rl: true, value: '', mode: 'list' },
		path: '',
		parameter: baseParameter,
		...overrides,
	};
}

describe('AgentSelectorParameterInput', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({}));

		projectsStore = mockedStore(useProjectsStore);
		projectsStore.isTeamProjectFeatureEnabled = false;
		projectsStore.currentProjectId = 'proj-1';

		listAgentsPage.mockResolvedValue({ count: 0, data: [] });
		listAgentsPageGlobal.mockResolvedValue({ count: 0, data: [] });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('fetches the first project-scoped page on mount', async () => {
		renderComponent({ props: makeProps() });
		await flushPromises();

		expect(listAgentsPage).toHaveBeenCalledWith(
			expect.anything(),
			'proj-1',
			expect.objectContaining({ skip: 0, take: 40, sortBy: 'updatedAt:desc' }),
		);
		expect(listAgentsPageGlobal).not.toHaveBeenCalled();
	});

	it('lists agents and prefixes the project name for non-personal projects', async () => {
		projectsStore.isTeamProjectFeatureEnabled = true;
		projectsStore.personalProject = { id: 'personal-1' } as any;
		projectsStore.myProjects = [
			{ id: 'personal-1', name: 'Me', type: 'personal' },
			{ id: 'team-1', name: 'Marketing', type: 'team' },
		] as any;

		listAgentsPage.mockResolvedValue({
			count: 2,
			data: [
				{ id: 'agent-1', name: 'Personal Agent', projectId: 'personal-1' },
				{ id: 'agent-2', name: 'Team Agent', projectId: 'team-1' },
			],
		});

		const { getByTestId, getAllByTestId } = renderComponent({ props: makeProps() });
		await flushPromises();

		await userEvent.click(getByTestId('rlc-input'));
		await flushPromises();

		const items = getAllByTestId('rlc-item').map((el) => el.textContent?.trim());
		expect(items).toContain('Personal Agent');
		expect(items).toContain('Marketing — Team Agent');
	});

	it('filters by query when searching', async () => {
		const { getByTestId } = renderComponent({ props: makeProps() });
		await flushPromises();

		await userEvent.click(getByTestId('rlc-input'));
		await userEvent.type(getByTestId('rlc-search'), 'support');
		await flushPromises();

		expect(listAgentsPage).toHaveBeenLastCalledWith(
			expect.anything(),
			'proj-1',
			expect.objectContaining({ skip: 0, filter: { query: 'support' } }),
		);
	});

	it('emits an RLC value with the cached name when an agent is selected', async () => {
		listAgentsPage.mockResolvedValue({
			count: 1,
			data: [{ id: 'agent-1', name: 'Support Agent', projectId: 'proj-1' }],
		});

		const { getByTestId, emitted } = renderComponent({ props: makeProps() });
		await flushPromises();

		await userEvent.click(getByTestId('rlc-input'));
		await flushPromises();
		await userEvent.click(getByTestId('rlc-item'));

		expect(emitted()['update:modelValue']?.[0]).toEqual([
			{ __rl: true, value: 'agent-1', mode: 'list', cachedResultName: 'Support Agent' },
		]);
	});

	it('surfaces the create-agent action even when the catalog is empty', async () => {
		const { getByTestId } = renderComponent({ props: makeProps() });
		await flushPromises();

		await userEvent.click(getByTestId('rlc-input'));
		await flushPromises();

		expect(getByTestId('rlc-item-add-resource')).toBeInTheDocument();
	});

	it('emits an intent on create-agent click without creating or navigating', async () => {
		const { getByTestId, emitted } = renderComponent({ props: makeProps() });
		await flushPromises();

		await userEvent.click(getByTestId('rlc-input'));
		await flushPromises();
		await userEvent.click(getByTestId('rlc-item-add-resource'));

		expect(emitted().agentCreateRequested).toHaveLength(1);
		expect(routerPush).not.toHaveBeenCalled();
	});

	it('shows an error with retry that re-fetches the catalog', async () => {
		listAgentsPage.mockRejectedValueOnce(new Error('boom'));

		const { getByTestId } = renderComponent({ props: makeProps() });
		await flushPromises();

		await userEvent.click(getByTestId('rlc-input'));
		await flushPromises();

		expect(getByTestId('rlc-error-container')).toBeInTheDocument();

		listAgentsPage.mockResolvedValue({ count: 0, data: [] });
		await userEvent.click(getByTestId('rlc-error-retry'));
		await flushPromises();

		expect(listAgentsPage).toHaveBeenCalledTimes(2);
	});
});
