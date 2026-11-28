import type { McpServerListItem } from '@n8n/api-types';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import type { Scope } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/vue';
import { defineComponent, h, onMounted, type PropType } from 'vue';

import { useCreateMcpServerDialog } from '../composables/useCreateMcpServerDialog';
import { BUILT_IN_MCP_BANNER_CALLOUT, MCP_SETTINGS_ROUTE } from '../mcp-servers.constants';
import McpServersListView from './McpServersListView.vue';

const api = vi.hoisted(() => ({ listMcpServers: vi.fn() }));
vi.mock('../mcp-servers.api', () => api);

const route = vi.hoisted(() => ({ params: {} as Record<string, string> }));
/** The same route, reactive, so a test can move it to another project. */
const liveRoute = vi.hoisted(() => ({ current: undefined as typeof route | undefined }));
const push = vi.hoisted(() => vi.fn());
vi.mock('vue-router', async (importOriginal) => {
	const { reactive } = await import('vue');
	liveRoute.current = reactive(route);
	return {
		...(await importOriginal()),
		useRoute: () => liveRoute.current,
		useRouter: () => ({ push, resolve: () => ({ href: '/settings/mcp' }) }),
	};
});

// The shell parts, reduced to the slots that the view fills.
const layout = vi.hoisted(() => ({ initialize: undefined as (() => Promise<void>) | undefined }));
const LayoutStub = defineComponent({
	props: {
		initialize: { type: Function as PropType<() => Promise<void>>, required: true },
		loading: Boolean,
		hasEmptyState: Boolean,
	},
	setup(props, { slots }) {
		layout.initialize = props.initialize;
		onMounted(async () => await props.initialize());
		return () =>
			h('div', [
				slots.header?.(),
				props.loading ? null : props.hasEmptyState ? slots.empty?.() : slots.preamble?.(),
			]);
	},
});
const ProjectHeaderStub = defineComponent({
	props: { mainButton: String },
	setup: (props) => () => h('div', { 'data-test-id': 'project-header' }, props.mainButton),
});

function server(overrides: Partial<McpServerListItem>): McpServerListItem {
	return {
		id: '0190a8d6-4a2e-7000-8000-000000000001',
		projectId: 'project-1',
		project: { name: 'Marketing', type: 'team' },
		name: 'Sales tools',
		slug: 'sales-tools',
		description: 'Pipeline numbers for the sales team',
		createdAt: '2026-11-24T10:00:00.000Z',
		updatedAt: '2026-11-24T10:00:00.000Z',
		tools: [],
		connectionCount: 0,
		...overrides,
	};
}

const RouterLinkStub = defineComponent({
	props: { to: { type: Object, required: true } },
	setup:
		(props, { slots }) =>
		() =>
			h(
				'a',
				{ 'data-test-id': 'router-link', 'data-to': JSON.stringify(props.to) },
				slots.default?.(),
			),
});

const renderComponent = createComponentRenderer(McpServersListView, {
	global: { stubs: { CreateMcpServerDialog: true, RouterLink: RouterLinkStub } },
});

function setUp(scopes: Scope[] = ['mcpServer:list', 'mcpServer:create']) {
	componentRegistry.register('resources-list-layout', LayoutStub);
	componentRegistry.register('project-header', ProjectHeaderStub);
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		defaultProjectId: () => 'personal-1',
		isReadOnly: () => false,
	});
}

