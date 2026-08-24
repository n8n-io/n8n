import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import type { GitConnection } from '../gitConnections.api';
import GitConnectionsView from './GitConnectionsView.vue';

const backend = vi.hoisted(() => {
	const connections: GitConnection[] = [];
	let idCounter = 0;
	let failNextSave: Error | null = null;
	let failList = false;

	return {
		connections,
		reset() {
			connections.length = 0;
			idCounter = 0;
			failNextSave = null;
			failList = false;
		},
		failSaveWith(error: Error) {
			failNextSave = error;
		},
		failListing() {
			failList = true;
		},
		nextId: () => `conn-${++idCounter}`,
		takeSaveFailure() {
			const error = failNextSave;
			failNextSave = null;
			return error;
		},
		isListFailing: () => failList,
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

vi.mock('@/app/composables/useMessage', () => ({
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
	await userEvent.click(await screen.findByTestId('action-git'));
	return await screen.findByTestId('git-connection-dialog');
};

const openEditDialog = async (card: HTMLElement) => {
	await userEvent.click(within(card).getByRole('button'));
	await userEvent.click(await screen.findByTestId('action-edit'));
	return await screen.findByTestId('git-connection-dialog');
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

		api.fetchGitConnections.mockImplementation(async () => {
			if (backend.isListFailing()) throw new Error('Request failed');
			return backend.connections.map(({ publicKey: _publicKey, ...summary }) => summary);
		});
		api.fetchGitConnection.mockImplementation(
			async (_ctx: unknown, id: string) => backend.connections.find((c) => c.id === id)!,
		);
		api.createGitConnection.mockImplementation(async (_ctx: unknown, payload: GitConnection) => {
			const failure = backend.takeSaveFailure();
			if (failure) throw failure;
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
				const failure = backend.takeSaveFailure();
				if (failure) throw failure;
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
		await screen.findByTestId('empty-state');

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

		expect(await screen.findByTestId('git-connection-key-step')).toHaveTextContent(
			'ssh-ed25519 NEW-KEY',
		);

		await userEvent.click(screen.getByTestId('git-connection-done-button'));

		const card = await screen.findByTestId('git-connection-card');
		expect(card).toHaveTextContent('Production');
		expect(card).toHaveTextContent('git@github.com:acme/workflows.git');
	});

	it('lets the user rename an ssh connector without generating a new deploy key', async () => {
		backend.connections.push(sshConnection());
		renderView();

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-card'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production'),
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
			expect(screen.queryByTestId('git-connection-dialog')).not.toBeInTheDocument(),
		);
		expect(screen.queryByTestId('git-connection-key-step')).not.toBeInTheDocument();
		expect(await screen.findByTestId('git-connection-card')).toHaveTextContent('Staging');
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

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-card'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production'),
		);
		await selectOption(within(dialog).getByTestId('git-connection-type-select'), 'SSH');
		await userEvent.click(within(dialog).getByTestId('git-connection-save-button'));

		expect(await screen.findByTestId('git-connection-key-step')).toHaveTextContent(
			'ssh-ed25519 GENERATED-KEY',
		);
	});

	it('will not save a switch to https until both credentials are given', async () => {
		backend.connections.push(sshConnection());
		renderView();

		const dialog = await openEditDialog(await screen.findByTestId('git-connection-card'));
		await waitFor(() =>
			expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production'),
		);
		await selectOption(within(dialog).getByTestId('git-connection-type-select'), 'HTTPS');

		await userEvent.click(within(dialog).getByTestId('git-connection-save-button'));
		expect(api.updateGitConnection).not.toHaveBeenCalled();

		await userEvent.type(within(dialog).getByTestId('git-connection-username-input'), 'deploy-bot');
		await userEvent.type(within(dialog).getByTestId('git-connection-password-input'), 'token');
		await userEvent.click(within(dialog).getByTestId('git-connection-save-button'));

		expect(api.updateGitConnection).toHaveBeenCalledWith(expect.anything(), 'conn-ssh', {
			connectionType: 'https',
			username: 'deploy-bot',
			password: 'token',
		});
	});

	it('shows the second connector when it is edited after the first one was closed', async () => {
		backend.connections.push(
			sshConnection({ id: 'conn-a', name: 'Alpha', repositoryUrl: 'git@host:alpha.git' }),
			sshConnection({ id: 'conn-b', name: 'Beta', repositoryUrl: 'git@host:beta.git' }),
		);
		renderView();

		const cards = await screen.findAllByTestId('git-connection-card');
		const firstDialog = await openEditDialog(cards[0]);
		await waitFor(() =>
			expect(within(firstDialog).getByTestId('git-connection-name-input')).toHaveValue('Alpha'),
		);
		await userEvent.click(within(firstDialog).getByTestId('git-connection-cancel-button'));
		await waitFor(() =>
			expect(screen.queryByTestId('git-connection-dialog')).not.toBeInTheDocument(),
		);

		const secondDialog = await openEditDialog(cards[1]);
		await waitFor(() =>
			expect(within(secondDialog).getByTestId('git-connection-name-input')).toHaveValue('Beta'),
		);
		expect(within(secondDialog).getByTestId('git-connection-repository-url-input')).toHaveValue(
			'git@host:beta.git',
		);
	});

	it('keeps the entered values and reports the error when saving fails', async () => {
		const serverError = new Error('Repository URL is invalid');
		backend.failSaveWith(serverError);
		renderView();
		await screen.findByTestId('empty-state');

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
		expect(screen.getByTestId('git-connection-dialog')).toBeInTheDocument();
		expect(within(dialog).getByTestId('git-connection-name-input')).toHaveValue('Production');
		expect(screen.queryByTestId('git-connection-card')).not.toBeInTheDocument();
	});

	it('removes a connector once the deletion is confirmed', async () => {
		backend.connections.push(sshConnection());
		mockConfirm.mockResolvedValue(MODAL_CONFIRM);
		renderView();

		const card = await screen.findByTestId('git-connection-card');
		await userEvent.click(within(card).getByRole('button'));
		await userEvent.click(await screen.findByTestId('action-delete'));

		await waitFor(() =>
			expect(api.deleteGitConnection).toHaveBeenCalledWith(expect.anything(), 'conn-ssh'),
		);
		await waitFor(() =>
			expect(screen.queryByTestId('git-connection-card')).not.toBeInTheDocument(),
		);
	});

	it('keeps the connector when the deletion is cancelled', async () => {
		backend.connections.push(sshConnection());
		mockConfirm.mockResolvedValue(MODAL_CANCEL);
		renderView();

		const card = await screen.findByTestId('git-connection-card');
		await userEvent.click(within(card).getByRole('button'));
		await userEvent.click(await screen.findByTestId('action-delete'));

		expect(api.deleteGitConnection).not.toHaveBeenCalled();
		expect(screen.getByTestId('git-connection-card')).toBeInTheDocument();
	});

	it('offers a retry instead of the empty state when the list cannot be loaded', async () => {
		backend.failListing();
		renderView();

		const errorState = await screen.findByTestId('git-connections-load-error');
		expect(errorState).toHaveTextContent("Couldn't load git connections");
		expect(screen.queryByTestId('git-connections-add')).not.toBeInTheDocument();
	});
});
