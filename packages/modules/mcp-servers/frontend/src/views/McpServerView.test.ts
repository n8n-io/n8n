import type { McpServerResponse } from '@n8n/api-types';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import type { Scope } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client';
import userEvent from '@testing-library/user-event';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { computed, defineComponent } from 'vue';

import {
	MCP_SERVER_CONNECTIONS_VIEW,
	MCP_SERVER_VIEW,
	MCP_SERVERS_LIST_VIEW,
} from '../mcp-servers.constants';
import McpServerView from './McpServerView.vue';

const api = vi.hoisted(() => ({
	getMcpServer: vi.fn(),
	updateMcpServer: vi.fn(),
	deleteMcpServer: vi.fn(),
	listMcpServerConnections: vi.fn(),
}));
vi.mock('../mcp-servers.api', () => api);

const toast = vi.hoisted(() => ({ showMessage: vi.fn(), showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));

const copy = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useClipboard', () => ({ useClipboard: () => ({ copy }) }));

const route = vi.hoisted(() => ({
	name: 'McpServerView',
	params: { projectId: 'project-1', serverId: '0190a8d6-4a2e-7000-8000-000000000001' },
}));
/** The same route, reactive, so a test can move it to another server. */
const liveRoute = vi.hoisted(() => ({ current: undefined as typeof route | undefined }));
const push = vi.hoisted(() => vi.fn());
vi.mock('vue-router', async (importOriginal) => {
	const { reactive } = await import('vue');
	liveRoute.current = reactive(route);
	return {
		...(await importOriginal()),
		useRoute: () => liveRoute.current,
		useRouter: () => ({ push, resolve: () => ({ href: '/home/mcp-servers' }) }),
	};
});

const server: McpServerResponse = {
	id: '0190a8d6-4a2e-7000-8000-000000000001',
	projectId: 'project-1',
	project: { name: 'Marketing', type: 'team' },
	name: 'Sales tools',
	slug: 'sales-tools',
	description: 'Pipeline numbers',
	createdAt: '2026-11-24T10:00:00.000Z',
	updatedAt: '2026-11-24T10:00:00.000Z',
};

const BUILDER: Scope[] = [
	'mcpServer:read',
	'mcpServer:list',
	'mcpServer:update',
	'mcpServer:delete',
];
const VIEWER: Scope[] = ['mcpServer:read', 'mcpServer:list'];

// The Contents tab loads the tools. Its own test covers it.
const McpServerContentsTabStub = defineComponent({
	props: ['assistantAvailable', 'assistantOpen', 'refreshKey'],
	emits: ['build-with-assistant'],
	template: `<div data-test-id="mcp-server-contents" :data-refresh-key="refreshKey">
		<button
			v-if="assistantAvailable"
			data-test-id="stub-build"
			type="button"
			:disabled="assistantOpen"
			@click="$emit('build-with-assistant')"
		/>
	</div>`,
});

// The panel loads its suggestion. Its own test covers it.
const McpServerAssistantPanelStub = defineComponent({
	props: ['server', 'prefill'],
	emits: ['close', 'changed'],
	template: `<div data-test-id="mcp-assistant-panel" :data-server-id="server.id">
		<span data-test-id="stub-prefill">{{ prefill ? JSON.stringify(prefill) : '' }}</span>
		<button data-test-id="stub-changed" type="button" @click="$emit('changed')" />
		<button data-test-id="stub-close" type="button" @click="$emit('close')" />
	</div>`,
});

const renderComponent = createComponentRenderer(McpServerView, {
	global: {
		stubs: {
			McpServerContentsTab: McpServerContentsTabStub,
			McpServerAssistantPanel: McpServerAssistantPanelStub,
		},
	},
});

const openServer = vi.fn();

/** The Assistant of the shell, with or without its docked panel. */
function provideAssistant({ available = true, panel = true } = {}) {
	capabilityRegistry.provide(capabilities.createMcpServerAssistantHandoff, () => ({
		available: computed(() => available),
		openServer,
	}));
	if (panel) componentRegistry.register('assistant-panel', { template: '<div />' });
}

async function renderPage(scopes: Scope[] = BUILDER, readOnly = false) {
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => readOnly,
	});
	renderComponent();
	await screen.findByTestId('mcp-server-name');
}