describe('McpServersListView', () => {
	beforeEach(() => {
		route.params = {};
	});

	afterEach(() => {
		componentRegistry.unregister('resources-list-layout');
		componentRegistry.unregister('project-header');
		capabilityRegistry.clear();
		useCreateMcpServerDialog().close();
		vi.clearAllMocks();
	});

	it('lists the servers of all projects on Overview with the built-in banner and no pinned card', async () => {
		api.listMcpServers.mockResolvedValue([
			server({
				tools: [
					{
						id: '0190a8d6-4a2e-7000-8000-0000000000a1',
						kind: 'workflow',
						targetId: 'wf-1',
						toolName: 'get_numbers',
					},
					{
						id: '0190a8d6-4a2e-7000-8000-0000000000a2',
						kind: 'node',
						targetId: null,
						toolName: 'search_slack',
					},
				],
				connectionCount: 3,
			}),
			server({ id: '0190a8d6-4a2e-7000-8000-000000000002', name: 'Support desk', description: '' }),
		]);
		setUp();
		renderComponent();

		const cards = await screen.findAllByTestId('mcp-server-card');

		expect(api.listMcpServers).toHaveBeenCalledWith(expect.anything(), undefined);
		expect(screen.queryByTestId('builtin-mcp-card')).not.toBeInTheDocument();
		expect(screen.getByTestId('builtin-mcp-banner')).toHaveTextContent(
			'Looking to build and run workflows on this instance from your AI client? That is the built-in n8n MCP.',
		);
		expect(cards).toHaveLength(2);
		expect(cards[0]).toHaveTextContent('Sales tools');
		expect(cards[0]).toHaveTextContent('Pipeline numbers for the sales team');
		expect(within(cards[0]).getByTestId('mcp-server-card-items-pill')).toHaveTextContent('2');
		expect(within(cards[0]).getByTestId('mcp-server-card-connections')).toHaveTextContent(
			'3 connected',
		);
		expect(cards[1]).toHaveTextContent('No description');
		expect(within(cards[1]).queryByTestId('mcp-server-card-items-pill')).not.toBeInTheDocument();
		expect(within(cards[1]).getByTestId('mcp-server-card-empty')).toHaveTextContent(
			'Nothing added yet',
		);
		expect(within(cards[1]).getByTestId('mcp-server-card-connections')).toHaveTextContent(
			'Not shared',
		);
	});

	it('opens MCP settings from the banner and hides it permanently on dismiss', async () => {
		route.params = { projectId: 'project-1' };
		api.listMcpServers.mockResolvedValue([server({})]);
		setUp();
		renderComponent();
		const usersStore = useUsersStore();
		usersStore.addUsers([{ id: 'user-1', isPending: false, settings: {} }]);
		usersStore.currentUserId = 'user-1';
		const updateSettingsSpy = vi
			.spyOn(usersStore, 'updateUserSettings')
			.mockResolvedValue(undefined);

		await screen.findByTestId('mcp-server-card');
		await userEvent.click(screen.getByTestId('builtin-mcp-banner-action'));
		expect(push).toHaveBeenCalledWith({ name: MCP_SETTINGS_ROUTE });

		await userEvent.click(screen.getByTestId('builtin-mcp-banner-dismiss'));
		expect(screen.queryByTestId('builtin-mcp-banner')).not.toBeInTheDocument();
		expect(updateSettingsSpy).toHaveBeenCalledWith({
			dismissedCallouts: { [BUILT_IN_MCP_BANNER_CALLOUT]: true },
		});
	});

	it('shows no project label on the cards', async () => {
		api.listMcpServers.mockResolvedValue([server({})]);
		setUp();
		renderComponent();

		const card = await screen.findByTestId('mcp-server-card');

		expect(card).not.toHaveTextContent('Marketing');
	});

	it('lists the servers of the project on a project page', async () => {
		route.params = { projectId: 'project-1' };
		api.listMcpServers.mockResolvedValue([server({})]);
		setUp();
		renderComponent();

		await screen.findByTestId('mcp-server-card');

		expect(api.listMcpServers).toHaveBeenCalledWith(expect.anything(), 'project-1');
		expect(screen.getByTestId('project-header')).toHaveTextContent('mcpServer');
	});

	it('links each card to its server page', async () => {
		api.listMcpServers.mockResolvedValue([server({})]);
		setUp();
		renderComponent();

		const card = await screen.findByTestId('mcp-server-card');

		expect(JSON.parse(card.closest('a')!.dataset.to!)).toEqual({
			name: 'McpServerView',
			params: { projectId: 'project-1', serverId: server({}).id },
		});
	});

	it('drops the cards and the search of the old project while the next project loads', async () => {
		route.params = { projectId: 'project-1' };
		api.listMcpServers.mockResolvedValue([server({})]);
		setUp();
		renderComponent();
		await screen.findByTestId('mcp-server-card');
		await userEvent.type(screen.getByTestId('mcp-servers-search'), 'Sales');

		liveRoute.current!.params = { projectId: 'project-2' };
		api.listMcpServers.mockReturnValue(new Promise(() => {}));
		void layout.initialize!();

		await waitFor(() => expect(screen.queryByTestId('mcp-server-card')).not.toBeInTheDocument());
		expect(api.listMcpServers).toHaveBeenLastCalledWith(expect.anything(), 'project-2');
	});

	it('filters the cards by name', async () => {
		api.listMcpServers.mockResolvedValue([
			server({}),
			server({ id: '0190a8d6-4a2e-7000-8000-000000000002', name: 'Support desk' }),
		]);
		setUp();
		renderComponent();
		await screen.findByText('Support desk');

		await userEvent.type(screen.getByTestId('mcp-servers-search'), 'supp');

		await waitFor(() => expect(screen.queryByText('Sales tools')).not.toBeInTheDocument());
		expect(screen.getByText('Support desk')).toBeInTheDocument();
	});

	it('shows the empty state, and its button opens the create dialog for the project', async () => {
		route.params = { projectId: 'project-1' };
		api.listMcpServers.mockResolvedValue([]);
		setUp();
		renderComponent();

		const emptyState = await screen.findByTestId('mcp-servers-empty-state');
		expect(emptyState).toHaveTextContent('Package workflows into a custom MCP server');

		await userEvent.click(screen.getByTestId('mcp-servers-empty-create'));

		expect(useCreateMcpServerDialog().state).toEqual({ open: true, projectId: 'project-1' });
	});

	it('hides the create button from a project viewer', async () => {
		route.params = { projectId: 'project-1' };
		api.listMcpServers.mockResolvedValue([]);
		setUp(['mcpServer:list', 'mcpServer:read']);
		renderComponent();

		await screen.findByTestId('mcp-servers-empty-state');

		expect(screen.queryByTestId('mcp-servers-empty-create')).not.toBeInTheDocument();
	});
});
