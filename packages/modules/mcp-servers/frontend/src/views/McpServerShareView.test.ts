import type { McpServerShareDetail, McpServerSharePublic } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/vue';
import { useRoute } from 'vue-router';

import McpServerShareView from './McpServerShareView.vue';

const api = vi.hoisted(() => ({
	getMcpServerShare: vi.fn(),
	getMcpServerPublicShare: vi.fn(),
}));
vi.mock('../mcp-servers.api', () => api);

const route = vi.hoisted(() => ({
	params: { slug: 'sales-tools' },
	fullPath: '/mcp-share/sales-tools',
}));

const usersStore = vi.hoisted(() => ({ currentUser: null as { id: string } | null }));
vi.mock('@n8n/stores/users.store', () => ({ useUsersStore: () => usersStore }));

const track = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));

// A reactive route, so the page sees a change of the slug.
vi.mock('vue-router', async (importOriginal) => {
	const { reactive } = await import('vue');
	const live = reactive(route);
	return {
		...(await importOriginal()),
		useRoute: () => live,
		useRouter: () => ({
			resolve: (to: { query?: { redirect?: string } }) => ({
				href: `/signin?redirect=${to.query?.redirect ?? ''}`,
			}),
		}),
	};
});

const SERVER_URL = 'https://acme.n8n.cloud/mcp-servers/sales-tools';

const publicShare: McpServerSharePublic = {
	id: '0190a8d6-4a2e-7000-8000-000000000001',
	slug: 'sales-tools',
	name: 'Sales tools',
	serverUrl: SERVER_URL,
	projectName: 'Marketing',
	projectType: 'team',
	canConnect: false,
};

const detailShare: McpServerShareDetail = {
	...publicShare,
	canConnect: true,
	description: 'Pipeline numbers for the sales team.',
	tools: [{ toolName: 'get_pipeline_summary', description: 'Sums up the pipeline.' }],
};

const renderComponent = createComponentRenderer(McpServerShareView);

async function renderPage() {
	renderComponent();
	await screen.findByTestId('mcp-share-name');
}

beforeEach(() => {
	route.params.slug = 'sales-tools';
	usersStore.currentUser = null;
	api.getMcpServerShare.mockReset();
	api.getMcpServerPublicShare.mockReset();
	track.mockReset();
});

