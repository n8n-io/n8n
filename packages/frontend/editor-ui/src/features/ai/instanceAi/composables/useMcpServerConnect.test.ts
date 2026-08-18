import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { InstanceAiMcpConnection, useInstanceAiMcpStore } from '../instanceAiMcp.store';
import { useMcpServerConnect } from './useMcpServerConnect';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal<object>()),
	i18n: { baseText: (key: string) => key },
}));

const { mockShowMessage } = vi.hoisted(() => ({ mockShowMessage: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: mockShowMessage, showError: vi.fn() }),
}));

const { mockCanQuickConnect, mockCreateAndAuthorize } = vi.hoisted(() => ({
	mockCanQuickConnect: vi.fn(),
	mockCreateAndAuthorize: vi.fn(),
}));
vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		canOAuthCredentialQuickConnect: mockCanQuickConnect,
		createAndAuthorize: mockCreateAndAuthorize,
	}),
}));

const credentialCreatedListeners = new Set<(credential: ICredentialsResponse) => void>();
vi.mock('@/features/credentials/credentials.store', async (importOriginal) => ({
	...(await importOriginal<object>()),
	listenForCredentialChanges: ({
		onCredentialCreated,
	}: {
		onCredentialCreated?: (credential: ICredentialsResponse) => void;
	}) => {
		if (onCredentialCreated) credentialCreatedListeners.add(onCredentialCreated);
		return () => {
			if (onCredentialCreated) credentialCreatedListeners.delete(onCredentialCreated);
		};
	},
}));

function emitCredentialCreated(id: string, type = 'linearMcpOAuth2Api'): void {
	for (const listener of [...credentialCreatedListeners]) {
		listener({ id, type } as ICredentialsResponse);
	}
}

const makeConnection = (overrides: Partial<InstanceAiMcpConnection> = {}) =>
	({
		id: 'conn-1',
		serverSlug: 'linear',
		credentialId: 'cred-1',
		credentialType: 'linearMcpOAuth2Api',
		...overrides,
	}) as InstanceAiMcpConnection;

const linear = { slug: 'linear', credentialType: 'linearMcpOAuth2Api' };

