import CredentialModeSelector from './CredentialModeSelector.vue';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useCredentialsStore } from '../../credentials.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeUi } from '@/Interface';

const dropboxOAuth2ApiType: ICredentialType = {
	name: 'dropboxOAuth2Api',
	extends: ['oAuth2Api'],
	displayName: 'Dropbox OAuth2 API',
	properties: [],
	__overwrittenProperties: ['clientId', 'clientSecret'],
};

const dropboxApiType: ICredentialType = {
	name: 'dropboxApi',
	displayName: 'Dropbox API',
	properties: [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	],
};

const twoAuthNodeType = {
	displayName: 'Dropbox',
	name: 'n8n-nodes-base.dropbox',
	group: ['input'],
	version: 1,
	description: 'Access data on Dropbox',
	defaults: { name: 'Dropbox' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'dropboxApi',
			required: true,
			displayOptions: { show: { authentication: ['accessToken'] } },
		},
		{
			name: 'dropboxOAuth2Api',
			required: true,
			displayOptions: { show: { authentication: ['oAuth2'] } },
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{ name: 'Access Token', value: 'accessToken' },
				{ name: 'OAuth2', value: 'oAuth2' },
			],
			default: 'accessToken',
		},
	],
} as unknown as INodeTypeDescription;

const threeAuthApiKeyType: ICredentialType = {
	name: 'dropboxApiKeyApi',
	displayName: 'Dropbox API Key',
	properties: [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	],
};

const threeAuthNodeType = {
	displayName: 'MultiAuth Service',
	name: 'n8n-nodes-base.multiAuth',
	group: ['input'],
	version: 1,
	description: 'Service with 3 auth types',
	defaults: { name: 'MultiAuth' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'dropboxApi',
			required: true,
			displayOptions: { show: { authentication: ['accessToken'] } },
		},
		{
			name: 'dropboxOAuth2Api',
			required: true,
			displayOptions: { show: { authentication: ['oAuth2'] } },
		},
		{
			name: 'dropboxApiKeyApi',
			required: true,
			displayOptions: { show: { authentication: ['apiKey'] } },
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{ name: 'Access Token', value: 'accessToken' },
				{ name: 'OAuth2', value: 'oAuth2' },
				{ name: 'API Key', value: 'apiKey' },
			],
			default: 'accessToken',
		},
	],
} as unknown as INodeTypeDescription;

const renderComponent = createComponentRenderer(CredentialModeSelector);

function setupStores(opts: {
	nodeType: INodeTypeDescription;
	node: INodeUi;
	credentialTypes: Record<string, ICredentialType>;
}) {
	const pinia = createTestingPinia({ stubActions: false });

	const ndvStore = mockedStore(useNDVStore);
	ndvStore.activeNode = opts.node;

	const nodeTypesStore = mockedStore(useNodeTypesStore);
	nodeTypesStore.setNodeTypes([opts.nodeType]);

	const credStore = useCredentialsStore();
	credStore.state.credentialTypes = opts.credentialTypes;

	return pinia;
}

function makeNode(nodeTypeName: string, authValue: string): INodeUi {
	return {
		parameters: { authentication: authValue },
		type: nodeTypeName,
		typeVersion: 1,
		position: [0, 0],
		id: 'test-node-id',
		name: 'Test Node',
		credentials: {},
	};
}

