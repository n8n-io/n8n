import { createComponentRenderer } from '@/__tests__/render';
import CredentialEdit from '@/components/CredentialEdit/CredentialEdit.vue';
import { createTestingPinia } from '@pinia/testing';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/constants';
import { STORES } from '@n8n/stores';
import { retry, mockedStore } from '@/__tests__/utils';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { ICredentialsResponse } from '@/Interface';
import { within } from '@testing-library/vue';
import type { ICredentialType } from 'n8n-workflow';

const oAuth2Api: ICredentialType = {
	name: 'oAuth2Api',
	displayName: 'OAuth2 API',
	documentationUrl: 'httpRequest',
	genericAuth: true,
	properties: [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'options',
			options: [
				{
					name: 'Authorization Code',
					value: 'authorizationCode',
				},
				{
					name: 'Client Credentials',
					value: 'clientCredentials',
				},
				{
					name: 'PKCE',
					value: 'pkce',
				},
			],
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			displayOptions: {
				show: {
					grantType: ['authorizationCode', 'pkce'],
				},
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'string',
			displayOptions: {
				show: {
					grantType: ['authorizationCode', 'pkce'],
				},
			},
			default: '',
			description:
				'For some services additional query parameters have to be set which can be defined here',
			placeholder: 'access_type=offline',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Body',
					value: 'body',
					description: 'Send credentials in body',
				},
				{
					name: 'Header',
					value: 'header',
					description: 'Send credentials as Basic Auth header',
				},
			],
			default: 'header',
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'ignoreSSLIssues',
			type: 'boolean',
			default: false,
			doNotInherit: true,
		},
	],
	iconUrl: 'icons/n8n-nodes-base/dist/nodes/GraphQL/graphql.png',
	supportedNodes: ['n8n-nodes-base.graphql', 'n8n-nodes-base.httpRequest'],
};

const googleOAuth2Api: ICredentialType = {
	name: 'googleOAuth2Api',
	extends: ['oAuth2Api'],
	displayName: 'Google OAuth2 API',
	documentationUrl: 'google/oauth-generic',
	properties: [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://accounts.google.com/o/oauth2/v2/auth',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://oauth2.googleapis.com/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'access_type=offline&prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	],
	iconUrl: 'icons/n8n-nodes-base/dist/credentials/icons/Google.svg',
	supportedNodes: [],
};

const googleBigQueryOAuth2Api: ICredentialType = {
	name: 'googleBigQueryOAuth2Api',
	extends: ['googleOAuth2Api'],
	displayName: 'Google BigQuery OAuth2 API',
	documentationUrl: 'google/oauth-single-service',
	properties: [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'https://www.googleapis.com/auth/bigquery https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/drive',
		},
	],
	iconUrl: 'icons/n8n-nodes-base/dist/nodes/Google/BigQuery/googleBigQuery.svg',
	supportedNodes: ['n8n-nodes-base.googleBigQuery'],
};

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: vi.fn(() => ({
		credential: {
			create: true,
			update: true,
		},
	})),
}));

const renderComponent = createComponentRenderer(CredentialEdit, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalsById: {
					[CREDENTIAL_EDIT_MODAL_KEY]: { open: true },
				},
			},
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						sharing: true,
						externalSecrets: false,
					},
					templates: {
						host: '',
					},
				},
			},
		},
	}),
});
describe('CredentialEdit', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	test('shows the save button when credentialId is null', async () => {
		const { queryByTestId } = renderComponent({
			props: {
				modalName: CREDENTIAL_EDIT_MODAL_KEY,
				mode: 'new',
			},
		});
		await retry(() => expect(queryByTestId('credential-save-button')).toBeInTheDocument());
	});

	test('hides the save button when credentialId exists and there are no unsaved changes', async () => {
		const { queryByTestId } = renderComponent({
			props: {
				activeId: '123', // credentialId will be set to this value in edit mode
				modalName: CREDENTIAL_EDIT_MODAL_KEY,
				mode: 'edit',
			},
		});
		await retry(() => expect(queryByTestId('credential-save-button')).not.toBeInTheDocument());
	});

	test('hides menu item when credential is managed', async () => {
		const credentialsStore = useCredentialsStore();

		credentialsStore.state.credentials = {
			'123': {
				isManaged: false,
			} as ICredentialsResponse,
		};

		const { queryByText } = renderComponent({
			props: {
				activeId: '123', // credentialId will be set to this value in edit mode
				modalName: CREDENTIAL_EDIT_MODAL_KEY,
				mode: 'edit',
			},
		});

		await retry(() => expect(queryByText('Details')).toBeInTheDocument());
		await retry(() => expect(queryByText('Connection')).toBeInTheDocument());
		await retry(() => expect(queryByText('Sharing')).toBeInTheDocument());
	});

	test('shows menu item when credential is not managed', async () => {
		const credentialsStore = useCredentialsStore();

		credentialsStore.state.credentials = {
			'123': {
				isManaged: true,
			} as ICredentialsResponse,
		};

		const { queryByText } = renderComponent({
			props: {
				activeId: '123', // credentialId will be set to this value in edit mode
				modalName: CREDENTIAL_EDIT_MODAL_KEY,
				mode: 'edit',
			},
		});

		await retry(() => expect(queryByText('Details')).not.toBeInTheDocument());
		await retry(() => expect(queryByText('Connection')).not.toBeInTheDocument());
		await retry(() => expect(queryByText('Sharing')).not.toBeInTheDocument());
	});

	test.each([
		{
			case: 'valid credential',
			data: {
				clientId: 'client_id',
				clientSecret: '__n8n_EMPTY_VALUE_7b1af746-3729-4c60-9b9b-e08eb29e58da',
			},
		},
		{
			case: 'malformed credential from source-control',
			data: {
				grantType: '',
				authUrl: '',
				accessTokenUrl: '',
				clientId: 'client_id',
				clientSecret: '__n8n_EMPTY_VALUE_7b1af746-3729-4c60-9b9b-e08eb29e58da',
				scope: '',
				authQueryParameters: '',
				authentication: '',
			},
		},
	])('should show Sign in with Google for $case data', async ({ data }) => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.getCredentialData.mockResolvedValueOnce({
			// @ts-expect-error data is decrypted
			data,
			createdAt: '2025-05-13T10:45:45.588Z',
			updatedAt: '2025-05-15T12:36:01.826Z',
			id: '6ufuMkOc7bb3LyGV',
			name: 'Google BigQuery account',
			type: 'googleBigQueryOAuth2Api',
			isManaged: false,
			sharedWithProjects: [],
			scopes: ['credential:update'],
			oauthTokenData: false,
		});

		credentialsStore.state.credentialTypes = {
			[oAuth2Api.name]: oAuth2Api,
			[googleOAuth2Api.name]: googleOAuth2Api,
			[googleBigQueryOAuth2Api.name]: googleBigQueryOAuth2Api,
		};

		const { getByTestId } = renderComponent({
			props: {
				activeId: '6ufuMkOc7bb3LyGV',
				modalName: CREDENTIAL_EDIT_MODAL_KEY,
				mode: 'edit',
			},
		});
		await retry(() => expect(credentialsStore.getCredentialData).toHaveBeenCalled());
		await retry(() => expect(getByTestId('credential-edit-dialog')).toBeInTheDocument());

		expect(
			within(getByTestId('credential-edit-dialog')).getByTestId('oauth-connect-button'),
		).toBeInTheDocument();
	});
});
