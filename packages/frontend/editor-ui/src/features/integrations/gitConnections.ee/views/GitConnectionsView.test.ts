import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import type { GitConnection, GitConnectionSummary } from '../gitConnections.api';
import GitConnectionsView from './GitConnectionsView.vue';

const backend = vi.hoisted(() => {
	const connections: GitConnection[] = [];
	let idCounter = 0;

	return {
		connections,
		reset() {
			connections.length = 0;
			idCounter = 0;
		},
		nextId: () => `conn-${++idCounter}`,
	};
});

const api = vi.hoisted(() => ({
	fetchGitConnections: vi.fn(),
	fetchGitConnection: vi.fn(),
	createGitConnection: vi.fn(),
	updateGitConnection: vi.fn(),
	deleteGitConnection: vi.fn(),
}));

vi.mock('../gitConnections.api', () => api);

const mockConfirm = vi.fn();
const mockShowError = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<object>('@n8n/design-system')),
	useMessage: () => ({ confirm: mockConfirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
}));

const sshConnection = (overrides: Partial<GitConnection> = {}): GitConnection => ({
	id: 'conn-ssh',
	name: 'Production',
	repositoryUrl: 'git@github.com:acme/workflows.git',
	branchName: 'main',
	connectionType: 'ssh',
	publicKey: 'ssh-ed25519 EXISTING-KEY',
	keyGeneratorType: 'ed25519',
	baseCommit: null,
	createdAt: '2026-08-01T00:00:00.000Z',
	updatedAt: '2026-08-01T00:00:00.000Z',
	...overrides,
});

const renderView = createComponentRenderer(GitConnectionsView);

const openAddDialog = async () => {
	await userEvent.click(screen.getByTestId('git-connections-add'));
	await userEvent.click(await screen.findByTestId('git-connection-type-git'));
	return await screen.findByTestId('git-connection-form-step');
};

const openEditDialog = async (row: HTMLElement) => {
	await userEvent.click(row);
	return await screen.findByTestId('git-connection-form-step');
};

const selectOption = async (select: HTMLElement, label: string) => {
	await userEvent.click(within(select).getByRole('combobox'));
	await userEvent.click(await within(select).findByText(label));
};