describe('McpServerShareView', () => {
	describe('for a person who is not signed in', () => {
		beforeEach(() => {
			api.getMcpServerPublicShare.mockResolvedValue(publicShare);
		});

		it('shows the name, the URL, who can connect, and the client buttons, but no tools', async () => {
			await renderPage();

			expect(api.getMcpServerPublicShare).toHaveBeenCalledWith(expect.anything(), 'sales-tools');
			expect(api.getMcpServerShare).not.toHaveBeenCalled();
			expect(screen.getByTestId('mcp-share-name')).toHaveTextContent('Sales tools');
			expect(screen.getAllByDisplayValue(SERVER_URL)).toHaveLength(3);
			expect(screen.getByTestId('mcp-share-who')).toHaveTextContent(
				'Only members of the Marketing project can connect.',
			);
			expect(screen.getByTestId('mcp-share-who').querySelector('strong')).toHaveTextContent(
				'Marketing',
			);
			expect(screen.getByTestId('mcp-share-add-claude-ai')).toBeInTheDocument();
			expect(screen.queryByTestId('mcp-share-tools')).not.toBeInTheDocument();
			expect(screen.queryByText('Pipeline numbers for the sales team.')).not.toBeInTheDocument();
		});

		it('offers a sign-in that comes back to the share page', async () => {
			await renderPage();

			expect(screen.getByTestId('mcp-share-sign-in')).toHaveAttribute(
				'href',
				`/signin?redirect=${encodeURIComponent('/mcp-share/sales-tools')}`,
			);
		});
	});

	describe('for a signed-in person', () => {
		beforeEach(() => {
			usersStore.currentUser = { id: 'user-1' };
		});

		it('shows the description and the tools when the person can connect', async () => {
			api.getMcpServerShare.mockResolvedValue(detailShare);

			await renderPage();

			expect(api.getMcpServerPublicShare).not.toHaveBeenCalled();
			expect(screen.getByText('Pipeline numbers for the sales team.')).toBeInTheDocument();
			expect(screen.getByTestId('mcp-share-tools')).toHaveTextContent('get_pipeline_summary');
			expect(screen.queryByTestId('mcp-share-sign-in')).not.toBeInTheDocument();
		});

		it('shows the public page with no sign-in when the person cannot connect', async () => {
			api.getMcpServerShare.mockResolvedValue(publicShare);

			await renderPage();

			expect(screen.getByTestId('mcp-share-who')).toBeInTheDocument();
			expect(screen.queryByTestId('mcp-share-tools')).not.toBeInTheDocument();
			expect(screen.queryByTestId('mcp-share-sign-in')).not.toBeInTheDocument();
		});
	});

	it('names the owner of a personal project', async () => {
		api.getMcpServerPublicShare.mockResolvedValue({
			...publicShare,
			projectType: 'personal',
			projectName: 'Maya Lind',
		});

		await renderPage();

		expect(screen.getByTestId('mcp-share-who')).toHaveTextContent('Only Maya Lind can connect.');
	});

	it('names no one when the owner of a personal project has no name', async () => {
		api.getMcpServerPublicShare.mockResolvedValue({
			...publicShare,
			projectType: 'personal',
			projectName: null,
		});

		await renderPage();

		const who = screen.getByTestId('mcp-share-who');
		expect(who).toHaveTextContent('Only the owner of this personal project can connect.');
		expect(who.querySelector('strong')).toBeNull();
	});

	it('loads the other server when the slug changes on the same page', async () => {
		api.getMcpServerPublicShare.mockResolvedValueOnce(publicShare).mockResolvedValueOnce({
			...publicShare,
			id: '0190a8d6-4a2e-7000-8000-000000000002',
			slug: 'support-tools',
			name: 'Support tools',
			serverUrl: 'https://acme.n8n.cloud/mcp-servers/support-tools',
		});
		await renderPage();

		useRoute().params.slug = 'support-tools';

		await waitFor(() =>
			expect(screen.getByTestId('mcp-share-name')).toHaveTextContent('Support tools'),
		);
		expect(api.getMcpServerPublicShare).toHaveBeenLastCalledWith(
			expect.anything(),
			'support-tools',
		);
	});

	it('shows "not found" for an unknown server', async () => {
		api.getMcpServerPublicShare.mockRejectedValue(
			new ResponseError('Not found', { httpStatusCode: 404 }),
		);

		renderComponent();

		expect(await screen.findByTestId('mcp-share-not-found')).toBeInTheDocument();
	});

	it('shows "not found" and sends no request for a slug that is not a server slug', async () => {
		route.params.slug = '../../some-route';

		renderComponent();

		expect(await screen.findByTestId('mcp-share-not-found')).toBeInTheDocument();
		expect(api.getMcpServerPublicShare).not.toHaveBeenCalled();
		expect(api.getMcpServerShare).not.toHaveBeenCalled();
	});

	describe('client buttons', () => {
		beforeEach(() => {
			api.getMcpServerPublicShare.mockResolvedValue(publicShare);
		});

		it('opens the Claude dialog with the name and the URL filled in, in a new tab', async () => {
			await renderPage();

			const link = screen.getByTestId('mcp-share-add-claude-ai');
			const url = new URL(link.getAttribute('href')!);
			expect(url.searchParams.get('modal')).toBe('add-custom-connector');
			expect(url.searchParams.get('connectorName')).toBe('Sales tools');
			expect(url.searchParams.get('connectorUrl')).toBe(SERVER_URL);
			expect(link).toHaveAttribute('target', '_blank');
		});

		it('gives Cursor and VS Code their install links with the slug as the name', async () => {
			await renderPage();

			expect(screen.getByTestId('mcp-share-add-cursor').getAttribute('href')).toMatch(
				/^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=sales-tools&/,
			);
			expect(screen.getByTestId('mcp-share-add-vscode').getAttribute('href')).toMatch(
				/^vscode:mcp\/install\?/,
			);
		});

		it('records a click on a one-click button', async () => {
			await renderPage();
			const link = screen.getByTestId('mcp-share-add-cursor');
			// jsdom cannot open a `cursor://` link.
			link.addEventListener('click', (event) => event.preventDefault());

			await userEvent.click(link);

			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CUSTOM_MCP_SERVERS.USER_CLICKED_CLIENT_ON_MCP_SERVER_SHARE_PAGE,
				{ server_id: publicShare.id, client: 'cursor', method: 'deep_link' },
			);
		});

		// `null`: the server URL at the top of the page, the first copy field.
		it.each([
			[null, 0, 'any', 'copy_url'],
			['mcp-share-command-claude-code', 0, 'claude-code', 'copy_command'],
			['mcp-share-command-codex', 0, 'codex', 'copy_command'],
			['mcp-share-command-codex', 1, 'codex', 'copy_sign_in_command'],
			['mcp-share-command-gemini-cli', 0, 'gemini-cli', 'copy_command'],
			['mcp-share-steps-chatgpt', 0, 'chatgpt', 'copy_url'],
			['mcp-share-steps-other', 0, 'other', 'copy_url'],
		])('records a copy in %s (field %i) as %s with %s', async (testId, index, client, method) => {
			const user = userEvent.setup();
			await renderPage();
			const scope = testId ? within(screen.getByTestId(testId)) : screen;

			await user.click(scope.getAllByTestId('copy-input-button')[index]);

			expect(track).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.CUSTOM_MCP_SERVERS.USER_CLICKED_CLIENT_ON_MCP_SERVER_SHARE_PAGE,
				{ server_id: publicShare.id, client, method },
			);
		});

		it('shows a command to copy for Claude Code, Codex, and Gemini CLI', async () => {
			await renderPage();

			expect(
				screen.getByDisplayValue(`claude mcp add --transport http sales-tools ${SERVER_URL}`),
			).toBeInTheDocument();
			expect(
				screen.getByDisplayValue(`codex mcp add sales-tools --url "${SERVER_URL}"`),
			).toBeInTheDocument();
			expect(
				screen.getByDisplayValue(`gemini mcp add --transport http sales-tools ${SERVER_URL}`),
			).toBeInTheDocument();
		});

		it('gives ChatGPT and the other clients the server URL to copy', async () => {
			await renderPage();

			for (const id of ['chatgpt', 'other']) {
				expect(
					within(screen.getByTestId(`mcp-share-steps-${id}`)).getByDisplayValue(SERVER_URL),
				).toBeInTheDocument();
			}
		});

		it('gives the steps for ChatGPT', async () => {
			await renderPage();

			await waitFor(() =>
				expect(screen.getByTestId('mcp-share-steps-chatgpt')).toHaveTextContent(
					'Add custom MCP server',
				),
			);
		});
	});
});
