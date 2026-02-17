import { describe, it, vi } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import NodeCredentials from './NodeCredentials.vue';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '../credentials.store';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { FrontendSettings } from '@n8n/api-types';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

const httpNode: INodeUi = {
	parameters: {
		curlImport: '',
		method: 'GET',
		url: '',
		authentication: 'predefinedCredentialType',
		nodeCredentialType: 'openAiApi',
		provideSslCertificates: false,
		sendQuery: false,
		sendHeaders: false,
		sendBody: false,
		options: {},
		infoMessage: '',
	},
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	position: [-200, -160],
	id: '416988b5-e994-42c7-8576-6ef28a7619b2',
	name: 'HTTP Request',
	credentials: { openAiApi: { id: 'c8vqdPpPClh4TgIO', name: 'OpenAi account 2' } },
	issues: { parameters: { url: ['Parameter "URL" is required.'] } },
};

const openAiNode: INodeUi = {
	parameters: {
		resource: 'text',
		operation: 'message',
		modelId: { __rl: true, mode: 'list', value: '' },
		messages: { values: [{ content: '', role: 'user' }] },
		simplify: true,
		jsonOutput: false,
		options: {},
	},
	type: '@n8n/n8n-nodes-langchain.openAi',
	typeVersion: 1.8,
	position: [440, 0],
	id: '17241295-a277-4cdf-8c46-6c3f85b335e9',
	name: 'OpenAI',
	credentials: { openAiApi: { id: 'byDFnd7vN5GzMVD2', name: 'n8n free OpenAI API credits' } },
	issues: { parameters: { modelId: ['Parameter "Model" is required.'] } },
};

const openAiNodeNoCreds: INodeUi = {
	...openAiNode,
	id: '54b41295-a277-4cdf-8c46-6c3f85b335e9',
	name: 'OpenAI no creds',
	credentials: {},
};

const openAiNodeNoCreds2: INodeUi = {
	...openAiNode,
	id: '74b41295-a277-4cdf-8c46-6c3f85b335e9',
	name: 'OpenAI no creds 2',
	credentials: {},
};

function createCredential(
	overrides: Partial<{
		id: string;
		name: string;
		type: string;
		isManaged: boolean;
		isResolvable: boolean;
	}> = {},
) {
	return {
		id: 'c8vqdPpPClh4TgIO',
		name: 'OpenAi account',
		type: 'openAiApi',
		isManaged: false,
		createdAt: '',
		updatedAt: '',
		...overrides,
	};
}