describe('useMcpServerConnect', () => {
	let mcpStore: ReturnType<typeof mockedStore<typeof useInstanceAiMcpStore>>;
	let uiStore: ReturnType<typeof useUIStore>;

	async function closeCredentialModal(): Promise<void> {
		uiStore.closeModal(CREDENTIAL_EDIT_MODAL_KEY);
		await flushPromises();
	}

	async function startConnect(): Promise<{ connecting: Promise<string | null> }> {
		const connecting = useMcpServerConnect().connectServer(linear);
		await flushPromises();
		return { connecting };
	}

	beforeEach(() => {
		vi.clearAllMocks();
		credentialCreatedListeners.clear();
		setActivePinia(createTestingPinia({ stubActions: false }));

		uiStore = useUIStore();
		mcpStore = mockedStore(useInstanceAiMcpStore);
		mcpStore.connect.mockResolvedValue(makeConnection({ id: 'conn-new' }));
		mcpStore.updateConnection.mockResolvedValue(makeConnection({ id: 'conn-1' }));
		mockCanQuickConnect.mockReturnValue(false);
	});

	afterEach(async () => {
		await closeCredentialModal();
	});

	describe('connectWithCredential', () => {
		it('creates a connection when the server has none', async () => {
			const { connectWithCredential } = useMcpServerConnect();

			await expect(connectWithCredential('linear', 'cred-1')).resolves.toBe('conn-new');

			expect(mcpStore.connect).toHaveBeenCalledWith({
				serverSlug: 'linear',
				credentialId: 'cred-1',
			});
			expect(mcpStore.updateConnection).not.toHaveBeenCalled();
			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				title: 'instanceAi.mcp.success.connect',
			});
		});

		it('swaps the credential when a connection already exists', async () => {
			mcpStore.connections = [makeConnection({ id: 'conn-1', credentialId: 'cred-old' })];
			const { connectWithCredential } = useMcpServerConnect();

			await expect(connectWithCredential('linear', 'cred-new')).resolves.toBe('conn-1');

			expect(mcpStore.connect).not.toHaveBeenCalled();
			expect(mcpStore.updateConnection).toHaveBeenCalledWith('conn-1', {
				credentialId: 'cred-new',
			});
			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				title: 'instanceAi.mcp.success.changeCredential',
			});
		});

		it('does nothing when the connection already uses that credential', async () => {
			mcpStore.connections = [makeConnection({ id: 'conn-1', credentialId: 'cred-1' })];
			const { connectWithCredential } = useMcpServerConnect();

			await expect(connectWithCredential('linear', 'cred-1')).resolves.toBeNull();

			expect(mcpStore.updateConnection).not.toHaveBeenCalled();
			expect(mockShowMessage).not.toHaveBeenCalled();
		});

		it('reports failure without a success message when the request fails', async () => {
			mcpStore.connect.mockResolvedValue(null);
			const { connectWithCredential } = useMcpServerConnect();

			await expect(connectWithCredential('linear', 'cred-1')).resolves.toBeNull();

			expect(mockShowMessage).not.toHaveBeenCalled();
		});
	});

	describe('connectServer', () => {
		it('authorizes in place for a quick-connect OAuth credential type', async () => {
			mockCanQuickConnect.mockReturnValue(true);
			mockCreateAndAuthorize.mockResolvedValue({ id: 'cred-new' });

			await expect(useMcpServerConnect().connectServer(linear)).resolves.toBe('conn-new');

			expect(mockCreateAndAuthorize).toHaveBeenCalledWith('linearMcpOAuth2Api');
			expect(uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open).toBe(false);
		});

		it('shares one attempt across concurrent quick-connect callers', async () => {
			mockCanQuickConnect.mockReturnValue(true);
			let authorize!: (credential: { id: string }) => void;
			mockCreateAndAuthorize.mockReturnValue(
				new Promise<{ id: string }>((resolve) => {
					authorize = resolve;
				}),
			);
			const { connectServer } = useMcpServerConnect();

			const first = connectServer(linear);
			const second = connectServer(linear);
			authorize({ id: 'cred-new' });

			await expect(first).resolves.toBe('conn-new');
			await expect(second).resolves.toBe('conn-new');
			expect(mockCreateAndAuthorize).toHaveBeenCalledTimes(1);
			expect(mcpStore.connect).toHaveBeenCalledTimes(1);
		});

		it('stops when the user aborts the OAuth flow', async () => {
			mockCanQuickConnect.mockReturnValue(true);
			mockCreateAndAuthorize.mockResolvedValue(null);

			await expect(useMcpServerConnect().connectServer(linear)).resolves.toBeNull();

			expect(mcpStore.connect).not.toHaveBeenCalled();
		});

		it('opens the credential modal for the server credential type', async () => {
			await startConnect();

			expect(uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]).toMatchObject({
				open: true,
				activeId: 'linearMcpOAuth2Api',
			});
		});

		it('rejects and stops listening when the credential modal fails to open', async () => {
			vi.spyOn(uiStore, 'openNewCredential').mockImplementation(() => {
				throw new Error('modal unavailable');
			});

			await expect(useMcpServerConnect().connectServer(linear)).rejects.toThrow(
				'modal unavailable',
			);

			emitCredentialCreated('cred-new');
			await closeCredentialModal();

			expect(mcpStore.connect).not.toHaveBeenCalled();
		});
	});

	describe('credential edit modal reconciliation', () => {
		it('connects the credential the user created', async () => {
			const { connecting } = await startConnect();

			emitCredentialCreated('cred-new');
			await closeCredentialModal();

			expect(mcpStore.connect).toHaveBeenCalledWith({
				serverSlug: 'linear',
				credentialId: 'cred-new',
			});
			await expect(connecting).resolves.toBe('conn-new');
		});

		it('ignores a credential created for another type', async () => {
			const { connecting } = await startConnect();

			emitCredentialCreated('cred-other', 'slackApi');
			await closeCredentialModal();

			expect(mcpStore.connect).not.toHaveBeenCalled();
			await expect(connecting).resolves.toBeNull();
		});

		it('does nothing when the user cancels without creating a credential', async () => {
			const { connecting } = await startConnect();

			await closeCredentialModal();

			expect(mcpStore.connect).not.toHaveBeenCalled();
			expect(mockShowMessage).not.toHaveBeenCalled();
			await expect(connecting).resolves.toBeNull();
		});

		it('swaps the credential when the server is already connected', async () => {
			mcpStore.connections = [makeConnection({ id: 'conn-1', credentialId: 'cred-old' })];
			const { connecting } = await startConnect();

			emitCredentialCreated('cred-new');
			await closeCredentialModal();

			expect(mcpStore.connect).not.toHaveBeenCalled();
			expect(mcpStore.updateConnection).toHaveBeenCalledWith('conn-1', {
				credentialId: 'cred-new',
			});
			await expect(connecting).resolves.toBe('conn-1');
		});

		it('does nothing when no attempt is pending', async () => {
			emitCredentialCreated('cred-new');
			await closeCredentialModal();

			expect(mcpStore.connect).not.toHaveBeenCalled();
		});

		it('only reconciles once per attempt', async () => {
			await startConnect();

			emitCredentialCreated('cred-new');
			await closeCredentialModal();
			await closeCredentialModal();

			expect(mcpStore.connect).toHaveBeenCalledTimes(1);
		});

		it('finishes an attempt whose surface was torn down while the modal was open', async () => {
			let connecting: Promise<string | null> | undefined;
			const scope = effectScope();
			scope.run(() => {
				connecting = useMcpServerConnect().connectServer(linear);
			});
			await flushPromises();

			scope.stop();

			emitCredentialCreated('cred-new');
			await closeCredentialModal();

			expect(mcpStore.connect).toHaveBeenCalledWith({
				serverSlug: 'linear',
				credentialId: 'cred-new',
			});
			await expect(connecting).resolves.toBe('conn-new');
		});

		it('shares one attempt when the same server is connected twice', async () => {
			const { connectServer } = useMcpServerConnect();
			const first = connectServer(linear);
			const second = connectServer(linear);
			await flushPromises();

			emitCredentialCreated('cred-new');
			await closeCredentialModal();

			expect(mcpStore.connect).toHaveBeenCalledTimes(1);
			await expect(first).resolves.toBe('conn-new');
			await expect(second).resolves.toBe('conn-new');
		});

		it('starts a fresh attempt after the previous one settled', async () => {
			const { connectServer } = useMcpServerConnect();
			const cancelled = connectServer(linear);
			await flushPromises();
			await closeCredentialModal();
			await expect(cancelled).resolves.toBeNull();

			const retried = connectServer(linear);
			await flushPromises();
			emitCredentialCreated('cred-new');
			await closeCredentialModal();

			await expect(retried).resolves.toBe('conn-new');
		});

		it('keeps concurrent attempts for different servers apart', async () => {
			const { connectServer } = useMcpServerConnect();
			const connectingLinear = connectServer(linear);
			const connectingNotion = connectServer({
				slug: 'notion',
				credentialType: 'notionMcpOAuth2Api',
			});
			await flushPromises();

			emitCredentialCreated('cred-notion', 'notionMcpOAuth2Api');
			await closeCredentialModal();

			expect(mcpStore.connect).toHaveBeenCalledTimes(1);
			expect(mcpStore.connect).toHaveBeenCalledWith({
				serverSlug: 'notion',
				credentialId: 'cred-notion',
			});
			await expect(connectingLinear).resolves.toBeNull();
			await expect(connectingNotion).resolves.toBe('conn-new');
		});
	});
});