describe('CredentialModeSelector', () => {
	describe('2 auth options (switch link)', () => {
		it('should show switch link when there are exactly 2 options', () => {
			const pinia = setupStores({
				nodeType: twoAuthNodeType,
				node: makeNode('n8n-nodes-base.dropbox', 'accessToken'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
				},
			});

			renderComponent({
				pinia,
				props: {
					credentialType: dropboxApiType,
				},
			});

			expect(screen.getByTestId('credential-mode-selector')).toBeInTheDocument();
			expect(screen.getByTestId('credential-mode-switch-link')).toBeInTheDocument();
			expect(screen.queryByTestId('credential-mode-dropdown-trigger')).not.toBeInTheDocument();
		});

		it('should emit authTypeChanged when clicking switch link', async () => {
			const pinia = setupStores({
				nodeType: twoAuthNodeType,
				node: makeNode('n8n-nodes-base.dropbox', 'accessToken'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
				},
			});

			const { emitted } = renderComponent({
				pinia,
				props: {
					credentialType: dropboxApiType,
				},
			});

			await userEvent.click(screen.getByTestId('credential-mode-switch-link'));

			expect(emitted('update:authType')).toHaveLength(1);
			expect(emitted('update:authType')[0]).toEqual([{ type: 'oAuth2' }]);
		});

		it('should emit the other auth type when switch link is clicked from OAuth2', async () => {
			const pinia = setupStores({
				nodeType: twoAuthNodeType,
				node: makeNode('n8n-nodes-base.dropbox', 'oAuth2'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
				},
			});

			const { emitted } = renderComponent({
				pinia,
				props: {
					credentialType: dropboxOAuth2ApiType,
				},
			});

			// From OAuth2, switch to Access Token
			await userEvent.click(screen.getByTestId('credential-mode-switch-link'));
			expect(emitted('update:authType')[0]).toEqual([{ type: 'accessToken' }]);
		});
	});

	describe('3+ auth options (dropdown menu)', () => {
		it('should show dropdown trigger when there are 3+ options', () => {
			const pinia = setupStores({
				nodeType: threeAuthNodeType,
				node: makeNode('n8n-nodes-base.multiAuth', 'accessToken'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
					dropboxApiKeyApi: threeAuthApiKeyType,
				},
			});

			renderComponent({
				pinia,
				props: {
					credentialType: dropboxApiType,
				},
			});

			expect(screen.getByTestId('credential-mode-selector')).toBeInTheDocument();
			expect(screen.getByTestId('credential-mode-dropdown-trigger')).toBeInTheDocument();
			expect(screen.queryByTestId('credential-mode-switch-link')).not.toBeInTheDocument();
			expect(screen.getByText('Setup credential')).toBeInTheDocument();
		});

		it('should show current auth type name on trigger button', async () => {
			const pinia = setupStores({
				nodeType: threeAuthNodeType,
				node: makeNode('n8n-nodes-base.multiAuth', 'accessToken'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
					dropboxApiKeyApi: threeAuthApiKeyType,
				},
			});

			renderComponent({
				pinia,
				props: {
					credentialType: dropboxApiType,
				},
			});

			await waitFor(() => {
				expect(screen.getByTestId('credential-mode-dropdown-trigger')).toHaveTextContent(
					'Access Token',
				);
			});
		});

		it('should emit authTypeChanged when selecting a different option from dropdown', async () => {
			const pinia = setupStores({
				nodeType: threeAuthNodeType,
				node: makeNode('n8n-nodes-base.multiAuth', 'accessToken'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
					dropboxApiKeyApi: threeAuthApiKeyType,
				},
			});

			const { emitted } = renderComponent({
				pinia,
				props: {
					credentialType: dropboxApiType,
				},
			});

			await userEvent.click(screen.getByTestId('credential-mode-dropdown-trigger'));

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			await userEvent.click(screen.getByRole('menuitem', { name: /API Key/ }));

			await waitFor(() => {
				expect(emitted('update:authType')).toHaveLength(1);
				expect(emitted('update:authType')[0]).toEqual([{ type: 'apiKey' }]);
			});
		});
	});

	describe('managed OAuth options', () => {
		it('should split OAuth option into managed and custom when showManagedOauthOptions is true', () => {
			const pinia = setupStores({
				nodeType: twoAuthNodeType,
				node: makeNode('n8n-nodes-base.dropbox', 'oAuth2'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
				},
			});

			renderComponent({
				pinia,
				props: {
					credentialType: dropboxOAuth2ApiType,
					showManagedOauthOptions: true,
					useCustomOauth: false,
				},
			});

			// With managed OAuth, the OAuth2 option splits into managed+custom,
			// plus the Access Token option = 3 total, so dropdown should appear
			expect(screen.getByTestId('credential-mode-selector')).toBeInTheDocument();
			expect(screen.getByTestId('credential-mode-dropdown-trigger')).toBeInTheDocument();
			expect(screen.queryByTestId('credential-mode-switch-link')).not.toBeInTheDocument();
			expect(screen.getByText('Setup credential')).toBeInTheDocument();
		});

		it('should emit update:authType with customOauth when switching from managed to custom OAuth', async () => {
			const pinia = setupStores({
				nodeType: twoAuthNodeType,
				node: makeNode('n8n-nodes-base.dropbox', 'oAuth2'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
				},
			});

			const { emitted } = renderComponent({
				pinia,
				props: {
					credentialType: dropboxOAuth2ApiType,
					showManagedOauthOptions: true,
					useCustomOauth: false,
				},
			});

			await userEvent.click(screen.getByTestId('credential-mode-dropdown-trigger'));

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			await userEvent.click(screen.getByRole('menuitem', { name: /Custom OAuth2/ }));

			await waitFor(() => {
				expect(emitted('update:authType')).toHaveLength(1);
				expect(emitted('update:authType')[0]).toEqual([{ type: 'oAuth2', customOauth: true }]);
			});
		});

		it('should emit update:authType with customOauth when switching from custom to managed OAuth', async () => {
			const pinia = setupStores({
				nodeType: twoAuthNodeType,
				node: makeNode('n8n-nodes-base.dropbox', 'oAuth2'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
				},
			});

			const { emitted } = renderComponent({
				pinia,
				props: {
					credentialType: dropboxOAuth2ApiType,
					showManagedOauthOptions: true,
					useCustomOauth: true,
				},
			});

			await userEvent.click(screen.getByTestId('credential-mode-dropdown-trigger'));

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			await userEvent.click(screen.getByRole('menuitem', { name: /Managed OAuth2/ }));

			await waitFor(() => {
				expect(emitted('update:authType')).toHaveLength(1);
				expect(emitted('update:authType')[0]).toEqual([{ type: 'oAuth2', customOauth: false }]);
			});
		});

		it('should emit update:authType when switching from OAuth to a different auth type via dropdown', async () => {
			const pinia = setupStores({
				nodeType: twoAuthNodeType,
				node: makeNode('n8n-nodes-base.dropbox', 'oAuth2'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
				},
			});

			const { emitted } = renderComponent({
				pinia,
				props: {
					credentialType: dropboxOAuth2ApiType,
					showManagedOauthOptions: true,
					useCustomOauth: false,
				},
			});

			await userEvent.click(screen.getByTestId('credential-mode-dropdown-trigger'));

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			await userEvent.click(screen.getByRole('menuitem', { name: /Access Token/ }));

			await waitFor(() => {
				expect(emitted('update:authType')).toHaveLength(1);
				expect(emitted('update:authType')[0]).toEqual([{ type: 'accessToken' }]);
			});
		});
	});

	describe('quick connect options', () => {
		// Single-credential node (no authentication parameter)
		const singleCredApiType: ICredentialType = {
			name: 'firecrawlApi',
			displayName: 'Firecrawl API',
			properties: [
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					default: '',
				},
			],
		};

		const singleCredNodeType = {
			displayName: 'Firecrawl',
			name: 'n8n-nodes-base.firecrawl',
			group: ['input'],
			version: 1,
			description: 'Crawl with Firecrawl',
			defaults: { name: 'Firecrawl' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'firecrawlApi',
					required: true,
				},
			],
			properties: [],
		} as unknown as INodeTypeDescription;

		it('should show "Use quick connect" link in manual mode and emit quickConnectEnabled on click', async () => {
			const pinia = setupStores({
				nodeType: singleCredNodeType,
				node: makeNode('n8n-nodes-base.firecrawl', ''),
				credentialTypes: { firecrawlApi: singleCredApiType },
			});

			const { emitted } = renderComponent({
				pinia,
				props: {
					credentialType: singleCredApiType,
					quickConnectAvailable: true,
					isQuickConnectMode: false,
				},
			});

			const link = screen.getByTestId('credential-mode-switch-link');
			expect(link).toHaveTextContent('Use quick connect');
			expect(screen.queryByTestId('credential-mode-dropdown-trigger')).not.toBeInTheDocument();

			await userEvent.click(link);

			expect(emitted('update:authType')).toHaveLength(1);
			expect(emitted('update:authType')[0]).toEqual([{ type: '', quickConnectEnabled: true }]);
		});

		it('should show "Set up manually" link in QC mode and emit manual fallback on click', async () => {
			const pinia = setupStores({
				nodeType: singleCredNodeType,
				node: makeNode('n8n-nodes-base.firecrawl', ''),
				credentialTypes: { firecrawlApi: singleCredApiType },
			});

			const { emitted } = renderComponent({
				pinia,
				props: {
					credentialType: singleCredApiType,
					quickConnectAvailable: true,
					isQuickConnectMode: true,
				},
			});

			const link = screen.getByTestId('credential-mode-switch-link');
			expect(link).toHaveTextContent('Set up manually');

			await userEvent.click(link);

			expect(emitted('update:authType')).toHaveLength(1);
			expect(emitted('update:authType')[0]).toEqual([{ type: '' }]);
		});

		it('should not show selector when quickConnectAvailable is false for single-cred nodes', () => {
			const pinia = setupStores({
				nodeType: singleCredNodeType,
				node: makeNode('n8n-nodes-base.firecrawl', ''),
				credentialTypes: { firecrawlApi: singleCredApiType },
			});

			renderComponent({
				pinia,
				props: {
					credentialType: singleCredApiType,
					quickConnectAvailable: false,
				},
			});

			expect(screen.queryByTestId('credential-mode-selector')).not.toBeInTheDocument();
		});

		it('should show dropdown when QC + multi-auth node (3+ options)', () => {
			const pinia = setupStores({
				nodeType: twoAuthNodeType,
				node: makeNode('n8n-nodes-base.dropbox', 'accessToken'),
				credentialTypes: {
					dropboxApi: dropboxApiType,
					dropboxOAuth2Api: dropboxOAuth2ApiType,
				},
			});

			renderComponent({
				pinia,
				props: {
					credentialType: dropboxApiType,
					quickConnectAvailable: true,
					isQuickConnectMode: false,
				},
			});

			// QC + Access Token + OAuth2 = 3 options → dropdown
			expect(screen.getByTestId('credential-mode-selector')).toBeInTheDocument();
			expect(screen.getByTestId('credential-mode-dropdown-trigger')).toBeInTheDocument();
			expect(screen.queryByTestId('credential-mode-switch-link')).not.toBeInTheDocument();
		});
	});

	describe('credential not linked to main auth field', () => {
		const httpBasicAuthType: ICredentialType = {
			name: 'httpBasicAuth',
			displayName: 'Basic Auth',
			properties: [
				{ displayName: 'User', name: 'user', type: 'string', default: '' },
				{ displayName: 'Password', name: 'password', type: 'string', default: '' },
			],
		};

		// Simulates Pipedrive Trigger: main auth field is "authentication",
		// but httpBasicAuth is gated by a different field "incomingAuthentication"
		const nodeWithSecondaryCredential = {
			displayName: 'Pipedrive Trigger',
			name: 'n8n-nodes-base.pipedriveTrigger',
			group: ['trigger'],
			version: 1,
			description: 'Trigger on Pipedrive events',
			defaults: { name: 'Pipedrive Trigger' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'pipedriveApi',
					required: true,
					displayOptions: { show: { authentication: ['apiToken'] } },
				},
				{
					name: 'pipedriveOAuth2Api',
					required: true,
					displayOptions: { show: { authentication: ['oAuth2'] } },
				},
				{
					name: 'httpBasicAuth',
					required: true,
					displayOptions: { show: { incomingAuthentication: ['basicAuth'] } },
				},
			],
			properties: [
				{
					displayName: 'Authentication',
					name: 'authentication',
					type: 'options',
					options: [
						{ name: 'API Token', value: 'apiToken' },
						{ name: 'OAuth2', value: 'oAuth2' },
					],
					default: 'apiToken',
				},
				{
					displayName: 'Incoming Authentication',
					name: 'incomingAuthentication',
					type: 'options',
					options: [
						{ name: 'None', value: 'none' },
						{ name: 'Basic Auth', value: 'basicAuth' },
					],
					default: 'none',
				},
			],
		} as unknown as INodeTypeDescription;

		it('should not show selector for credentials controlled by a different auth field', () => {
			const pinia = setupStores({
				nodeType: nodeWithSecondaryCredential,
				node: {
					parameters: { authentication: 'apiToken', incomingAuthentication: 'basicAuth' },
					type: 'n8n-nodes-base.pipedriveTrigger',
					typeVersion: 1,
					position: [0, 0],
					id: 'test-node-id',
					name: 'Test Node',
					credentials: {},
				},
				credentialTypes: { httpBasicAuth: httpBasicAuthType },
			});

			renderComponent({
				pinia,
				props: { credentialType: httpBasicAuthType },
			});

			expect(screen.queryByTestId('credential-mode-selector')).not.toBeInTheDocument();
		});
	});
});
