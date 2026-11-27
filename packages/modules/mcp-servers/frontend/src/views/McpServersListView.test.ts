import type { McpServerResponse } from '@n8n/api-types';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import type { Scope } from '@n8n/permissions';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { defineComponent, h, onMounted, type PropType } from 'vue';

import { useCreateMcpServerDialog } from '../composables/useCreateMcpServerDialog';
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

function server(overrides: Partial<McpServerResponse>): McpServerResponse {
	return {
		id: '0190a8d6-4a2e-7000-8000-000000000001',
		projectId: 'project-1',
		project: { name: 'Marketing', type: 'team' },
		name: 'Sales tools',
		slug: 'sales-tools',
		description: 'Pipeline numbers for the sales team',
		createdAt: '2026-11-24T10:00:00.000Z',
		updatedAt: '2026-11-24T10:00:00.000Z',
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

	it('lists the servers of all projects on Overview, after the pinned built-in card', async () => {
		api.listMcpServers.mockResolvedValue([
			server({}),
			server({ id: '0190a8d6-4a2e-7000-8000-000000000002', name: 'Support desk', description: '' }),
		]);
		setUp();
		renderComponent();

		const cards = await screen.findAllByTestId(/^(builtin-mcp-card|mcp-server-card)$/);

		expect(api.listMcpServers).toHaveBeenCalledWith(expect.anything(), undefined);
		expect(cards.map((card) => card.dataset.testId)).toEqual([
			'builtin-mcp-card',
			'mcp-server-card',
			'mcp-server-card',
		]);
		expect(cards[0]).toHaveTextContent('n8n MCP');
		expect(cards[0]).toHaveTextContent('Built in');
		expect(cards[1]).toHaveTextContent('Sales tools');
		expect(cards[1]).toHaveTextContent('Pipeline numbers for the sales team');
		expect(cards[2]).toHaveTextContent('No description');
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
		expect(screen.queryByTestId('builtin-mcp-card')).not.toBeInTheDocument();
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
