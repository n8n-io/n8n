import type {
	McpServerBlockResponse,
	McpServerConnectionResponse,
	McpServerConnectionsResponse,
	McpServerResponse,
} from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import McpServerConnectionsTab from './McpServerConnectionsTab.vue';

const api = vi.hoisted(() => ({
	blockMcpServerUser: vi.fn(),
	restoreMcpServerUser: vi.fn(),
	removeMcpServerUser: vi.fn(),
}));
vi.mock('../mcp-servers.api', () => api);

const permissions = vi.hoisted(() => ({ canUpdate: true }));
vi.mock('../mcp-servers.permissions', () => ({
	getMcpServerPermissions: () => ({ canList: true, canRead: true, ...permissions }),
}));

const toast = vi.hoisted(() => ({ showError: vi.fn(), showMessage: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));

const copy = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useClipboard', () => ({ useClipboard: () => ({ copy }) }));

const server: McpServerResponse = {
	id: '0190a8d6-4a2e-7000-8000-000000000001',
	projectId: 'project-1',
	project: { name: 'Support', type: 'team' },
	name: 'Support desk',
	slug: 'support-desk',
	description: '',
	createdAt: '2026-11-24T10:00:00.000Z',
	updatedAt: '2026-11-24T10:00:00.000Z',
};

const TOM = { userId: 'user-tom', firstName: 'Tom', lastName: 'Becker', email: 'tom@acme.com' };
const LEO = { userId: 'user-leo', firstName: 'Leo', lastName: 'Martins', email: 'leo@acme.com' };

function connection(
	person: typeof TOM,
	clientName: string,
	oauthClientId = clientName,
): McpServerConnectionResponse {
	return {
		...person,
		oauthClientId,
		clientName,
		firstUsedAt: '2026-11-09T10:00:00.000Z',
		lastUsedAt: '2026-11-24T10:00:00.000Z',
	};
}

function block(person: typeof TOM): McpServerBlockResponse {
	return { ...person, blockedById: 'user-builder', blockedAt: '2026-11-25T10:00:00.000Z' };
}

const renderComponent = createComponentRenderer(McpServerConnectionsTab);

function render(connections: McpServerConnectionsResponse | null, loading = false) {
	return renderComponent({ props: { server, connections, loading } });
}

const rowOf = (name: string) =>
	screen
		.getAllByRole('row')
		.filter((row) => row.textContent?.includes(name))
		.map((row) => within(row));

beforeEach(() => {
	vi.clearAllMocks();
	permissions.canUpdate = true;
});

describe('McpServerConnectionsTab', () => {
	it('lists each person and client with the access, and the actions of each row', () => {
		render({
			connections: [
				connection(TOM, 'Cursor'),
				connection(TOM, 'Claude Code'),
				connection(LEO, 'VS Code'),
			],
			blocks: [block(TOM)],
		});

		const [tomCursor, tomClaude] = rowOf('Tom Becker');
		const [leo] = rowOf('Leo Martins');
		expect(tomCursor.getByText('Cursor')).toBeInTheDocument();
		expect(tomClaude.getByText('Claude Code')).toBeInTheDocument();
		expect(tomCursor.getByText('Blocked')).toBeInTheDocument();
		expect(tomCursor.getByText('Restore access')).toBeInTheDocument();
		expect(tomCursor.getByText('Remove')).toBeInTheDocument();
		expect(leo.getByText('leo@acme.com')).toBeInTheDocument();
		expect(leo.getByText('Active')).toBeInTheDocument();
		expect(leo.getByText('Block')).toBeInTheDocument();
		expect(leo.queryByText('Restore access')).not.toBeInTheDocument();
	});

	it('shows a blocked person with no client as one row', () => {
		render({ connections: [], blocks: [block(TOM)] });

		const [tom] = rowOf('Tom Becker');
		expect(tom.getByText('Blocked')).toBeInTheDocument();
		expect(tom.getByText('Restore access')).toBeInTheDocument();
	});

	it('shows no actions to a person who cannot change the server', () => {
		permissions.canUpdate = false;
		render({
			connections: [connection(TOM, 'Cursor'), connection(LEO, 'VS Code')],
			blocks: [block(TOM)],
		});

		expect(screen.getByText('Tom Becker')).toBeInTheDocument();
		expect(screen.queryByText('Block')).not.toBeInTheDocument();
		expect(screen.queryByText('Restore access')).not.toBeInTheDocument();
		expect(screen.queryByText('Remove')).not.toBeInTheDocument();
	});

	it('offers a retry when the connections did not load', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { server, connections: null, loading: false, loadFailed: true },
		});

		const state = getByTestId('mcp-server-connections-load-error');
		expect(state).toHaveTextContent('Could not load the connections');
		await userEvent.click(within(state).getByRole('button', { name: 'Try again' }));

		expect(emitted('changed')).toHaveLength(1);
	});

	it('shows the empty state with "Copy URL" and no banner when no one connected', async () => {
		render({ connections: [], blocks: [] });

		expect(screen.getByText('No one has connected yet')).toBeInTheDocument();
		expect(screen.queryByText('Share')).not.toBeInTheDocument();
		await userEvent.click(screen.getByTestId('mcp-server-connections-copy-url'));
		expect(copy).toHaveBeenCalledWith(expect.stringMatching(/\/mcp-servers\/support-desk$/));
	});

	it('blocks a person after the confirmation', async () => {
		api.blockMcpServerUser.mockResolvedValue(block(LEO));
		const { emitted } = render({ connections: [connection(LEO, 'VS Code')], blocks: [] });

		await userEvent.click(rowOf('Leo Martins')[0].getByText('Block'));
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByText('Block Leo Martins?')).toBeInTheDocument();
		expect(
			within(dialog).getByText(
				'Leo Martins cannot connect to Support desk until you restore access. All of their clients lose access now.',
			),
		).toBeInTheDocument();
		await userEvent.click(within(dialog).getByRole('button', { name: 'Block' }));

		await waitFor(() =>
			expect(api.blockMcpServerUser).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				server.id,
				'user-leo',
			),
		);
		expect(toast.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Leo Martins is blocked' }),
		);
		expect(emitted('changed')).toHaveLength(1);
	});

	it('restores access with no confirmation', async () => {
		api.restoreMcpServerUser.mockResolvedValue(undefined);
		const { emitted } = render({ connections: [connection(TOM, 'Cursor')], blocks: [block(TOM)] });

		await userEvent.click(rowOf('Tom Becker')[0].getByText('Restore access'));

		await waitFor(() =>
			expect(api.restoreMcpServerUser).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				server.id,
				'user-tom',
			),
		);
		expect(toast.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Tom Becker can connect again' }),
		);
		expect(emitted('changed')).toHaveLength(1);
	});

	it('removes a blocked person after a confirmation that counts their connections', async () => {
		api.removeMcpServerUser.mockResolvedValue(undefined);
		const { emitted } = render({
			connections: [connection(TOM, 'Cursor'), connection(TOM, 'Claude Code')],
			blocks: [block(TOM)],
		});

		await userEvent.click(rowOf('Tom Becker')[0].getByText('Remove'));
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByText('Remove Tom Becker?')).toBeInTheDocument();
		expect(
			within(dialog).getByText(
				'This deletes the 2 connections of Tom Becker from this list and ends the block. As a member of the Support project, Tom Becker can connect again.',
			),
		).toBeInTheDocument();
		await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

		await waitFor(() =>
			expect(api.removeMcpServerUser).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				server.id,
				'user-tom',
			),
		);
		expect(toast.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Tom Becker removed' }),
		);
		expect(emitted('changed')).toHaveLength(1);
	});

	it('says that Remove only ends the block of a person with no client', async () => {
		render({ connections: [], blocks: [block(TOM)] });

		await userEvent.click(rowOf('Tom Becker')[0].getByText('Remove'));

		const dialog = await screen.findByRole('dialog');
		expect(
			within(dialog).getByText(
				'This ends the block of Tom Becker. As a member of the Support project, Tom Becker can connect again.',
			),
		).toBeInTheDocument();
	});

	it('shows the error and keeps the dialog open when the block fails', async () => {
		api.blockMcpServerUser.mockRejectedValue(new Error('Network down'));
		const { emitted } = render({ connections: [connection(LEO, 'VS Code')], blocks: [] });

		await userEvent.click(rowOf('Leo Martins')[0].getByText('Block'));
		const dialog = await screen.findByRole('dialog');
		await userEvent.click(within(dialog).getByRole('button', { name: 'Block' }));

		await waitFor(() =>
			expect(toast.showError).toHaveBeenCalledWith(
				expect.any(Error),
				'Could not block Leo Martins',
			),
		);
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(emitted('changed')).toBeUndefined();
	});
});
