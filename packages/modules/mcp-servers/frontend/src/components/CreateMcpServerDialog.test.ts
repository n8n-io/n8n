import type { McpServerResponse } from '@n8n/api-types';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import type { Scope } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { useCreateMcpServerDialog } from '../composables/useCreateMcpServerDialog';
import { MCP_SERVER_VIEW } from '../mcp-servers.constants';
import CreateMcpServerDialog from './CreateMcpServerDialog.vue';

const api = vi.hoisted(() => ({
	checkMcpServerSlug: vi.fn(),
	createMcpServer: vi.fn(),
}));
vi.mock('../mcp-servers.api', () => api);

const push = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({ route: undefined as { fullPath: string } | undefined }));
vi.mock('vue-router', async (importOriginal) => {
	const { reactive } = await import('vue');
	router.route = reactive({ fullPath: '/projects/project-1/mcp-servers' });
	return {
		...(await importOriginal()),
		useRoute: () => router.route,
		useRouter: () => ({ push }),
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

const renderComponent = createComponentRenderer(CreateMcpServerDialog);

async function renderDialog() {
	renderComponent();
	const nameInput = await screen.findByTestId('create-mcp-server-name');
	// The dialog focuses the name after it opens. Typing before that loses the keys.
	await waitFor(() => expect(nameInput).toHaveFocus());
}

function setUp(scopes: Scope[] = ['mcpServer:create']) {
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		defaultProjectId: () => 'personal-1',
		isReadOnly: () => false,
	});
	useCreateMcpServerDialog().open('project-1');
}

describe('CreateMcpServerDialog', () => {
	beforeEach(() => {
		api.checkMcpServerSlug.mockResolvedValue({ available: true, reason: null });
		api.createMcpServer.mockResolvedValue(server);
	});

	afterEach(() => {
		useCreateMcpServerDialog().close();
		capabilityRegistry.clear();
		vi.clearAllMocks();
	});

	it('keeps Create available when the URL check fails, and says so', async () => {
		api.checkMcpServerSlug.mockRejectedValue(new Error('Network error'));
		setUp();
		await renderDialog();

		await userEvent.type(screen.getByTestId('create-mcp-server-name'), 'Sales tools');

		expect(await screen.findByTestId('create-mcp-server-slug-unchecked')).toHaveTextContent(
			'n8n checks it again when you create the server',
		);
		expect(screen.getByTestId('create-mcp-server-submit')).toBeEnabled();
	});

	it('closes when the page changes, so it never creates in the project of an old page', async () => {
		setUp();
		await renderDialog();

		router.route!.fullPath = '/projects/project-2/mcp-servers';

		await waitFor(() => expect(useCreateMcpServerDialog().state.open).toBe(false));
	});

	it('makes the slug from the name and shows the server URL', async () => {
		setUp();
		await renderDialog();

		await userEvent.type(screen.getByTestId('create-mcp-server-name'), 'Sales Tools!');

		expect(screen.getByTestId('create-mcp-server-slug')).toHaveValue('sales-tools');
		expect(screen.getByTestId('create-mcp-server-url')).toHaveTextContent(
			'/mcp-servers/sales-tools',
		);
	});

	it('stops making the slug from the name after the builder edits the slug', async () => {
		setUp();
		await renderDialog();

		await userEvent.type(screen.getByTestId('create-mcp-server-slug'), 'My Slug');
		await userEvent.type(screen.getByTestId('create-mcp-server-name'), 'Sales tools');

		expect(screen.getByTestId('create-mcp-server-slug')).toHaveValue('my-slug');
	});

	it.each([
		['abc!!', 'abc-', '/mcp-servers/abc'],
		['!!!', '', '/mcp-servers/marketing-tools'],
	])('shows in the slug field only what the slug keeps from %j', async (typed, field, url) => {
		setUp();
		await renderDialog();

		await userEvent.type(screen.getByTestId('create-mcp-server-slug'), typed);

		expect(screen.getByTestId('create-mcp-server-slug')).toHaveValue(field);
		expect(screen.getByTestId('create-mcp-server-url')).toHaveTextContent(url);
	});

	it.each([
		['taken', 'This URL is already taken.'],
		['reserved', 'A deleted server used this URL. It stays reserved, so pick another one.'],
	] as const)('marks a slug that is %s and blocks the create', async (reason, message) => {
		api.checkMcpServerSlug.mockResolvedValue({ available: false, reason });
		setUp();
		await renderDialog();

		await userEvent.type(screen.getByTestId('create-mcp-server-name'), 'Support desk');

		await waitFor(() =>
			expect(screen.getByTestId('create-mcp-server-slug-error')).toHaveTextContent(message),
		);
		expect(api.checkMcpServerSlug).toHaveBeenLastCalledWith(
			expect.anything(),
			'project-1',
			'support-desk',
		);
		expect(screen.getByTestId('create-mcp-server-submit')).toBeDisabled();
	});

	it('creates the server in the project and opens its page', async () => {
		setUp();
		await renderDialog();

		await userEvent.type(screen.getByTestId('create-mcp-server-name'), 'Sales tools');
		await userEvent.type(screen.getByTestId('create-mcp-server-description'), 'Pipeline numbers');
		await waitFor(() => expect(screen.getByTestId('create-mcp-server-submit')).toBeEnabled());
		await userEvent.click(screen.getByTestId('create-mcp-server-submit'));

		expect(api.createMcpServer).toHaveBeenCalledWith(expect.anything(), 'project-1', {
			name: 'Sales tools',
			slug: 'sales-tools',
			description: 'Pipeline numbers',
		});
		expect(push).toHaveBeenCalledWith({
			name: MCP_SERVER_VIEW,
			params: { projectId: 'project-1', serverId: server.id },
		});
		expect(useCreateMcpServerDialog().state.open).toBe(false);
	});

	it('marks the URL as taken when the create answers 409, and keeps the dialog open', async () => {
		api.createMcpServer.mockRejectedValue(new ResponseError('Conflict', { httpStatusCode: 409 }));
		setUp();
		await renderDialog();

		await userEvent.type(screen.getByTestId('create-mcp-server-name'), 'Sales tools');
		await waitFor(() => expect(screen.getByTestId('create-mcp-server-submit')).toBeEnabled());
		await userEvent.click(screen.getByTestId('create-mcp-server-submit'));

		await waitFor(() =>
			expect(screen.getByTestId('create-mcp-server-slug-error')).toHaveTextContent(
				'This URL is already taken.',
			),
		);
		expect(screen.getByTestId('create-mcp-server-submit')).toBeDisabled();
		expect(useCreateMcpServerDialog().state.open).toBe(true);
		expect(push).not.toHaveBeenCalled();
	});

	it('asks for a URL when the name has no Latin letter or digit', async () => {
		setUp();
		await renderDialog();

		await userEvent.type(screen.getByTestId('create-mcp-server-name'), '日本語');

		expect(screen.getByTestId('create-mcp-server-slug-error')).toHaveTextContent(
			'The URL needs at least one Latin letter or digit.',
		);
		expect(screen.getByTestId('create-mcp-server-submit')).toBeDisabled();
		expect(api.checkMcpServerSlug).not.toHaveBeenCalled();
	});

	it('blocks the create in a project where the person cannot create servers', async () => {
		setUp(['mcpServer:list']);
		await renderDialog();

		await userEvent.type(screen.getByTestId('create-mcp-server-name'), 'Sales tools');

		expect(screen.getByTestId('create-mcp-server-project-error')).toBeInTheDocument();
		expect(screen.getByTestId('create-mcp-server-submit')).toBeDisabled();
		expect(api.checkMcpServerSlug).not.toHaveBeenCalled();
	});
});
