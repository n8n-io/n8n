import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';

import type { ICredentialsResponse } from '../credentials.types';
import * as credentialsApi from '../credentials.api';
import { useCredentialsStore } from '../credentials.store';
import { useCredentialOAuth } from './useCredentialOAuth';

const mockRootStore = {
	restApiContext: { baseUrl: 'http://localhost:5678', sessionId: 'test-session' },
	baseUrl: 'http://localhost:5678',
	urlBaseEditor: 'http://localhost:5678',
};

const { useRootStore } = vi.hoisted(() => ({
	useRootStore: vi.fn(() => mockRootStore),
}));

vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('./oauthCallback', () => ({
	getTrustedOAuthOrigins: () => ['http://localhost:5678'],
	hasOAuthTokenData: vi.fn(() => false),
	waitForOAuthCallback: vi.fn(async () => 'success'),
}));

vi.mock('../credentials.api');
vi.mock('../credentials.ee.api');

const credential = (overrides: Partial<ICredentialsResponse> = {}): ICredentialsResponse =>
	mock<ICredentialsResponse>({
		id: 'new-cred',
		name: 'A Google account',
		type: 'oAuth2Api',
		isResolvable: false,
		...overrides,
	});

describe('useCredentialOAuth', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());

		vi.stubGlobal(
			'open',
			vi.fn(() => ({ location: { href: '' }, close: vi.fn() })),
		);
		vi.mocked(credentialsApi.oAuth2CredentialAuthorize).mockResolvedValue(
			'https://example.com/authorize',
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('authorizeNewCredential', () => {
		it('makes the connected credential available to the scoped picker', async () => {
			const store = useCredentialsStore();
			const connected = credential();

			// The picker starts on a scope that does not know the credential yet.
			vi.mocked(credentialsApi.getUsableCredentials).mockResolvedValue([]);
			await store.fetchUsableCredentials({ workflowId: 'wf-1' });
			expect(store.getUsableCredentialByType('oAuth2Api')).toEqual([]);

			vi.mocked(credentialsApi.getUsableCredentials).mockResolvedValue([connected]);
			const success = await useCredentialOAuth().authorizeNewCredential(connected);

			expect(success).toBe(true);
			expect(credentialsApi.getUsableCredentials).toHaveBeenLastCalledWith(
				mockRootStore.restApiContext,
				{ workflowId: 'wf-1' },
			);
			expect(store.getUsableCredentialByType('oAuth2Api')).toEqual([connected]);
		});

		it('leaves the slice untouched when no scoped fetch has happened', async () => {
			const store = useCredentialsStore();
			const connected = credential();

			await useCredentialOAuth().authorizeNewCredential(connected);

			expect(credentialsApi.getUsableCredentials).not.toHaveBeenCalled();
			expect(store.hasFetchedUsableCredentials).toBe(false);
			// The flat map still learns about the credential, as it did before.
			expect(store.getCredentialById('new-cred')?.id).toBe('new-cred');
		});
	});
});
