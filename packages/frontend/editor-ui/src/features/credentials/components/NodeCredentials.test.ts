import { shallowRef, ref, computed } from 'vue';
import { describe, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { FrontendSettings } from '@n8n/api-types';
import NodeCredentials from './NodeCredentials.vue';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import { useCredentialsStore } from '../credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({
		isEnabled: ref(false),
		isCredentialTypeSupported: vi.fn(() => false),
		balance: computed(() => undefined),
		budget: computed(() => undefined),
		fetchConfig: vi.fn().mockResolvedValue(undefined),
		fetchWallet: vi.fn().mockResolvedValue(undefined),
		saveAfterToggle: vi.fn().mockResolvedValue(undefined),
	})),
}));

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

const openAiApiCredentialType = {
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
} satisfies ICredentialType;

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
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let ndvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
	let workflowDocumentStoreRef: ReturnType<
		typeof shallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>
	>;
	let renderComponent: ReturnType<typeof createComponentRenderer>;

	beforeEach(() => {
		vi.clearAllMocks();

		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('1'));
		workflowDocumentStoreRef = shallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>(
			workflowDocumentStore,
		);

		const defaultRenderOptions: RenderOptions<typeof NodeCredentials> = {
			pinia,
			props: {
				overrideCredType: 'openAiApi',
				node: httpNode,
				readonly: false,
				showAll: false,
				hideIssues: false,
			},
			global: {
				provide: {
					[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
				},
			},
		};

		renderComponent = createComponentRenderer(NodeCredentials, defaultRenderOptions);

		credentialsStore = mockedStore(useCredentialsStore);
		ndvStore = mockedStore(useNDVStore);
		uiStore = mockedStore(useUIStore);
		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);
		workflowsStore = mockedStore(useWorkflowsStore);

		projectsStore.currentProject = { id: 'default', scopes: ['credential:create'] } as Project;
		settingsStore.settings = {
			envFeatureFlags: {
				N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
			},
			activeModules: ['dynamic-credentials'],
		} as unknown as FrontendSettings;
		vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

		credentialsStore.state.credentialTypes = {
			openAiApi: openAiApiCredentialType,
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

	it('should open the new credential modal when clicked', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
		};

		renderComponent();

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);
		await userEvent.click(screen.getByTestId('node-credentials-select-item-new'));

		expect(uiStore.openNewCredential).toHaveBeenCalledWith(
			'openAiApi',
			false,
			false,
			undefined,
			undefined,
		);
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

	it('should render the dropdown with saved credentials when node has a mismatched credentials object', async () => {
		const anthropicApiCredentialType: ICredentialType = {
			name: 'anthropicApi',
			displayName: 'Anthropic',
			documentationUrl: 'anthropic',
			properties: [
				{ displayName: 'API Key', name: 'apiKey', type: 'string', required: true, default: '' },
			],
		};

		const mismatchedNode: INodeUi = {
			...httpNode,
			parameters: {
				...httpNode.parameters,
				authentication: 'predefinedCredentialType',
				nodeCredentialType: 'anthropicApi',
			},
			credentials: { httpHeaderAuth: { id: 'header-auth-id', name: 'Header Auth' } },
		};

		credentialsStore.state.credentialTypes = {
			...credentialsStore.state.credentialTypes,
			anthropicApi: anthropicApiCredentialType,
		};
		credentialsStore.state.credentials = {
			'anthropic-cred-id': createCredential({
				id: 'anthropic-cred-id',
				name: 'My Anthropic account',
				type: 'anthropicApi',
			}),
		};

		ndvStore.activeNode = mismatchedNode;

		renderComponent(
			{
				props: {
					node: mismatchedNode,
					overrideCredType: 'anthropicApi',
				},
			},
			{ merge: true },
		);

		expect(screen.queryByTestId('node-credentials-empty-state')).not.toBeInTheDocument();
		expect(screen.queryByTestId('node-credentials-select')).toBeInTheDocument();

		await userEvent.click(screen.getByTestId('node-credentials-select'));

		expect(screen.queryByText('My Anthropic account')).toBeInTheDocument();
	});

	it('should not ignored managed credentials in the dropdown if active node is not the HTTP node', async () => {
		ndvStore.activeNode = openAiNode;
		credentialsStore.state.credentials = {
			byDFnd7vN5GzMVD2: createCredential({
				id: 'byDFnd7vN5GzMVD2',
				name: 'n8n free OpenAI API credits',
			}),
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

		expect(screen.queryByText('n8n free OpenAI API credits')).toBeInTheDocument();
		expect(screen.queryByText('OpenAi account 2')).toBeInTheDocument();
	});

	describe('onCredentialSelected', () => {
		it('should not call assignCredentialToMatchingNodes on mount when auto-selecting credentials', () => {
			ndvStore.activeNode = openAiNodeNoCreds;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
			};

			workflowsStore.allNodes = [openAiNodeNoCreds, openAiNodeNoCreds2];

			renderComponent(
				{
					props: {
						node: openAiNodeNoCreds,
					},
				},
				{ merge: true },
			);

			expect(workflowsStore.assignCredentialToMatchingNodes).not.toHaveBeenCalled();
		});

		it('should call assignCredentialToMatchingNodes after selecting credentials', async () => {
			// Start with a credential already assigned so the dropdown renders
			const openAiNodeWithCred: INodeUi = {
				...openAiNodeNoCreds,
				credentials: { openAiApi: { id: 'c8vqdPpPClh4TgIO', name: 'OpenAi account' } },
			};

			ndvStore.activeNode = openAiNodeWithCred;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
				secondCred: createCredential({ id: 'secondCred', name: 'OpenAi account 2' }),
			};

			workflowsStore.allNodes = [openAiNodeWithCred, openAiNodeNoCreds2];

			renderComponent(
				{
					props: {
						node: openAiNodeWithCred,
					},
				},
				{ merge: true },
			);

			const credentialsSelect = screen.getByTestId('node-credentials-select');

			await userEvent.click(credentialsSelect);

			const openAiCreds = screen.queryByText('OpenAi account 2');
			expect(openAiCreds).toBeInTheDocument();

			await userEvent.click(openAiCreds!);

			expect(workflowsStore.assignCredentialToMatchingNodes).toHaveBeenCalledWith({
				credentials: {
					id: 'secondCred',
					name: 'OpenAi account 2',
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
			workflowDocumentStore.setSettings({ executionOrder: 'v1' });

			renderComponent();

			expect(screen.queryByTestId('node-credential-resolver-warning')).toBeInTheDocument();
		});

		it('should not show warning when resolvable credential selected and workflow has resolver', async () => {
			setupResolvableCredential();
			workflowDocumentStore.setSettings({
				executionOrder: 'v1',
				credentialResolverId: 'resolver-123',
			});

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

		function setupQuickConnectStores() {
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

		it('should show quick-connect-empty-state when managed OAuth credential has no credentials', () => {
			setupQuickConnectStores();

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
			expect(screen.queryByTestId('node-credentials-empty-state')).not.toBeInTheDocument();
			expect(screen.queryByTestId('node-credentials-select')).not.toBeInTheDocument();
		});

		it('should derive service name from credential displayName when no quick connect config', () => {
			setupQuickConnectStores();

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

		it('should show node-credentials-empty-state for non-OAuth type with no credentials', () => {
			setupQuickConnectStores();

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

			expect(screen.queryByTestId('node-credentials-empty-state')).toBeInTheDocument();
			expect(screen.queryByTestId('quick-connect-empty-state')).not.toBeInTheDocument();
		});

		it('should show "setup manually" link in quick connect state', () => {
			setupQuickConnectStores();

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
			setupQuickConnectStores();

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

			// createNewCredential calls openNewCredential with (type, showAuthOptions, forceManualMode, projectId)
			// "setup manually" passes forceManualMode=true
			expect(uiStore.openNewCredential).toHaveBeenCalledWith(
				'slackOAuth2Api',
				expect.any(Boolean),
				true,
				undefined,
				undefined,
			);
		});

		it('should show "Set up credential" button in standard empty state', () => {
			setupQuickConnectStores();

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
			setupQuickConnectStores();

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
			setupQuickConnectStores();

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
			expect(screen.queryByTestId('node-credentials-empty-state')).not.toBeInTheDocument();
			expect(screen.queryByTestId('node-credentials-select')).toBeInTheDocument();
		});
	});

	describe('edit credential button', () => {
		it('should show the edit button when a valid credential is selected', () => {
			ndvStore.activeNode = httpNode;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
			};

			renderComponent();

			expect(screen.queryByTestId('credential-edit-button')).toBeInTheDocument();
		});
	});

	it('should not show "Set up credential" button when user cannot create credentials', () => {
		projectsStore.currentProject = { id: 'default', scopes: [] } as unknown as Project;
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

		expect(screen.queryByTestId('setup-credential-button')).not.toBeInTheDocument();
	});

	it('should clear stale AI Gateway managed credentials on mount when gateway is disabled', () => {
		// Default useAiGateway mock has isEnabled: computed(() => false)
		const nodeWithGatewayManaged: INodeUi = {
			...httpNode,
			credentials: {
				openAiApi: { id: null, name: '', __aiGatewayManaged: true },
			},
		};
		ndvStore.activeNode = nodeWithGatewayManaged;

		const { emitted } = renderComponent({
			props: {
				overrideCredType: 'openAiApi',
				node: nodeWithGatewayManaged,
				readonly: false,
				showAll: false,
				hideIssues: false,
			},
			global: {
				provide: {
					[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
				},
			},
		});

		expect(emitted('credentialSelected')).toBeTruthy();
		const payload = ((emitted('credentialSelected')[0] as unknown[]) ?? [])[0] as {
			name: string;
			properties: { credentials: Record<string, unknown> };
		};
		expect(payload.name).toBe(nodeWithGatewayManaged.name);
		expect(payload.properties.credentials['openAiApi']).toBeUndefined();
	});

	describe('skipAutoSelect', () => {
		it('should not auto-select credentials on mount when skipAutoSelect is true', () => {
			ndvStore.activeNode = openAiNodeNoCreds;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
			};

			const { emitted } = renderComponent(
				{
					props: {
						node: openAiNodeNoCreds,
						skipAutoSelect: true,
					},
				},
				{ merge: true },
			);

			expect(emitted('credentialSelected')).toBeFalsy();
		});
	});

	describe('AI Gateway toggle (onAiGatewaySelector)', () => {
		const googlePalmApiCredType: ICredentialType = {
			name: 'googlePalmApi',
			displayName: 'Google PaLM API',
			properties: [{ displayName: 'API Key', name: 'apiKey', type: 'string', default: '' }],
		};

		const googleAiNodeType: INodeTypeDescription = {
			displayName: 'Google AI',
			name: 'googleAi',
			group: ['transform'],
			version: 1,
			description: '',
			defaults: { name: 'Google AI' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [{ name: 'googlePalmApi', required: true }],
			properties: [],
		};

		const googleAiNode: INodeUi = {
			id: 'node-google-ai',
			name: 'Google AI',
			type: 'googleAi',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: {},
		};

		beforeEach(() => {
			// Enable AI Gateway for this describe block
			vi.mocked(useAiGateway).mockReturnValue({
				isEnabled: computed(() => true),
				isCredentialTypeSupported: vi.fn((credType: string) => credType === 'googlePalmApi'),
				balance: computed(() => undefined),
				budget: computed(() => undefined),
				fetchConfig: vi.fn().mockResolvedValue(undefined),
				fetchWallet: vi.fn().mockResolvedValue(undefined),
				saveAfterToggle: vi.fn().mockResolvedValue(undefined),
				fetchError: computed(() => null),
			});

			const nodeTypesStore = mockedStore(useNodeTypesStore);
			nodeTypesStore.setNodeTypes([googleAiNodeType]);

			credentialsStore.state.credentialTypes = { googlePalmApi: googlePalmApiCredType };
		});

		const aiGatewayToggleStub = {
			template: '<div data-test-id="ai-gateway-toggle" />',
			props: ['aiGatewayEnabled', 'readonly'],
			emits: ['toggle'],
		};

		describe('rendering', () => {
			it('should show the toggle and the credential selector when gateway is supported but not managed', () => {
				const existingCred = {
					id: 'cred-1',
					name: 'My Google Key',
					type: 'googlePalmApi',
					isManaged: false,
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
				};
				credentialsStore.state.credentials = { 'cred-1': existingCred };
				credentialsStore.getCredentialById = vi.fn().mockReturnValue(existingCred);

				const nodeWithCred: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: 'cred-1', name: 'My Google Key' } },
				};
				ndvStore.activeNode = nodeWithCred;

				renderComponent({
					props: { node: nodeWithCred, overrideCredType: 'googlePalmApi' },
					global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
				});

				// Both the toggle and the credential dropdown should be visible
				expect(screen.getByTestId('ai-gateway-toggle')).toBeInTheDocument();
				expect(screen.getByTestId('node-credentials-select')).toBeInTheDocument();
			});

			it('should show the toggle but hide the credential selector when gateway is managed', () => {
				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;

				renderComponent({
					props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' },
					global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
				});

				expect(screen.getByTestId('ai-gateway-toggle')).toBeInTheDocument();
				expect(screen.queryByTestId('node-credentials-select')).not.toBeInTheDocument();
			});

			it('should show the toggle when gateway is managed but config has not loaded yet', () => {
				// Simulates the case where the AI gateway backend is unreachable and fetchConfig
				// fails, leaving isCredentialTypeSupported returning false. The toggle must still
				// appear so the user can disable AI gateway on existing nodes.
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					fetchError: computed(() => null),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
				});

				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;

				renderComponent({
					props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' },
					global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
				});

				expect(screen.getByTestId('ai-gateway-toggle')).toBeInTheDocument();
				expect(screen.queryByTestId('node-credentials-select')).not.toBeInTheDocument();
			});

			it('should not show the toggle when gateway feature is disabled', () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => false),
					isCredentialTypeSupported: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					fetchError: computed(() => null),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
				});
				ndvStore.activeNode = googleAiNode;

				renderComponent({
					props: { node: googleAiNode, overrideCredType: 'googlePalmApi' },
					global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
				});

				expect(screen.queryByTestId('ai-gateway-toggle')).not.toBeInTheDocument();
			});

			it('should show the toggle in readonly mode when gateway is managed', () => {
				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;

				renderComponent({
					props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi', readonly: true },
					global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
				});

				expect(screen.getByTestId('ai-gateway-toggle')).toBeInTheDocument();
				// The readonly disabled input should not be shown for a managed credential
				expect(screen.queryByTestId('node-credentials-select')).not.toBeInTheDocument();
			});

			it('should show the readonly disabled input and the toggle when readonly and not managed', () => {
				const nodeWithCred: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: 'cred-1', name: 'My Google Key' } },
				};
				ndvStore.activeNode = nodeWithCred;

				renderComponent({
					props: { node: nodeWithCred, overrideCredType: 'googlePalmApi', readonly: true },
					global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
				});

				// Toggle is shown (disabled) so users can see the gateway is supported for this type
				expect(screen.getByTestId('ai-gateway-toggle')).toBeInTheDocument();
				expect(screen.getByTestId('node-credentials-select')).toBeInTheDocument();
			});
		});

		it('should emit credentialSelected with __aiGatewayManaged:true when toggled ON', async () => {
			ndvStore.activeNode = googleAiNode;

			const { emitted } = renderComponent({
				props: { node: googleAiNode, overrideCredType: 'googlePalmApi' },
				global: {
					stubs: {
						AiGatewaySelector: {
							template:
								'<button data-test-id="ai-gateway-toggle-on" @click="$emit(\'toggle\', true)" />',
							props: ['aiGatewayEnabled'],
							emits: ['toggle'],
						},
					},
				},
			});

			await userEvent.click(screen.getByTestId('ai-gateway-toggle-on'));

			expect(emitted('credentialSelected')).toBeTruthy();
			const payload = ((emitted('credentialSelected')[0] as unknown[]) ?? [])[0] as {
				name: string;
				properties: { credentials: Record<string, unknown> };
			};
			expect(payload.name).toBe(googleAiNode.name);
			expect(payload.properties.credentials['googlePalmApi']).toEqual({
				id: null,
				name: '',
				__aiGatewayManaged: true,
			});
		});

		it('should emit credentialSelected restoring credentials when toggled OFF with available credentials', async () => {
			const existingCred = {
				id: 'cred-1',
				name: 'My Google Key',
				type: 'googlePalmApi',
				isManaged: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
			};
			credentialsStore.state.credentials = { 'cred-1': existingCred };
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(existingCred);

			const nodeWithGateway: INodeUi = {
				...googleAiNode,
				credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
			};
			ndvStore.activeNode = nodeWithGateway;

			const { emitted } = renderComponent({
				props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' },
				global: {
					stubs: {
						AiGatewaySelector: {
							template:
								'<button data-test-id="ai-gateway-toggle-off" @click="$emit(\'toggle\', false)" />',
							props: ['aiGatewayEnabled'],
							emits: ['toggle'],
						},
					},
				},
			});

			await userEvent.click(screen.getByTestId('ai-gateway-toggle-off'));

			expect(emitted('credentialSelected')).toBeTruthy();
			const payload = ((emitted('credentialSelected')[0] as unknown[]) ?? [])[0] as {
				name: string;
				properties: { credentials: Record<string, unknown> };
			};
			expect(payload.name).toBe(nodeWithGateway.name);
			// Should restore the real credential, not __aiGatewayManaged
			expect(
				(payload.properties.credentials['googlePalmApi'] as { __aiGatewayManaged?: boolean })
					.__aiGatewayManaged,
			).toBeUndefined();
			expect((payload.properties.credentials['googlePalmApi'] as { id: string }).id).toBe('cred-1');
		});

		it('should emit credentialSelected removing credentials when toggled OFF with no available credentials', async () => {
			credentialsStore.state.credentials = {};

			const nodeWithGateway: INodeUi = {
				...googleAiNode,
				credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
			};
			ndvStore.activeNode = nodeWithGateway;

			const { emitted } = renderComponent({
				props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' },
				global: {
					stubs: {
						AiGatewaySelector: {
							template:
								'<button data-test-id="ai-gateway-toggle-off" @click="$emit(\'toggle\', false)" />',
							props: ['aiGatewayEnabled'],
							emits: ['toggle'],
						},
					},
				},
			});

			await userEvent.click(screen.getByTestId('ai-gateway-toggle-off'));

			expect(emitted('credentialSelected')).toBeTruthy();
			const payload = ((emitted('credentialSelected')[0] as unknown[]) ?? [])[0] as {
				name: string;
				properties: { credentials: Record<string, unknown> };
			};
			// Credential should be removed
			expect(payload.properties.credentials['googlePalmApi']).toBeUndefined();
		});
	});
});
