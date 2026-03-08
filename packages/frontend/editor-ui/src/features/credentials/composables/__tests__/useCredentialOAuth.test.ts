import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useCredentialOAuth } from '../useCredentialOAuth';
import { useCredentialsStore } from '../../credentials.store';
import { mockedStore } from '@/__tests__/utils';
import type { ICredentialType } from 'n8n-workflow';
import type { ICredentialsResponse } from '../../credentials.types';

const { mockShowError, mockShowMessage } = vi.hoisted(() => ({
	mockShowError: vi.fn(),
	mockShowMessage: vi.fn(),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showError: mockShowError,
		showMessage: mockShowMessage,
	}),
}));

const mockTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mockTrack }),
}));

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

const oAuth1Api: ICredentialType = {
	name: 'oAuth1Api',
	displayName: 'OAuth1 API',
	properties: [],
};

const googleOAuth2Api: ICredentialType = {
	name: 'googleOAuth2Api',
	extends: ['oAuth2Api'],
	displayName: 'Google OAuth2 API',
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

const googleSheetsOAuth2Api: ICredentialType = {
	name: 'googleSheetsOAuth2Api',
	extends: ['googleOAuth2Api'],
	displayName: 'Google Sheets OAuth2 API',
	properties: [
		{ displayName: 'Scope', name: 'scope', type: 'string', default: '', required: true },
	],
};

const slackOAuth2Api: ICredentialType = {
	name: 'slackOAuth2Api',
	extends: ['oAuth2Api'],
	displayName: 'Slack OAuth2 API',
	properties: [
		{ displayName: 'Client ID', name: 'clientId', type: 'string', default: '', required: true },
	],
};

const nonOAuthApi: ICredentialType = {
	name: 'openAiApi',
	displayName: 'OpenAI API',
	properties: [
		{ displayName: 'API Key', name: 'apiKey', type: 'string', default: '', required: true },
	],
};

function setupCredentialTypes(types: ICredentialType[]) {
	const credentialsStore = mockedStore(useCredentialsStore);
	const typeMap: Record<string, ICredentialType> = {};
	for (const t of types) {
		typeMap[t.name] = t;
	}
	credentialsStore.state.credentialTypes = typeMap;
}

describe('useCredentialOAuth', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		setupCredentialTypes([
			oAuth2Api,
			oAuth1Api,
			googleOAuth2Api,
			googleSheetsOAuth2Api,
			slackOAuth2Api,
			nonOAuthApi,
		]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('getParentTypes', () => {
		it('should return empty array for types with no extends', () => {
			const { getParentTypes } = useCredentialOAuth();
			expect(getParentTypes('oAuth2Api')).toEqual([]);
			expect(getParentTypes('openAiApi')).toEqual([]);
		});

		it('should return parent types for single-level inheritance', () => {
			const { getParentTypes } = useCredentialOAuth();
			expect(getParentTypes('googleOAuth2Api')).toEqual(['oAuth2Api']);
		});

		it('should return all ancestors for multi-level inheritance', () => {
			const { getParentTypes } = useCredentialOAuth();
			expect(getParentTypes('googleSheetsOAuth2Api')).toEqual(['googleOAuth2Api', 'oAuth2Api']);
		});

		it('should handle unknown credential types gracefully', () => {
			const { getParentTypes } = useCredentialOAuth();
			expect(getParentTypes('unknownType')).toEqual([]);
		});
	});

	describe('isOAuthCredentialType', () => {
		it('should return true for oAuth2Api directly', () => {
			const { isOAuthCredentialType } = useCredentialOAuth();
			expect(isOAuthCredentialType('oAuth2Api')).toBe(true);
		});

		it('should return true for oAuth1Api directly', () => {
			const { isOAuthCredentialType } = useCredentialOAuth();
			expect(isOAuthCredentialType('oAuth1Api')).toBe(true);
		});

		it('should return true for types extending oAuth2Api', () => {
			const { isOAuthCredentialType } = useCredentialOAuth();
			expect(isOAuthCredentialType('googleOAuth2Api')).toBe(true);
			expect(isOAuthCredentialType('slackOAuth2Api')).toBe(true);
		});

		it('should return true for multi-level OAuth descendants', () => {
			const { isOAuthCredentialType } = useCredentialOAuth();
			expect(isOAuthCredentialType('googleSheetsOAuth2Api')).toBe(true);
		});

		it('should return false for non-OAuth types', () => {
			const { isOAuthCredentialType } = useCredentialOAuth();
			expect(isOAuthCredentialType('openAiApi')).toBe(false);
		});

		it('should return false for unknown types', () => {
			const { isOAuthCredentialType } = useCredentialOAuth();
			expect(isOAuthCredentialType('unknownType')).toBe(false);
		});
	});

	describe('isGoogleOAuthType', () => {
		it('should return true for googleOAuth2Api directly', () => {
			const { isGoogleOAuthType } = useCredentialOAuth();
			expect(isGoogleOAuthType('googleOAuth2Api')).toBe(true);
		});

		it('should return true for types extending googleOAuth2Api', () => {
			const { isGoogleOAuthType } = useCredentialOAuth();
			expect(isGoogleOAuthType('googleSheetsOAuth2Api')).toBe(true);
		});

		it('should return false for non-Google OAuth types', () => {
			const { isGoogleOAuthType } = useCredentialOAuth();
			expect(isGoogleOAuthType('slackOAuth2Api')).toBe(false);
			expect(isGoogleOAuthType('oAuth2Api')).toBe(false);
		});

		it('should return false for non-OAuth types', () => {
			const { isGoogleOAuthType } = useCredentialOAuth();
			expect(isGoogleOAuthType('openAiApi')).toBe(false);
		});
	});

	describe('hasManagedOAuthCredentials', () => {
		it('should return false for non-OAuth types', () => {
			const { hasManagedOAuthCredentials } = useCredentialOAuth();
			expect(hasManagedOAuthCredentials('openAiApi')).toBe(false);
		});

		it('should return false when no overwritten properties', () => {
			const { hasManagedOAuthCredentials } = useCredentialOAuth();
			expect(hasManagedOAuthCredentials('slackOAuth2Api')).toBe(false);
		});

		it('should return false when some required properties not overwritten', () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.state.credentialTypes.slackOAuth2Api = {
				...slackOAuth2Api,
				__overwrittenProperties: ['someOtherProp'],
			};

			const { hasManagedOAuthCredentials } = useCredentialOAuth();
			expect(hasManagedOAuthCredentials('slackOAuth2Api')).toBe(false);
		});

		it('should return true when all required properties are overwritten', () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.state.credentialTypes.slackOAuth2Api = {
				...slackOAuth2Api,
				__overwrittenProperties: ['clientId'],
			};

			const { hasManagedOAuthCredentials } = useCredentialOAuth();
			expect(hasManagedOAuthCredentials('slackOAuth2Api')).toBe(true);
		});

		it('should ignore notice-type properties', () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.state.credentialTypes.slackOAuth2Api = {
				...slackOAuth2Api,
				properties: [
					...slackOAuth2Api.properties,
					{
						displayName: 'Notice',
						name: 'notice',
						type: 'notice',
						default: '',
						required: true,
					},
				],
				__overwrittenProperties: ['clientId'],
			};

			const { hasManagedOAuthCredentials } = useCredentialOAuth();
			expect(hasManagedOAuthCredentials('slackOAuth2Api')).toBe(true);
		});

		it('should ignore hidden properties even when required', () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.state.credentialTypes.dropboxOAuth2Api = {
				name: 'dropboxOAuth2Api',
				extends: ['oAuth2Api'],
				displayName: 'Dropbox OAuth2 API',
				properties: [
					{
						displayName: 'Authorization URL',
						name: 'authUrl',
						type: 'hidden',
						default: 'https://www.dropbox.com/oauth2/authorize',
						required: true,
					},
					{
						displayName: 'Access Token URL',
						name: 'accessTokenUrl',
						type: 'hidden',
						default: 'https://api.dropboxapi.com/oauth2/token',
						required: true,
					},
				],
				__overwrittenProperties: ['clientId', 'clientSecret'],
			};

			const { hasManagedOAuthCredentials } = useCredentialOAuth();
			expect(hasManagedOAuthCredentials('dropboxOAuth2Api')).toBe(true);
		});

		it('should return false for unknown credential types', () => {
			const { hasManagedOAuthCredentials } = useCredentialOAuth();
			expect(hasManagedOAuthCredentials('unknownType')).toBe(false);
		});
	});

	describe('authorize', () => {
		const mockCredential: ICredentialsResponse = {
			id: 'cred-123',
			name: 'Test OAuth2',
			type: 'slackOAuth2Api',
			data: 'dummy-data',
			createdAt: '',
			updatedAt: '',
			isManaged: false,
		};

		let mockPopup: { closed: boolean; close: ReturnType<typeof vi.fn> };
		let mockBroadcastChannel: {
			close: ReturnType<typeof vi.fn>;
			addEventListener: ReturnType<typeof vi.fn>;
			postMessage: ReturnType<typeof vi.fn>;
		};

		beforeEach(() => {
			mockPopup = { closed: false, close: vi.fn() };
			mockBroadcastChannel = {
				close: vi.fn(),
				addEventListener: vi.fn(),
				postMessage: vi.fn(),
			};

			vi.stubGlobal(
				'BroadcastChannel',
				vi.fn().mockImplementation(() => mockBroadcastChannel),
			);
			vi.stubGlobal('open', vi.fn().mockReturnValue(mockPopup));
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should call oAuth2Authorize for OAuth2 types', async () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://oauth.example.com/auth');

			// Make the BroadcastChannel fire success immediately
			mockBroadcastChannel.addEventListener.mockImplementation(
				(event: string, handler: (e: MessageEvent) => void) => {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'success' } as MessageEvent), 0);
					}
				},
			);

			const { authorize } = useCredentialOAuth();
			const result = await authorize(mockCredential);

			expect(credentialsStore.oAuth2Authorize).toHaveBeenCalledWith(mockCredential);
			expect(result).toBe(true);
		});

		it('should call oAuth1Authorize for OAuth1 types', async () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			const oauth1Credential: ICredentialsResponse = {
				...mockCredential,
				type: 'oAuth1Api',
			};
			credentialsStore.oAuth1Authorize.mockResolvedValue('https://oauth1.example.com/auth');

			mockBroadcastChannel.addEventListener.mockImplementation(
				(event: string, handler: (e: MessageEvent) => void) => {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'success' } as MessageEvent), 0);
					}
				},
			);

			const { authorize } = useCredentialOAuth();
			const result = await authorize(oauth1Credential);

			expect(credentialsStore.oAuth1Authorize).toHaveBeenCalledWith(oauth1Credential);
			expect(result).toBe(true);
		});

		it('should return false when API call fails', async () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.oAuth2Authorize.mockRejectedValue(new Error('API error'));

			const { authorize } = useCredentialOAuth();
			const result = await authorize(mockCredential);

			expect(result).toBe(false);
			expect(mockShowError).toHaveBeenCalled();
		});

		it('should return false for invalid URL protocol', async () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.oAuth2Authorize.mockResolvedValue('ftp://bad-protocol.com');

			const { authorize } = useCredentialOAuth();
			const result = await authorize(mockCredential);

			expect(result).toBe(false);
			expect(mockShowError).toHaveBeenCalled();
		});

		it('should return false when popup is blocked', async () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://oauth.example.com/auth');
			vi.stubGlobal('open', vi.fn().mockReturnValue(null));

			const { authorize } = useCredentialOAuth();
			const result = await authorize(mockCredential);

			expect(result).toBe(false);
		});

		it('should return false on non-success BroadcastChannel message', async () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://oauth.example.com/auth');

			mockBroadcastChannel.addEventListener.mockImplementation(
				(event: string, handler: (e: MessageEvent) => void) => {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'error' } as MessageEvent), 0);
					}
				},
			);

			const { authorize } = useCredentialOAuth();
			const result = await authorize(mockCredential);

			expect(result).toBe(false);
			expect(mockPopup.close).toHaveBeenCalled();
		});

		it('should close BroadcastChannel after settling', async () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://oauth.example.com/auth');

			mockBroadcastChannel.addEventListener.mockImplementation(
				(event: string, handler: (e: MessageEvent) => void) => {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'success' } as MessageEvent), 0);
					}
				},
			);

			const { authorize } = useCredentialOAuth();
			await authorize(mockCredential);

			expect(mockBroadcastChannel.close).toHaveBeenCalled();
		});

		it('should return false when aborted via signal', async () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://oauth.example.com/auth');

			// Don't fire any BroadcastChannel message - instead simulate abort
			mockBroadcastChannel.addEventListener.mockImplementation(() => {
				// no-op: message handler never fires
			});

			const originalAddEventListener = AbortSignal.prototype.addEventListener;
			vi.spyOn(AbortSignal.prototype, 'addEventListener').mockImplementation(function (
				this: AbortSignal,
				event: string,
				handler: EventListenerOrEventListenerObject,
			) {
				return originalAddEventListener.call(this, event, handler);
			});

			const controller = new AbortController();
			const { authorize } = useCredentialOAuth();
			const promise = authorize(mockCredential, controller.signal);

			// Give it a tick to enter waitForOAuthCallback
			await new Promise((r) => setTimeout(r, 10));
			controller.abort();

			const result = await promise;
			expect(result).toBe(false);
		});
	});

	describe('createAndAuthorize', () => {
		const createdCredential: ICredentialsResponse = {
			id: 'new-cred-123',
			name: 'Slack OAuth2 API',
			type: 'slackOAuth2Api',
			data: 'dummy-data',
			createdAt: '',
			updatedAt: '',
			isManaged: false,
		};

		let mockPopup: { closed: boolean; close: ReturnType<typeof vi.fn> };
		let mockBroadcastChannel: {
			close: ReturnType<typeof vi.fn>;
			addEventListener: ReturnType<typeof vi.fn>;
			removeEventListener: ReturnType<typeof vi.fn>;
			postMessage: ReturnType<typeof vi.fn>;
		};

		beforeEach(() => {
			mockTrack.mockClear();
			mockPopup = { closed: false, close: vi.fn() };
			mockBroadcastChannel = {
				close: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				postMessage: vi.fn(),
			};

			vi.stubGlobal(
				'BroadcastChannel',
				vi.fn().mockImplementation(() => mockBroadcastChannel),
			);
			vi.stubGlobal('open', vi.fn().mockReturnValue(mockPopup));
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		function setupSuccessfulOAuthFlow() {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.createNewCredential.mockResolvedValue(createdCredential);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://oauth.example.com/auth');

			mockBroadcastChannel.addEventListener.mockImplementation(
				(event: string, handler: (e: MessageEvent) => void) => {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'success' } as MessageEvent), 0);
					}
				},
			);

			return credentialsStore;
		}

		function setupFailedOAuthFlow() {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.createNewCredential.mockResolvedValue(createdCredential);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://oauth.example.com/auth');

			mockBroadcastChannel.addEventListener.mockImplementation(
				(event: string, handler: (e: MessageEvent) => void) => {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'error' } as MessageEvent), 0);
					}
				},
			);

			return credentialsStore;
		}

		it('should track "User created credentials" after credential creation', async () => {
			setupSuccessfulOAuthFlow();

			const { createAndAuthorize } = useCredentialOAuth();
			await createAndAuthorize('slackOAuth2Api');

			expect(mockTrack).toHaveBeenCalledWith('User created credentials', {
				credential_type: 'slackOAuth2Api',
				credential_id: 'new-cred-123',
				workflow_id: '',
			});
		});

		it('should track "User saved credentials" with is_valid true on OAuth success', async () => {
			setupSuccessfulOAuthFlow();

			const { createAndAuthorize } = useCredentialOAuth();
			await createAndAuthorize('slackOAuth2Api');

			expect(mockTrack).toHaveBeenCalledWith('User saved credentials', {
				credential_type: 'slackOAuth2Api',
				workflow_id: '',
				credential_id: 'new-cred-123',
				is_complete: true,
				is_new: true,
				is_valid: true,
				uses_external_secrets: false,
			});
		});

		it('should track "User saved credentials" with is_valid false on OAuth failure', async () => {
			setupFailedOAuthFlow();

			const { createAndAuthorize } = useCredentialOAuth();
			await createAndAuthorize('slackOAuth2Api');

			expect(mockTrack).toHaveBeenCalledWith('User saved credentials', {
				credential_type: 'slackOAuth2Api',
				workflow_id: '',
				credential_id: 'new-cred-123',
				is_complete: true,
				is_new: true,
				is_valid: false,
				uses_external_secrets: false,
			});
		});

		it('should include node_type in tracking when provided', async () => {
			setupSuccessfulOAuthFlow();

			const { createAndAuthorize } = useCredentialOAuth();
			await createAndAuthorize('slackOAuth2Api', 'n8n-nodes-base.slack');

			expect(mockTrack).toHaveBeenCalledWith(
				'User saved credentials',
				expect.objectContaining({
					node_type: 'n8n-nodes-base.slack',
				}),
			);
		});

		it('should not include node_type in tracking when not provided', async () => {
			setupSuccessfulOAuthFlow();

			const { createAndAuthorize } = useCredentialOAuth();
			await createAndAuthorize('slackOAuth2Api');

			const savedCall = mockTrack.mock.calls.find((call) => call[0] === 'User saved credentials');
			expect(savedCall?.[1]).not.toHaveProperty('node_type');
		});

		it('should track "User saved credentials" after OAuth completes, not before', async () => {
			setupSuccessfulOAuthFlow();

			const { createAndAuthorize } = useCredentialOAuth();
			await createAndAuthorize('slackOAuth2Api');

			const createdIndex = mockTrack.mock.calls.findIndex(
				(call) => call[0] === 'User created credentials',
			);
			const savedIndex = mockTrack.mock.calls.findIndex(
				(call) => call[0] === 'User saved credentials',
			);

			expect(createdIndex).toBeGreaterThanOrEqual(0);
			expect(savedIndex).toBeGreaterThan(createdIndex);
		});
	});
});
