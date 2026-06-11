vi.mock('@n8n/computer-use/logger', () => ({
	logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('./local-auth', async () => {
	const actual = await vi.importActual<typeof localAuthModule>('./local-auth');
	return { ...actual, setupOwner: vi.fn(), login: vi.fn(), acquireTokens: vi.fn() };
});

import { EventEmitter } from 'node:events';

import type * as localAuthModule from './local-auth';
import { acquireTokens, LocalAuthError, login, setupOwner } from './local-auth';
import { LOCAL_INSTANCE_URL, LOCAL_OWNER_EMAIL } from './local-instance-config';
import { LocalInstanceManager } from './local-instance-manager';
import type { LocalInstanceProcess } from './local-instance-process';
import type { LocalInstanceStore, LocalOwnerCredentials } from './local-instance-store';
import type { AuthStatus } from '../../shared/types';
import type { OAuthFlow } from '../oauth/oauth-flow';

const TOKENS = { access_token: 'token', refresh_token: 'refresh', expires_in: 3600 };

function makeProcess() {
	const proc = new EventEmitter() as unknown as LocalInstanceProcess;
	Object.assign(proc, {
		start: vi.fn().mockResolvedValue(undefined),
		stop: vi.fn().mockResolvedValue(undefined),
		isRunning: vi.fn(() => false),
	});
	return proc;
}

function makeStore(credentials: LocalOwnerCredentials | null = null) {
	let creds = credentials;
	let enabled = false;
	return {
		getCredentials: vi.fn(() => creds),
		setCredentials: vi.fn((next: LocalOwnerCredentials) => {
			creds = next;
		}),
		isEnabled: vi.fn(() => enabled),
		setEnabled: vi.fn((next: boolean) => {
			enabled = next;
		}),
	} as unknown as LocalInstanceStore;
}

function makeOAuthFlow(status: Partial<AuthStatus> = {}) {
	return {
		getStatus: vi.fn(() => ({
			state: 'signedOut',
			instanceUrl: null,
			lastInstanceUrl: null,
			error: null,
			...status,
		})),
		adoptSession: vi.fn(),
	} as unknown as OAuthFlow;
}

function makeManager({
	credentials = null as LocalOwnerCredentials | null,
	authStatus = {} as Partial<AuthStatus>,
} = {}) {
	const instanceProcess = makeProcess();
	const store = makeStore(credentials);
	const oauthFlow = makeOAuthFlow(authStatus);
	const manager = new LocalInstanceManager({
		instanceProcess,
		store,
		oauthFlow,
		userDataDir: '/tmp/user-data',
	});
	return { manager, instanceProcess, store, oauthFlow };
}

describe('LocalInstanceManager', () => {
	const mockFetch = vi.fn<typeof fetch>();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('fetch', mockFetch);
		vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
	});

	describe('signIn', () => {
		it('first run: starts n8n, sets up the owner, adopts the session, persists the choice', async () => {
			const { manager, instanceProcess, store, oauthFlow } = makeManager();
			vi.mocked(setupOwner).mockResolvedValue('n8n-auth=jwt');
			vi.mocked(acquireTokens).mockResolvedValue(TOKENS);
			const statuses: string[] = [];
			manager.on('statusChanged', ({ state }) => statuses.push(state));

			await manager.signIn();

			expect(instanceProcess.start).toHaveBeenCalledWith(
				expect.objectContaining({ N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6' }),
			);
			expect(setupOwner).toHaveBeenCalledWith(
				LOCAL_INSTANCE_URL,
				expect.objectContaining({ email: LOCAL_OWNER_EMAIL }),
			);
			expect(store.setCredentials).toHaveBeenCalled();
			expect(oauthFlow.adoptSession).toHaveBeenCalledWith(LOCAL_INSTANCE_URL, TOKENS);
			expect(store.setEnabled).toHaveBeenCalledWith(true);
			expect(statuses).toEqual(['starting', 'running']);
		});

		it('subsequent run: logs in with the stored credentials instead of owner setup', async () => {
			const credentials = { email: LOCAL_OWNER_EMAIL, password: 'A1stored' };
			const { manager } = makeManager({ credentials });
			vi.mocked(login).mockResolvedValue('n8n-auth=jwt');
			vi.mocked(acquireTokens).mockResolvedValue(TOKENS);

			await manager.signIn();

			expect(login).toHaveBeenCalledWith(LOCAL_INSTANCE_URL, credentials);
			expect(setupOwner).not.toHaveBeenCalled();
		});

		it('retries with owner setup when stored credentials hit a recreated DB', async () => {
			const { manager, store } = makeManager({
				credentials: { email: LOCAL_OWNER_EMAIL, password: 'A1stale' },
			});
			vi.mocked(login).mockRejectedValue(new LocalAuthError('invalid_credentials', 'rejected'));
			vi.mocked(setupOwner).mockResolvedValue('n8n-auth=jwt');
			vi.mocked(acquireTokens).mockResolvedValue(TOKENS);

			await manager.signIn();

			expect(setupOwner).toHaveBeenCalled();
			expect(store.setCredentials).toHaveBeenCalledTimes(1);
		});

		it('surfaces invalid_credentials when owner setup is closed (password changed in DB)', async () => {
			const { manager, instanceProcess } = makeManager({
				credentials: { email: LOCAL_OWNER_EMAIL, password: 'A1stale' },
			});
			vi.mocked(login).mockRejectedValue(new LocalAuthError('invalid_credentials', 'rejected'));
			vi.mocked(setupOwner).mockRejectedValue(new LocalAuthError('request_failed', 'owner exists'));

			await expect(manager.signIn()).rejects.toMatchObject({ code: 'invalid_credentials' });

			expect(manager.getStatus()).toMatchObject({ state: 'error' });
			expect(instanceProcess.stop).toHaveBeenCalled();
		});

		it('skips token acquisition when a local session is already adopted', async () => {
			const { manager, oauthFlow } = makeManager({
				authStatus: { state: 'signedIn', instanceUrl: LOCAL_INSTANCE_URL },
			});

			await manager.signIn();

			expect(login).not.toHaveBeenCalled();
			expect(acquireTokens).not.toHaveBeenCalled();
			expect(oauthFlow.adoptSession).not.toHaveBeenCalled();
			expect(manager.getStatus()).toMatchObject({ state: 'running' });
		});
	});

	describe('ollama pre-flight (no Anthropic key)', () => {
		beforeEach(() => {
			vi.stubEnv('ANTHROPIC_API_KEY', '');
		});

		it('errors before spawning when ollama is unreachable', async () => {
			const { manager, instanceProcess } = makeManager();
			mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

			await expect(manager.signIn()).rejects.toThrow('Ollama is not reachable');
			expect(instanceProcess.start).not.toHaveBeenCalled();
		});

		it('errors before spawning when the model is not pulled', async () => {
			const { manager, instanceProcess } = makeManager();
			mockFetch.mockResolvedValue(
				new Response(JSON.stringify({ models: [{ name: 'llama3:8b' }] })),
			);

			await expect(manager.signIn()).rejects.toThrow('not installed');
			expect(instanceProcess.start).not.toHaveBeenCalled();
		});

		it('passes the ollama model env through when the tag is installed', async () => {
			const { manager, instanceProcess } = makeManager();
			mockFetch.mockResolvedValue(
				new Response(JSON.stringify({ models: [{ name: 'gemma4:latest' }] })),
			);
			vi.mocked(setupOwner).mockResolvedValue('n8n-auth=jwt');
			vi.mocked(acquireTokens).mockResolvedValue(TOKENS);

			await manager.signIn();

			expect(instanceProcess.start).toHaveBeenCalledWith(
				expect.objectContaining({ N8N_INSTANCE_AI_MODEL: 'ollama/gemma4' }),
			);
		});
	});

	describe('ensureRunningAndSignedIn', () => {
		it('does nothing when local mode is not enabled', async () => {
			const { manager, instanceProcess } = makeManager();

			await manager.ensureRunningAndSignedIn();

			expect(instanceProcess.start).not.toHaveBeenCalled();
		});

		it('starts and reuses the persisted session without rethrowing on failure', async () => {
			const { manager, store, instanceProcess } = makeManager({
				authStatus: { state: 'signedIn', instanceUrl: LOCAL_INSTANCE_URL },
			});
			store.setEnabled(true);
			vi.mocked(instanceProcess.start).mockRejectedValue(new Error('spawn failed'));

			await expect(manager.ensureRunningAndSignedIn()).resolves.toBeUndefined();

			expect(manager.getStatus()).toMatchObject({ state: 'error', error: 'spawn failed' });
		});
	});

	describe('lifecycle', () => {
		it('disable stops the instance and clears the flag but keeps credentials', async () => {
			const { manager, store, instanceProcess } = makeManager({
				credentials: { email: LOCAL_OWNER_EMAIL, password: 'A1stored' },
			});
			store.setEnabled(true);

			await manager.disable();

			expect(store.setEnabled).toHaveBeenCalledWith(false);
			expect(instanceProcess.stop).toHaveBeenCalled();
			expect(store.getCredentials()).not.toBeNull();
			expect(manager.getStatus()).toMatchObject({ state: 'stopped' });
		});

		it('flags an unexpected exit as an error, but not an intentional stop', async () => {
			const { manager, instanceProcess } = makeManager();
			vi.mocked(setupOwner).mockResolvedValue('n8n-auth=jwt');
			vi.mocked(acquireTokens).mockResolvedValue(TOKENS);
			await manager.signIn();

			instanceProcess.emit('exited', 1);
			expect(manager.getStatus()).toMatchObject({ state: 'error' });

			await manager.stop();
			instanceProcess.emit('exited', 0);
			expect(manager.getStatus()).toMatchObject({ state: 'stopped' });
		});
	});
});