describe('GitConnectionsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		backend.reset();
		createTestingPinia();

		api.fetchGitConnections.mockImplementation(async () =>
			backend.connections.map(({ publicKey: _publicKey, ...summary }) => summary),
		);
		api.fetchGitConnection.mockImplementation(
			async (_ctx: unknown, id: string) => backend.connections.find((c) => c.id === id)!,
		);
		api.createGitConnection.mockImplementation(async (_ctx: unknown, payload: GitConnection) => {
			const created: GitConnection = {
				...sshConnection(),
				...payload,
				id: backend.nextId(),
				branchName: payload.branchName ?? null,
				publicKey: payload.connectionType === 'ssh' ? 'ssh-ed25519 NEW-KEY' : null,
			};
			backend.connections.push(created);
			return created;
		});
		api.updateGitConnection.mockImplementation(
			async (_ctx: unknown, id: string, payload: Partial<GitConnection>) => {
				const index = backend.connections.findIndex((c) => c.id === id);
				const updated: GitConnection = { ...backend.connections[index], ...payload };
				if (payload.connectionType === 'ssh') {
					updated.publicKey = 'ssh-ed25519 GENERATED-KEY';
				}
				backend.connections[index] = updated;
				return updated;
			},
		);
		api.deleteGitConnection.mockImplementation(async (_ctx: unknown, id: string) => {
			backend.connections.splice(
				backend.connections.findIndex((c) => c.id === id),
				1,
			);
		});
	});

	it('lets the user add a git connector, shows its deploy key, and lists it', async () => {
		renderView();
		await screen.findByTestId('git-connections-add');

		const dialog = await openAddDialog();
		await userEvent.type(within(dialog).getByTestId('git-connection-name-input'), 'Production');
		await userEvent.type(
			within(dialog).getByTestId('git-connection-repository-url-input'),
			'git@github.com:acme/workflows.git',
		);
		await userEvent.click(within(dialog).getByTestId('git-connection-save-button'));

		expect(api.createGitConnection).toHaveBeenCalledWith(expect.anything(), {
			name: 'Production',
			repositoryUrl: 'git@github.com:acme/workflows.git',
			connectionType: 'ssh',
			keyGeneratorType: 'ed25519',
		});

		expect(
			within(await screen.findByTestId('git-connection-key-step')).getByRole('textbox'),
		).toHaveValue('ssh-ed25519 NEW-KEY');

		await userEvent.click(screen.getByTestId('git-connection-done-button'));

		const card = await screen.findByTestId('git-connection-row');
		expect(card).toHaveTextContent('Production');
		expect(card).toHaveTextContent('git@github.com:acme/workflows.git');
		expect(card).toHaveTextContent('Git');
		expect(card).toHaveTextContent('Instance');
	});

	it('lets the user rename an ssh connector without generating a new deploy key', async () => {
		backend.connections.push(sshConnection());
		renderView();

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-row'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production'),
		);
		expect(within(dialog).getByTestId('git-connection-repository-url-input')).toHaveValue(
			'git@github.com:acme/workflows.git',
		);
		expect(
			within(within(dialog).getByTestId('git-connection-key-type-select')).getByRole('combobox'),
		).toBeDisabled();

		await userEvent.clear(within(dialog).getByTestId('git-connection-name-input'));
		await userEvent.type(within(dialog).getByTestId('git-connection-name-input'), 'Staging');
		await userEvent.click(within(dialog).getByTestId('git-connection-save-button'));

		expect(api.updateGitConnection).toHaveBeenCalledWith(expect.anything(), 'conn-ssh', {
			name: 'Staging',
		});
		await waitFor(() =>
			expect(screen.queryByTestId('git-connection-form-step')).not.toBeInTheDocument(),
		);
		expect(screen.queryByTestId('git-connection-key-step')).not.toBeInTheDocument();
		expect(await screen.findByTestId('git-connection-row')).toHaveTextContent('Staging');
	});

	it('shows the new deploy key when a connector is switched from https to ssh', async () => {
		backend.connections.push(
			sshConnection({
				id: 'conn-https',
				connectionType: 'https',
				repositoryUrl: 'https://github.com/acme/workflows.git',
				publicKey: null,
				keyGeneratorType: null,
			}),
		);
		renderView();

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-row'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production'),
		);
		await selectOption(within(dialog).getByTestId('git-connection-type-select'), 'SSH');
		await userEvent.click(within(dialog).getByTestId('git-connection-save-button'));

		expect(
			within(await screen.findByTestId('git-connection-key-step')).getByRole('textbox'),
		).toHaveValue('ssh-ed25519 GENERATED-KEY');
	});

	it('will not save a switch to https until both credentials are given', async () => {
		backend.connections.push(sshConnection());
		renderView();

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-row'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production'),
		);
		await selectOption(within(dialog).getByTestId('git-connection-type-select'), 'HTTPS');

		await userEvent.click(within(dialog).getByTestId('git-connection-save-button'));
		expect(api.updateGitConnection).not.toHaveBeenCalled();

		const usernameInput = within(dialog).getByTestId('git-connection-username-input');
		const passwordInput = within(dialog).getByTestId('git-connection-password-input');
		await userEvent.type(usernameInput, '   ');
		await userEvent.type(passwordInput, '   ');
		expect(within(dialog).getByTestId('git-connection-save-button')).toBeDisabled();

		await userEvent.clear(usernameInput);
		await userEvent.clear(passwordInput);
		await userEvent.type(usernameInput, 'deploy-bot');
		await userEvent.type(passwordInput, 'token');
		await userEvent.click(within(dialog).getByTestId('git-connection-save-button'));

		expect(api.updateGitConnection).toHaveBeenCalledWith(expect.anything(), 'conn-ssh', {
			connectionType: 'https',
			username: 'deploy-bot',
			password: 'token',
		});
	});

	it('will not save an https connector when only the password was retyped', async () => {
		backend.connections.push(
			sshConnection({
				id: 'conn-https',
				connectionType: 'https',
				repositoryUrl: 'https://github.com/acme/workflows.git',
				publicKey: null,
				keyGeneratorType: null,
			}),
		);
		renderView();

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-row'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production'),
		);
		const usernameInput = within(dialog).getByTestId('git-connection-username-input');
		const passwordInput = within(dialog).getByTestId('git-connection-password-input');
		await userEvent.type(usernameInput, '   ');
		await userEvent.type(passwordInput, '   ');
		expect(within(dialog).getByTestId('git-connection-save-button')).toBeDisabled();

		await userEvent.clear(usernameInput);
		await userEvent.clear(passwordInput);
		await userEvent.type(passwordInput, 'new-token');

		// Editing an unrelated field must not let the half-filled pair through.
		await userEvent.type(within(dialog).getByTestId('git-connection-name-input'), ' renamed');
		expect(within(dialog).getByTestId('git-connection-save-button')).toBeDisabled();

		await userEvent.type(usernameInput, 'deploy-bot');
		expect(within(dialog).getByTestId('git-connection-save-button')).toBeEnabled();
	});

	it('offers no save until something in the connector is changed', async () => {
		backend.connections.push(sshConnection());
		renderView();

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-row'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production'),
		);
		expect(within(dialog).getByTestId('git-connection-save-button')).toBeDisabled();

		await userEvent.type(within(dialog).getByTestId('git-connection-name-input'), '!');
		expect(within(dialog).getByTestId('git-connection-save-button')).toBeEnabled();
	});

	it('reports the problem and closes when the connector cannot be opened', async () => {
		backend.connections.push(sshConnection());
		api.fetchGitConnection.mockRejectedValueOnce(new Error('Connection not found'));
		renderView();

		await userEvent.click(await screen.findByTestId('git-connection-row'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalled());
		expect(screen.queryByTestId('git-connection-form-step')).not.toBeInTheDocument();
	});

	it('returns focus to the connector when its dialog is closed', async () => {
		backend.connections.push(sshConnection());
		renderView();

		const row = await screen.findByTestId('git-connection-row');
		const dialog = await openEditDialog(row);
		await waitFor(() =>
			expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production'),
		);
		await userEvent.click(within(dialog).getByTestId('git-connection-cancel-button'));

		await waitFor(() =>
			expect(screen.queryByTestId('git-connection-form-step')).not.toBeInTheDocument(),
		);
		expect(row).toHaveFocus();
	});

	it('will not let a second connector be added until the first one is deleted', async () => {
		mockConfirm.mockResolvedValue(MODAL_CONFIRM);
		backend.connections.push(sshConnection());
		renderView();

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-row'));
		expect(screen.queryByTestId('git-connections-add')).not.toBeInTheDocument();

		await userEvent.click(within(dialog).getByTestId('git-connection-delete-button'));

		await waitFor(() =>
			expect(screen.getByTestId('git-connections-add')).toHaveAttribute('role', 'button'),
		);
	});

	it('keeps the entered values and reports the error when saving fails', async () => {
		const serverError = new Error('Repository URL is invalid');
		api.createGitConnection.mockRejectedValueOnce(serverError);
		renderView();
		await screen.findByTestId('git-connections-add');

		const dialog = await openAddDialog();
		await userEvent.type(within(dialog).getByTestId('git-connection-name-input'), 'Production');
		await userEvent.type(
			within(dialog).getByTestId('git-connection-repository-url-input'),
			'not-a-url',
		);
		await userEvent.click(within(dialog).getByTestId('git-connection-save-button'));

		await waitFor(() =>
			expect(mockShowError).toHaveBeenCalledWith(serverError, expect.any(String)),
		);
		expect(screen.getByTestId('git-connection-form-step')).toBeInTheDocument();
		expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production');
		expect(screen.queryByTestId('git-connection-row')).not.toBeInTheDocument();
	});

	it('removes a connector once the deletion is confirmed', async () => {
		backend.connections.push(sshConnection());
		mockConfirm.mockResolvedValue(MODAL_CONFIRM);
		renderView();

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-row'));
		await userEvent.click(within(dialog).getByTestId('git-connection-delete-button'));

		await waitFor(() =>
			expect(api.deleteGitConnection).toHaveBeenCalledWith(expect.anything(), 'conn-ssh'),
		);
		await waitFor(() => expect(screen.queryByTestId('git-connection-row')).not.toBeInTheDocument());
	});

	it('keeps the connector when the deletion is cancelled', async () => {
		backend.connections.push(sshConnection());
		mockConfirm.mockResolvedValue(MODAL_CANCEL);
		renderView();

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-row'));
		await userEvent.click(within(dialog).getByTestId('git-connection-delete-button'));

		expect(api.deleteGitConnection).not.toHaveBeenCalled();
		expect(screen.getByTestId('git-connection-row')).toBeInTheDocument();
	});

	it('offers a retry instead of the empty state when the list cannot be loaded', async () => {
		const retry = Promise.withResolvers<GitConnectionSummary[]>();
		api.fetchGitConnections
			.mockRejectedValueOnce(new Error('Request failed'))
			.mockImplementationOnce(async () => await retry.promise);
		renderView();

		const errorState = await screen.findByTestId('git-connections-load-error');
		expect(errorState).toHaveTextContent("Couldn't load connectors");
		expect(screen.queryByTestId('git-connections-add')).not.toBeInTheDocument();

		backend.connections.push(sshConnection());
		await userEvent.click(within(errorState).getByRole('button'));
		expect(screen.queryByTestId('git-connections-add')).not.toBeInTheDocument();

		retry.resolve(backend.connections);
		expect(await screen.findByTestId('git-connection-row')).toHaveTextContent('Production');
	});
});