describe('NodeCredentials', () => {
	const defaultRenderOptions: RenderOptions<typeof NodeCredentials> = {
		pinia: createTestingPinia({ stubActions: false }),
		props: {
			overrideCredType: 'openAiApi',
			node: httpNode,
			readonly: false,
			showAll: false,
			hideIssues: false,
		},
	};

	const renderComponent = createComponentRenderer(NodeCredentials, defaultRenderOptions);

	const credentialsStore = mockedStore(useCredentialsStore);
	const ndvStore = mockedStore(useNDVStore);
	const uiStore = mockedStore(useUIStore);
	const projectsStore = mockedStore(useProjectsStore);
	const settingsStore = mockedStore(useSettingsStore);
	const workflowsStore = mockedStore(useWorkflowsStore);
	const posthogStore = mockedStore(usePostHog);

	projectsStore.currentProject = { id: 'default', scopes: ['credential:create'] } as Project;
	settingsStore.settings = {
		envFeatureFlags: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
		},
		activeModules: ['dynamic-credentials'],
	} as unknown as FrontendSettings;
	vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

	beforeAll(() => {
		credentialsStore.state.credentialTypes = {
			openAiApi: {
				name: 'openAiApi',
				displayName: 'OpenAi',
				documentationUrl: 'openAi',
				properties: [
					{
						displayName: 'API Key',
						name: 'apiKey',
						type: 'string',
						typeOptions: { password: true },
						required: true,
						default: '',
					},
				],
				authenticate: {
					type: 'generic',
					properties: {
						headers: {
							Authorization: '=Bearer {{$credentials.apiKey}}',
							'OpenAI-Organization': '={{$credentials.organizationId}}',
						},
					},
				},
				test: { request: { baseURL: '={{$credentials?.url}}', url: '/models' } },
				supportedNodes: ['openAi'],
				iconUrl: {
					light: 'icons/n8n-nodes-base/dist/nodes/OpenAi/openAi.svg',
					dark: 'icons/n8n-nodes-base/dist/nodes/OpenAi/openAi.dark.svg',
				},
			},
		};
	});

	it('should display available credentials in the dropdown', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
		};

		renderComponent();

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
	});

	it('should ignore managed credentials in the dropdown if active node is the HTTP node', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
			SkXM3oUkQvvYS31c: createCredential({
				id: 'SkXM3oUkQvvYS31c',
				name: 'OpenAi account 2',
				isManaged: true,
			}),
		};

		renderComponent();

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
		expect(screen.queryByText('OpenAi account 2')).not.toBeInTheDocument();
	});

	it('should not ignored managed credentials in the dropdown if active node is not the HTTP node', async () => {
		ndvStore.activeNode = openAiNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
			SkXM3oUkQvvYS31c: createCredential({
				id: 'SkXM3oUkQvvYS31c',
				name: 'OpenAi account 2',
				isManaged: true,
			}),
		};

		renderComponent(
			{
				props: {
					node: openAiNode,
				},
			},
			{ merge: true },
		);

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
		expect(screen.queryByText('OpenAi account 2')).toBeInTheDocument();
	});

	it('should filter available credentials in the dropdown', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
			test: createCredential({ id: 'test', name: 'Test OpenAi account' }),
		};

		renderComponent();

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
		expect(screen.queryByText('Test OpenAi account')).toBeInTheDocument();

		const credentialSearch = credentialsSelect.querySelector('input') as HTMLElement;
		await userEvent.type(credentialSearch, 'test');

		expect(screen.queryByText('OpenAi account')).not.toBeInTheDocument();
		expect(screen.queryByText('Test OpenAi account')).toBeInTheDocument();

		await userEvent.keyboard('{Escape}');

		await userEvent.click(credentialsSelect);

		await userEvent.type(credentialSearch, 'Test');

		expect(screen.queryByText('OpenAi account')).not.toBeInTheDocument();
		expect(screen.queryByText('Test OpenAi account')).toBeInTheDocument();
	});

	it('should open the new credential modal when clicked', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
		};

		renderComponent();

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);
		await userEvent.click(screen.getByTestId('node-credentials-select-item-new'));

		expect(uiStore.openNewCredential).toHaveBeenCalledWith('openAiApi', true);
	});

	describe('onCredentialSelected', () => {
		const renderComponentNoCreds = createComponentRenderer(NodeCredentials, {
			...defaultRenderOptions,
			props: {
				...defaultRenderOptions.props,
				node: openAiNodeNoCreds,
			},
		});

		it('should not call assignCredentialToMatchingNodes on mount when auto-selecting credentials', () => {
			ndvStore.activeNode = openAiNodeNoCreds;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: {
					id: 'c8vqdPpPClh4TgIO',
					name: 'OpenAi account',
					type: 'openAiApi',
					isManaged: false,
					createdAt: '',
					updatedAt: '',
				},
			};

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.allNodes = [openAiNodeNoCreds, openAiNodeNoCreds2];

			renderComponentNoCreds();

			expect(workflowsStore.assignCredentialToMatchingNodes).not.toHaveBeenCalled();
		});

		it('should call assignCredentialToMatchingNodes after selecting credentials', async () => {
			ndvStore.activeNode = openAiNodeNoCreds;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
			};

			workflowsStore.allNodes = [openAiNodeNoCreds, openAiNodeNoCreds2];

			renderComponentNoCreds();

			const credentialsSelect = screen.getByTestId('node-credentials-select');

			await userEvent.click(credentialsSelect);

			const openAiCreds = screen.queryByText('OpenAi account');
			expect(openAiCreds).toBeInTheDocument();

			await userEvent.click(openAiCreds!);

			expect(workflowsStore.assignCredentialToMatchingNodes).toHaveBeenCalledWith({
				credentials: {
					id: 'c8vqdPpPClh4TgIO',
					name: 'OpenAi account',
				},
				currentNodeName: 'OpenAI no creds',
				type: 'openAiApi',
			});
		});
	});

	describe('resolvable credentials', () => {
		const resolvableCredential = createCredential({
			name: 'OpenAi account 2',
			isResolvable: true,
		});

		it('should show dynamic icon in dropdown for resolvable credentials', async () => {
			ndvStore.activeNode = httpNode;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential({ isResolvable: true }),
			};

			renderComponent();

			const credentialsSelect = screen.getByTestId('node-credentials-select');

			await userEvent.click(credentialsSelect);

			expect(screen.queryByTestId('credential-option-dynamic-icon')).toBeInTheDocument();
		});

		it('should not show dynamic icon in dropdown for non-resolvable credentials', async () => {
			ndvStore.activeNode = httpNode;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential({ isResolvable: false }),
			};

			renderComponent();

			const credentialsSelect = screen.getByTestId('node-credentials-select');

			await userEvent.click(credentialsSelect);

			expect(screen.queryByTestId('credential-option-dynamic-icon')).not.toBeInTheDocument();
		});

		function setupResolvableCredential() {
			ndvStore.activeNode = httpNode;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: resolvableCredential,
			};
			// getCredentialById is a computed getter stubbed by createTestingPinia;
			// override it to return the resolvable credential for the selected id
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(resolvableCredential);
		}

		it('should show dynamic indicator next to selected resolvable credential', async () => {
			setupResolvableCredential();

			renderComponent();

			expect(screen.queryByTestId('node-credential-dynamic-icon')).toBeInTheDocument();
		});

		it('should show warning when resolvable credential selected but workflow has no resolver', async () => {
			setupResolvableCredential();
			workflowsStore.workflowSettings = { executionOrder: 'v1' };

			renderComponent();

			expect(screen.queryByTestId('node-credential-resolver-warning')).toBeInTheDocument();
		});

		it('should not show warning when resolvable credential selected and workflow has resolver', async () => {
			setupResolvableCredential();
			workflowsStore.workflowSettings = {
				executionOrder: 'v1',
				credentialResolverId: 'resolver-123',
			};

			renderComponent();

			expect(screen.queryByTestId('node-credential-resolver-warning')).not.toBeInTheDocument();
		});
	});

	describe('quick connect', () => {
		const oAuth2ApiType: ICredentialType = {
			name: 'oAuth2Api',
			displayName: 'OAuth2 API',
			properties: [
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
					default: '',
					required: true,
				},
			],
		};

		const slackOAuth2ApiType: ICredentialType = {
			name: 'slackOAuth2Api',
			extends: ['oAuth2Api'],
			displayName: 'Slack OAuth2 API',
			properties: [
				{
					displayName: 'Client ID',
					name: 'clientId',
					type: 'string',
					default: '',
					required: true,
				},
			],
			__overwrittenProperties: ['clientId'],
		};

		const slackNode: INodeUi = {
			parameters: {},
			type: 'n8n-nodes-base.slack',
			typeVersion: 2,
			position: [0, 0],
			id: 'slack-node-id',
			name: 'Slack',
			credentials: {},
		};

		function setupQuickConnectStores(opts: { experimentEnabled: boolean }) {
			vi.spyOn(posthogStore, 'isVariantEnabled').mockReturnValue(opts.experimentEnabled);

			settingsStore.settings = {
				envFeatureFlags: {
					N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
				},
				moduleSettings: {},
			} as unknown as FrontendSettings;

			credentialsStore.state.credentialTypes = {
				...credentialsStore.state.credentialTypes,
				oAuth2Api: oAuth2ApiType,
				slackOAuth2Api: slackOAuth2ApiType,
			};
			credentialsStore.state.credentials = {};
		}

		it('should show quick-connect-empty-state when experiment enabled and managed OAuth', () => {
			setupQuickConnectStores({ experimentEnabled: true });

			ndvStore.activeNode = slackNode;

			renderComponent(
				{
					props: {
						node: slackNode,
						overrideCredType: 'slackOAuth2Api',
					},
				},
				{ merge: true },
			);

			expect(screen.queryByTestId('quick-connect-empty-state')).toBeInTheDocument();
			expect(screen.queryByTestId('standard-empty-state')).not.toBeInTheDocument();
			expect(screen.queryByTestId('node-credentials-select')).not.toBeInTheDocument();
		});

		it('should derive service name from credential displayName when no quick connect config', () => {
			setupQuickConnectStores({ experimentEnabled: true });

			ndvStore.activeNode = slackNode;

			renderComponent(
				{
					props: {
						node: slackNode,
						overrideCredType: 'slackOAuth2Api',
					},
				},
				{ merge: true },
			);

			// Should show "Connect to Slack" (derived from "Slack OAuth2 API" displayName)
			// not "Connect to " (empty service name)
			expect(screen.getByText('Connect to Slack')).toBeInTheDocument();
		});

		it('should show standard-empty-state when experiment enabled but non-OAuth type', () => {
			setupQuickConnectStores({ experimentEnabled: true });

			ndvStore.activeNode = openAiNodeNoCreds;

			renderComponent(
				{
					props: {
						node: openAiNodeNoCreds,
						overrideCredType: 'openAiApi',
					},
				},
				{ merge: true },
			);

			expect(screen.queryByTestId('standard-empty-state')).toBeInTheDocument();
			expect(screen.queryByTestId('quick-connect-empty-state')).not.toBeInTheDocument();
		});

		it('should show standard dropdown when experiment disabled', () => {
			setupQuickConnectStores({ experimentEnabled: false });

			ndvStore.activeNode = slackNode;

			renderComponent(
				{
					props: {
						node: slackNode,
						overrideCredType: 'slackOAuth2Api',
					},
				},
				{ merge: true },
			);

			// Neither quick connect nor standard empty state should show; dropdown should
			expect(screen.queryByTestId('quick-connect-empty-state')).not.toBeInTheDocument();
			expect(screen.queryByTestId('standard-empty-state')).not.toBeInTheDocument();
			expect(screen.queryByTestId('node-credentials-select')).toBeInTheDocument();
		});

		it('should show "setup manually" link in quick connect state', () => {
			setupQuickConnectStores({ experimentEnabled: true });

			ndvStore.activeNode = slackNode;

			renderComponent(
				{
					props: {
						node: slackNode,
						overrideCredType: 'slackOAuth2Api',
					},
				},
				{ merge: true },
			);

			expect(screen.queryByTestId('setup-manually-link')).toBeInTheDocument();
		});

		it('should open credential modal when "setup manually" is clicked', async () => {
			setupQuickConnectStores({ experimentEnabled: true });

			ndvStore.activeNode = slackNode;

			renderComponent(
				{
					props: {
						node: slackNode,
						overrideCredType: 'slackOAuth2Api',
					},
				},
				{ merge: true },
			);

			await userEvent.click(screen.getByTestId('setup-manually-link'));

			// createNewCredential calls openNewCredential with (type, showAuthOptions)
			// showMixedCredentials returns false for single-credential nodes
			expect(uiStore.openNewCredential).toHaveBeenCalledWith('slackOAuth2Api', expect.any(Boolean));
		});

		it('should show "Set up credential" button in standard empty state', () => {
			setupQuickConnectStores({ experimentEnabled: true });

			ndvStore.activeNode = openAiNodeNoCreds;

			renderComponent(
				{
					props: {
						node: openAiNodeNoCreds,
						overrideCredType: 'openAiApi',
					},
				},
				{ merge: true },
			);

			expect(screen.queryByTestId('setup-credential-button')).toBeInTheDocument();
		});

		it('should show quick connect when sibling credential type has managed OAuth', () => {
			setupQuickConnectStores({ experimentEnabled: true });

			const dropboxOAuth2ApiType: ICredentialType = {
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
				],
				__overwrittenProperties: ['clientId', 'clientSecret'],
			};

			credentialsStore.state.credentialTypes = {
				...credentialsStore.state.credentialTypes,
				dropboxOAuth2Api: dropboxOAuth2ApiType,
			};

			const nodeTypesStore = mockedStore(useNodeTypesStore);
			nodeTypesStore.setNodeTypes([
				{
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
				} as unknown as INodeTypeDescription,
			]);

			const dropboxNode: INodeUi = {
				parameters: { authentication: 'accessToken' },
				type: 'n8n-nodes-base.dropbox',
				typeVersion: 1,
				position: [0, 0],
				id: 'dropbox-node-id',
				name: 'Dropbox',
				credentials: {},
			};

			ndvStore.activeNode = dropboxNode;

			renderComponent(
				{
					props: {
						node: dropboxNode,
						overrideCredType: '',
					},
				},
				{ merge: true },
			);

			expect(screen.queryByTestId('quick-connect-empty-state')).toBeInTheDocument();
			expect(screen.getByText('Connect to Dropbox')).toBeInTheDocument();
		});

		it('should show standard dropdown when credential already exists', () => {
			setupQuickConnectStores({ experimentEnabled: true });

			const slackNodeWithCreds: INodeUi = {
				...slackNode,
				credentials: {
					slackOAuth2Api: { id: 'cred-1', name: 'Slack OAuth2' },
				},
			};

			ndvStore.activeNode = slackNodeWithCreds;
			credentialsStore.state.credentials = {
				'cred-1': createCredential({
					id: 'cred-1',
					name: 'Slack OAuth2',
					type: 'slackOAuth2Api',
				}),
			};

			renderComponent(
				{
					props: {
						node: slackNodeWithCreds,
						overrideCredType: 'slackOAuth2Api',
					},
				},
				{ merge: true },
			);

			// Should show the normal dropdown, not the empty states
			expect(screen.queryByTestId('quick-connect-empty-state')).not.toBeInTheDocument();
			expect(screen.queryByTestId('standard-empty-state')).not.toBeInTheDocument();
			expect(screen.queryByTestId('node-credentials-select')).toBeInTheDocument();
		});
	});
});
