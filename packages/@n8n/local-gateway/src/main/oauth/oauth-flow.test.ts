vi.mock('@n8n/computer-use/logger', () => ({
	logger: {
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock('./oauth-client', async () => {
	const actual = await vi.importActual<typeof oauthClientModule>('./oauth-client');
	return {
		...actual,
		discover: vi.fn(),
		exchangeCode: vi.fn(),
		refreshTokens: vi.fn(),
		buildAuthorizeUrl: vi.fn(() => 'https://auth.example/authorize'),
	};
});

import type * as oauthClientModule from './oauth-client';
import { buildAuthorizeUrl, discover, exchangeCode } from './oauth-client';
import { OAuthFlow } from './oauth-flow';
import type { PersistedSession, TokenStore } from './token-store';

const METADATA = {
	authorization_endpoint: 'https://auth.example/authorize',
	token_endpoint: 'https://auth.example/token',
};

/** In-memory TokenStore double mirroring the real keep-lastInstanceUrl-on-clear semantics. */
function makeStore(initialLastInstanceUrl: string | null = null): TokenStore {
	let session: PersistedSession | null = null;
	let lastInstanceUrl = initialLastInstanceUrl;
	return {
		getSession: () => session,
		setSession: (next: PersistedSession) => {
			session = next;
		},
		clearSession: () => {
			session = null;
		},
		getLastInstanceUrl: () => lastInstanceUrl,
		setLastInstanceUrl: (url: string) => {
			lastInstanceUrl = url;
		},
	} as unknown as TokenStore;
}

function makeFlow(store: TokenStore): OAuthFlow {
	return new OAuthFlow({ store, openExternal: vi.fn().mockResolvedValue(undefined) });
}

/** Run the browser round-trip: signIn, then the deep-link callback with the matching state. */
async function completeSignIn(flow: OAuthFlow, instanceUrl: string): Promise<void> {
	vi.mocked(discover).mockResolvedValue(METADATA);
	vi.mocked(exchangeCode).mockResolvedValue({ access_token: 'token', expires_in: 3600 });

	await flow.signIn(instanceUrl);
	const [, authorizeParams] = vi.mocked(buildAuthorizeUrl).mock.calls.at(-1)!;
	await flow.handleCallback({ code: 'auth-code', state: authorizeParams.state });
}

describe('OAuthFlow lastInstanceUrl', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('remembers the instance URL after a successful sign-in', async () => {
		const store = makeStore();
		const flow = makeFlow(store);

		await completeSignIn(flow, 'https://workspace.app.n8n.cloud');

		expect(store.getLastInstanceUrl()).toBe('https://workspace.app.n8n.cloud');
		expect(flow.getStatus()).toEqual({
			state: 'signedIn',
			instanceUrl: 'https://workspace.app.n8n.cloud',
			lastInstanceUrl: 'https://workspace.app.n8n.cloud',
			error: null,
		});
	});

	it('keeps the remembered URL in the signedOut status after sign-out', async () => {
		const store = makeStore();
		const flow = makeFlow(store);
		await completeSignIn(flow, 'https://workspace.app.n8n.cloud');

		const emitted = vi.fn();
		flow.on('authStatusChanged', emitted);
		flow.signOut();

		expect(store.getSession()).toBeNull();
		expect(emitted).toHaveBeenCalledWith({
			state: 'signedOut',
			instanceUrl: null,
			lastInstanceUrl: 'https://workspace.app.n8n.cloud',
			error: null,
		});
	});

	it('does not overwrite the remembered URL when authorization fails', async () => {
		const store = makeStore('https://old.example');
		const flow = makeFlow(store);
		vi.mocked(discover).mockRejectedValue(new Error('discovery failed'));

		await expect(flow.signIn('https://new.example')).rejects.toThrow('discovery failed');

		expect(store.getLastInstanceUrl()).toBe('https://old.example');
		expect(flow.getStatus()).toMatchObject({
			state: 'error',
			lastInstanceUrl: 'https://old.example',
		});
	});

	it('exposes the remembered URL on startup without a session', () => {
		const flow = makeFlow(makeStore('https://workspace.app.n8n.cloud'));

		expect(flow.getStatus()).toEqual({
			state: 'signedOut',
			instanceUrl: null,
			lastInstanceUrl: 'https://workspace.app.n8n.cloud',
			error: null,
		});
	});
});