async function openMenuItem(label: string) {
	await userEvent.click(screen.getByTestId('mcp-server-menu').querySelector('button')!);
	await userEvent.click(await screen.findByText(label));
}

describe('McpServerView', () => {
	beforeEach(() => {
		route.name = MCP_SERVER_VIEW;
		route.params.serverId = server.id;
		api.getMcpServer.mockResolvedValue(server);
		api.updateMcpServer.mockImplementation(async (_ctx, _projectId, _serverId, body) => ({
			...server,
			...body,
		}));
		api.deleteMcpServer.mockResolvedValue(undefined);
		api.listMcpServerConnections.mockResolvedValue({ connections: [], blocks: [] });
	});

	afterEach(() => {
		capabilityRegistry.clear();
		componentRegistry.clear();
		vi.clearAllMocks();
	});

	describe('Assistant', () => {
		it('shows no "Assistant" when the instance has no Assistant', async () => {
			provideAssistant({ available: false });
			await renderPage();

			expect(screen.queryByTestId('mcp-server-assistant-button')).not.toBeInTheDocument();
			expect(screen.queryByTestId('stub-build')).not.toBeInTheDocument();
		});

		it('shows no "Assistant" to a project viewer', async () => {
			provideAssistant();
			await renderPage(VIEWER);

			expect(screen.queryByTestId('mcp-server-assistant-button')).not.toBeInTheDocument();
		});

		it('docks the Assistant panel of the server beside the page', async () => {
			provideAssistant();
			await renderPage();
			expect(screen.queryByTestId('mcp-assistant-panel')).not.toBeInTheDocument();

			await userEvent.click(screen.getByTestId('mcp-server-assistant-button'));

			expect(screen.getByTestId('mcp-assistant-panel')).toHaveAttribute(
				'data-server-id',
				server.id,
			);
			expect(screen.getByTestId('mcp-server-assistant-button')).toBeDisabled();
			expect(screen.getByTestId('stub-prefill')).toHaveTextContent('');
		});

		it('closes the panel', async () => {
			provideAssistant();
			await renderPage();
			await userEvent.click(screen.getByTestId('mcp-server-assistant-button'));

			await userEvent.click(screen.getByTestId('stub-close'));

			expect(screen.queryByTestId('mcp-assistant-panel')).not.toBeInTheDocument();
			expect(screen.getByTestId('mcp-server-assistant-button')).toBeEnabled();
		});

		it('opens the panel with a prompt to edit from "Build with Assistant"', async () => {
			provideAssistant();
			await renderPage();

			await userEvent.click(screen.getByTestId('stub-build'));

			expect(JSON.parse(screen.getByTestId('stub-prefill').textContent ?? '')).toEqual({
				text: 'Build out the MCP server "Sales tools". It is for [team] to [what they need to do].\n\nAdd the workflows that fit, and give each tool a clear name and description.',
				prefillType: 'mcp_server_build_prompt',
			});
			expect(screen.getByTestId('stub-build')).toBeDisabled();
			expect(openServer).not.toHaveBeenCalled();
		});

		it('opens the full Assistant on the server when the page has no panel', async () => {
			provideAssistant({ panel: false });
			await renderPage();

			await userEvent.click(screen.getByTestId('stub-build'));

			expect(openServer).toHaveBeenCalledWith({
				serverId: server.id,
				projectId: 'project-1',
				serverName: 'Sales tools',
			});
			expect(screen.queryByTestId('mcp-assistant-panel')).not.toBeInTheDocument();
		});

		it('shows each change of the Assistant on the page at once', async () => {
			provideAssistant();
			await renderPage();
			await userEvent.click(screen.getByTestId('mcp-server-assistant-button'));
			const refreshKey = screen.getByTestId('mcp-server-contents').dataset.refreshKey;
			api.getMcpServer.mockResolvedValue({ ...server, name: 'Revenue tools' });

			await userEvent.click(screen.getByTestId('stub-changed'));

			await waitFor(() =>
				expect(screen.getByTestId('mcp-server-name')).toHaveTextContent('Revenue tools'),
			);
			expect(screen.getByTestId('mcp-server-contents').dataset.refreshKey).not.toBe(refreshKey);
			expect(screen.getByTestId('mcp-assistant-panel')).toBeInTheDocument();
		});

		it('keeps the page and the panel when the reload after a change fails', async () => {
			provideAssistant();
			await renderPage();
			await userEvent.click(screen.getByTestId('mcp-server-assistant-button'));
			api.getMcpServer.mockRejectedValue(
				new ResponseError('Server error', { httpStatusCode: 500 }),
			);

			await userEvent.click(screen.getByTestId('stub-changed'));

			await waitFor(() => expect(api.getMcpServer).toHaveBeenCalledTimes(2));
			expect(screen.getByTestId('mcp-server-name')).toHaveTextContent('Sales tools');
			expect(screen.getByTestId('mcp-assistant-panel')).toBeInTheDocument();
		});

		it('goes back to the list when the Assistant deletes the server', async () => {
			provideAssistant();
			await renderPage();
			await userEvent.click(screen.getByTestId('mcp-server-assistant-button'));
			api.getMcpServer.mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));

			await userEvent.click(screen.getByTestId('stub-changed'));

			await waitFor(() => expect(push).toHaveBeenCalledWith({ name: MCP_SERVERS_LIST_VIEW }));
			expect(screen.queryByTestId('mcp-server-contents')).not.toBeInTheDocument();
		});
	});

	describe('tabs', () => {
		it('shows the tabs "Contents" and "Connections", with "Contents" open', async () => {
			await renderPage();

			expect(screen.getByText('Contents')).toBeInTheDocument();
			expect(await screen.findByText('Connections 0')).toBeInTheDocument();
			expect(screen.getByTestId('mcp-server-contents')).toBeInTheDocument();
			expect(screen.queryByTestId('mcp-server-connections')).not.toBeInTheDocument();
		});

		it('counts a row for each person and client, and for a blocked person with no client', async () => {
			const person = { firstName: 'Tom', lastName: 'Becker', email: 'tom@acme.com' };
			const usedAt = '2026-11-24T10:00:00.000Z';
			const connection = {
				...person,
				clientName: 'Cursor',
				firstUsedAt: usedAt,
				lastUsedAt: usedAt,
			};
			api.listMcpServerConnections.mockResolvedValue({
				connections: [
					{ ...connection, userId: 'user-1', oauthClientId: 'cursor' },
					{ ...connection, userId: 'user-1', oauthClientId: 'claude-code' },
				],
				blocks: [
					{ ...person, userId: 'user-1', blockedById: null, blockedAt: usedAt },
					{ ...person, userId: 'user-2', blockedById: null, blockedAt: usedAt },
				],
			});

			await renderPage();

			expect(await screen.findByText('Connections 3')).toBeInTheDocument();
		});

		it('opens the connections on their own route', async () => {
			route.name = MCP_SERVER_CONNECTIONS_VIEW;
			await renderPage();

			expect(screen.getByTestId('mcp-server-connections')).toBeInTheDocument();
			expect(screen.queryByTestId('mcp-server-contents')).not.toBeInTheDocument();
		});

		it('changes the route when a tab is selected', async () => {
			await renderPage();

			await userEvent.click(await screen.findByText('Connections 0'));

			expect(api.listMcpServerConnections).toHaveBeenCalledTimes(2);
			expect(push).toHaveBeenCalledWith({
				name: MCP_SERVER_CONNECTIONS_VIEW,
				params: route.params,
			});
		});
	});

	describe('header', () => {
		it('shows the name, the description, and the URL, with no project label', async () => {
			await renderPage();

			expect(api.getMcpServer).toHaveBeenCalledWith(expect.anything(), 'project-1', server.id);
			expect(screen.getByTestId('mcp-server-name')).toHaveTextContent('Sales tools');
			expect(screen.getByTestId('mcp-server-description')).toHaveTextContent('Pipeline numbers');
			expect(screen.getByTestId('mcp-server-url')).toHaveTextContent('/mcp-servers/sales-tools');
			expect(screen.getByTestId('mcp-server-header')).not.toHaveTextContent('Marketing');
		});

		it('renames the server from the dialog that a double-click on the title opens', async () => {
			await renderPage();

			await userEvent.dblClick(screen.getByTestId('mcp-server-name'));
			const input = await screen.findByTestId('rename-mcp-server-name');
			await waitFor(() => expect(input).toHaveFocus());
			await userEvent.clear(input);
			await userEvent.type(input, 'Revenue tools');
			await userEvent.click(screen.getByTestId('rename-mcp-server-submit'));

			expect(api.updateMcpServer).toHaveBeenCalledWith(expect.anything(), 'project-1', server.id, {
				name: 'Revenue tools',
			});
			await waitFor(() =>
				expect(screen.getByTestId('mcp-server-name')).toHaveTextContent('Revenue tools'),
			);
		});

		it('renames the server from the server menu', async () => {
			await renderPage();

			await openMenuItem('Rename');

			expect(await screen.findByTestId('rename-mcp-server-dialog')).toBeInTheDocument();
		});

		async function editDescription() {
			await userEvent.click(
				within(screen.getByTestId('mcp-server-description')).getByRole('button'),
			);
			const input = await waitFor(() => {
				const textarea = screen.getByTestId('mcp-server-description').querySelector('textarea');
				expect(textarea).toHaveFocus();
				return textarea as HTMLTextAreaElement;
			});
			return input;
		}

		it('saves a description with line breaks when the field loses focus', async () => {
			await renderPage();

			const input = await editDescription();
			await userEvent.clear(input);
			await userEvent.type(input, 'For the revenue team{Enter}Ask before you send mail');
			await userEvent.tab();

			await waitFor(() =>
				expect(api.updateMcpServer).toHaveBeenCalledWith(
					expect.anything(),
					'project-1',
					server.id,
					{ description: 'For the revenue team\nAsk before you send mail' },
				),
			);
		});

		it('saves an empty description', async () => {
			await renderPage();

			const input = await editDescription();
			await userEvent.clear(input);
			await userEvent.tab();

			await waitFor(() =>
				expect(api.updateMcpServer).toHaveBeenCalledWith(
					expect.anything(),
					'project-1',
					server.id,
					{ description: '' },
				),
			);
		});

		it('keeps the description when the builder presses Escape', async () => {
			await renderPage();

			const input = await editDescription();
			await userEvent.type(input, ' and more{Escape}');

			expect(screen.getByTestId('mcp-server-description')).toHaveTextContent('Pipeline numbers');
			expect(api.updateMcpServer).not.toHaveBeenCalled();
		});

		it('deletes the server after the confirmation and goes back to the list', async () => {
			await renderPage();

			await openMenuItem('Delete');
			const dialog = await screen.findByRole('dialog');
			expect(dialog).toHaveTextContent('stays reserved');
			await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

			expect(api.deleteMcpServer).toHaveBeenCalledWith(expect.anything(), 'project-1', server.id);
			await waitFor(() => expect(push).toHaveBeenCalledWith({ name: MCP_SERVERS_LIST_VIEW }));
			// The toast title starts with a capital letter, so it must not start with the name.
			expect(toast.showMessage).toHaveBeenCalledWith({
				type: 'success',
				title: 'MCP server "Sales tools" deleted',
			});
		});

		it.each([
			[{ name: 'Marketing', type: 'team' }, 'Only members of the Marketing project can connect.'],
			[
				{ name: 'Nathan Doe <nathan@example.com>', type: 'personal' },
				'Only the owner of this personal project can connect.',
			],
		] as const)('copies the URL and says who can connect, for %o', async (project, message) => {
			api.getMcpServer.mockResolvedValue({ ...server, project });
			await renderPage();

			await openMenuItem('Copy server URL');

			await waitFor(() =>
				expect(copy).toHaveBeenCalledWith(expect.stringMatching(/\/mcp-servers\/sales-tools$/)),
			);
			expect(toast.showMessage).toHaveBeenCalledWith({
				type: 'success',
				title: 'URL copied',
				message,
			});
		});

		it('copies the link of the share page from the menu', async () => {
			await renderPage(VIEWER);

			await openMenuItem('Copy share link');

			expect(copy).toHaveBeenCalledWith('http://localhost:5678/mcp-share/sales-tools');
		});

		it('copies the server URL from the menu', async () => {
			await renderPage(VIEWER);

			await openMenuItem('Copy server URL');

			expect(copy).toHaveBeenCalledWith('http://localhost:5678/mcp-servers/sales-tools');
		});

		it('gives a project viewer no rename, no delete, and no description edit', async () => {
			await renderPage(VIEWER);

			await fireEvent.dblClick(screen.getByTestId('mcp-server-name'));
			await userEvent.click(screen.getByTestId('mcp-server-menu').querySelector('button')!);

			expect(await screen.findByText('Copy share link')).toBeInTheDocument();
			expect(screen.getByText('Copy server URL')).toBeInTheDocument();
			expect(screen.queryByText('Rename')).not.toBeInTheDocument();
			expect(screen.queryByText('Delete')).not.toBeInTheDocument();
			expect(screen.queryByTestId('rename-mcp-server-dialog')).not.toBeInTheDocument();
			const description = screen.getByTestId('mcp-server-description');
			expect(description).not.toHaveAttribute('role', 'button');
			await userEvent.click(description);
			expect(description.querySelector('input, textarea')).toBeNull();
			expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
		});

		it('gives no rename, no delete, and no description edit on a read-only branch', async () => {
			await renderPage(BUILDER, true);

			await userEvent.click(screen.getByTestId('mcp-server-menu').querySelector('button')!);

			expect(await screen.findByText('Copy server URL')).toBeInTheDocument();
			expect(screen.queryByText('Rename')).not.toBeInTheDocument();
			expect(screen.queryByText('Delete')).not.toBeInTheDocument();
			expect(screen.getByTestId('mcp-server-description')).not.toHaveAttribute('role', 'button');
		});

		it('closes the delete dialog when the route moves to another server', async () => {
			await renderPage();
			await openMenuItem('Delete');
			await screen.findByRole('dialog');

			api.getMcpServer.mockReturnValue(new Promise(() => {}));
			liveRoute.current!.params.serverId = '0190a8d6-4a2e-7000-8000-000000000002';

			await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
			expect(screen.queryByTestId('mcp-server-name')).not.toBeInTheDocument();
			expect(api.deleteMcpServer).not.toHaveBeenCalled();
		});

		it('shows "not found" for a server that does not exist', async () => {
			api.getMcpServer.mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));
			capabilityRegistry.provide(capabilities.projectPermissions, {
				scopesFor: () => BUILDER,
				isReadOnly: () => false,
			});
			renderComponent();

			expect(await screen.findByTestId('mcp-server-not-found')).toHaveTextContent(
				'MCP server not found',
			);
		});

		it('does not load the connections of a server that does not exist', async () => {
			api.getMcpServer.mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));
			api.listMcpServerConnections.mockRejectedValue(
				new ResponseError('Not found', { httpStatusCode: 404 }),
			);
			capabilityRegistry.provide(capabilities.projectPermissions, {
				scopesFor: () => BUILDER,
				isReadOnly: () => false,
			});
			renderComponent();

			await screen.findByTestId('mcp-server-not-found');
			// The connections call would answer 404 too and show a second error toast.
			expect(api.listMcpServerConnections).not.toHaveBeenCalled();
		});
	});
});
