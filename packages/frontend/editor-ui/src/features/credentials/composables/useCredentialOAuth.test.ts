import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';

import type { ICredentialType } from 'n8n-workflow';

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

vi.mock('./oauthCallback', async (importOriginal) => ({
	...(await importOriginal<typeof import('./oauthCallback')>()),
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

	describe('Automatic OAuth mode', () => {
		const oAuth2Api: ICredentialType = {
			name: 'oAuth2Api',
			displayName: 'OAuth2 API',
			properties: [
				{ displayName: 'Client ID', name: 'clientId', type: 'string', default: '', required: true },
				{
					displayName: 'Client Secret',
					name: 'clientSecret',
					type: 'string',
					default: '',
					required: true,
				},
			],
		};
		const todoistOAuth2Api: ICredentialType = {
			name: 'todoistOAuth2Api',
			extends: ['oAuth2Api'],
			displayName: 'Todoist OAuth2 API',
			properties: [],
		};
		const registerTypes = (todoist: ICredentialType) => {
			useCredentialsStore().state.credentialTypes = {
				[oAuth2Api.name]: oAuth2Api,
				[todoist.name]: todoist,
			};
		};

		it.each([
			{ expected: true, case: 'the type supports registration', dynamicClientRegistration: true },
			{
				expected: false,
				case: 'the type does not support registration',
				dynamicClientRegistration: undefined,
			},
		])('offers quick connect: $expected when $case', ({ expected, dynamicClientRegistration }) => {
			registerTypes({ ...todoistOAuth2Api, dynamicClientRegistration });

			expect(useCredentialOAuth().canOAuthCredentialQuickConnect('todoistOAuth2Api')).toBe(
				expected,
			);
		});

		it('creates the credential in Automatic mode when it connects with one click', async () => {
			registerTypes({ ...todoistOAuth2Api, dynamicClientRegistration: true });
			vi.mocked(credentialsApi.createNewCredential).mockResolvedValue(
				credential({ type: 'todoistOAuth2Api' }),
			);

			await useCredentialOAuth().createAndAuthorize('todoistOAuth2Api', undefined, {
				name: 'Todoist account',
			});

			expect(credentialsApi.createNewCredential).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					data: expect.objectContaining({ useDynamicClientRegistration: true }),
				}),
			);
		});
	});
});
