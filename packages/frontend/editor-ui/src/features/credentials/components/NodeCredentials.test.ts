import { shallowRef, ref, computed, nextTick } from 'vue';
import { describe, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { SYSTEM_RESOLVER_ID } from '@n8n/api-types';
import type { FrontendSettings } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
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
import { useSettingsStore } from '@/app/stores/settings.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { ChatHubToolContextKey, WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

const trackMock = vi.hoisted(() => vi.fn());
const authorizeMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const n8nCreditsCredentialSelectionEnabled = vi.hoisted(() => ({ value: false }));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

// Keep the real composable (quick-connect tests need it); stub only `authorize`.
vi.mock('../composables/useCredentialOAuth', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../composables/useCredentialOAuth')>();
	return {
		useCredentialOAuth: () => ({
			...actual.useCredentialOAuth(),
			authorize: authorizeMock,
		}),
	};
});

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

vi.mock('@/experiments/n8nCreditsCredentialSelection', () => ({
	useN8nCreditsCredentialSelectionExperiment: vi.fn(() => ({
		isFeatureEnabled: n8nCreditsCredentialSelectionEnabled,
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
		scopes: Scope[];
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
		n8nCreditsCredentialSelectionEnabled.value = false;

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
		// Component triggers this on mount; avoid a real XHR with stubActions: false.
		credentialsStore.fetchAllCredentialsForWorkflow = vi.fn().mockResolvedValue([]);

		ndvStore = mockedStore(useNDVStore, createWorkflowDocumentId('1'));
		uiStore = mockedStore(useUIStore);
		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);
		workflowsStore = mockedStore(useWorkflowsStore);

		workflowsStore.isNewWorkflow = false;

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

	it('renders standalone when no active workflow document store is provided', () => {
		// Instance AI credential card: rendered standalone, outside a loaded
		// workflow document. The strict injectNDVStore() used to throw here on the
		// immediate parameters watch, tearing down the card (mount/unmount flicker).
		workflowDocumentStoreRef.value = null;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
		};

		expect(() =>
			renderComponent(
				{ props: { node: httpNode, overrideCredType: 'openAiApi', standalone: true } },
				{ merge: true },
			),
		).not.toThrow();

		expect(screen.getByTestId('node-credentials-select')).toBeInTheDocument();
	});

	it('should refresh credentials from the server when mounted on an existing node', () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {};

		renderComponent();

		expect(credentialsStore.fetchAllCredentialsForWorkflow).toHaveBeenCalledWith({
			workflowId: '1',
		});
	});

	it('should fetch credentials scoped to the project for an unsaved workflow', () => {
		workflowsStore.isNewWorkflow = true;
		projectsStore.currentProject = { id: 'project-1' } as Project;
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {};

		renderComponent();

		expect(credentialsStore.fetchAllCredentialsForWorkflow).toHaveBeenCalledWith({
			projectId: 'project-1',
		});
	});

	it('should fall back to the personal project for an unsaved workflow without a current project', () => {
		workflowsStore.isNewWorkflow = true;
		projectsStore.currentProject = null;
		projectsStore.personalProject = { id: 'personal-project' } as Project;
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {};

		renderComponent();

		expect(credentialsStore.fetchAllCredentialsForWorkflow).toHaveBeenCalledWith({
			projectId: 'personal-project',
		});
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
			httpNode.name,
			httpNode,
			{ hideAskAssistant: false, closeOnSave: true },
		);
	});

	it('should hide the assistant when opening credentials from a tool context', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
		};

		renderComponent({
			global: {
				provide: {
					[ChatHubToolContextKey as symbol]: true,
				},
			},
		});

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);
		await userEvent.click(screen.getByTestId('node-credentials-select-item-new'));

		expect(uiStore.openNewCredential).toHaveBeenCalledWith(
			'openAiApi',
			false,
			false,
			undefined,
			undefined,
			httpNode.name,
			httpNode,
			{ hideAskAssistant: true, closeOnSave: true },
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

			const assignSpy = vi.spyOn(workflowDocumentStore, 'assignCredentialToMatchingNodes');

			renderComponent(
				{
					props: {
						node: openAiNodeNoCreds,
					},
				},
				{ merge: true },
			);

			expect(assignSpy).not.toHaveBeenCalled();
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

			const assignSpy = vi.spyOn(workflowDocumentStore, 'assignCredentialToMatchingNodes');

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

			expect(assignSpy).toHaveBeenCalledWith({
				credentials: {
					id: 'secondCred',
					name: 'OpenAi account 2',
				},
				currentNodeName: 'OpenAI no creds',
				type: 'openAiApi',
			});
		});

		it("emits 'Node credential assigned' with source user and kind own on manual selection", async () => {
			const openAiNodeWithCred: INodeUi = {
				...openAiNodeNoCreds,
				credentials: { openAiApi: { id: 'c8vqdPpPClh4TgIO', name: 'OpenAi account' } },
			};
			ndvStore.activeNode = openAiNodeWithCred;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
				secondCred: createCredential({ id: 'secondCred', name: 'OpenAi account 2' }),
			};

			renderComponent({ props: { node: openAiNodeWithCred } }, { merge: true });

			await userEvent.click(screen.getByTestId('node-credentials-select'));
			await userEvent.click(screen.getByText('OpenAi account 2'));

			expect(trackMock).toHaveBeenCalledWith('Node credential assigned', {
				credential_type: 'openAiApi',
				node_type: openAiNodeWithCred.type,
				workflow_id: expect.any(String),
				credential_kind: 'own',
				source: 'user',
			});
		});
	});

	describe('resolvable credentials', () => {
		const resolvableCredential = createCredential({
			name: 'OpenAi account 2',
			isResolvable: true,
		});

		it('should show private badge in dropdown for resolvable credentials', async () => {
			ndvStore.activeNode = httpNode;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential({ isResolvable: true }),
			};

			renderComponent();

			const credentialsSelect = screen.getByTestId('node-credentials-select');

			await userEvent.click(credentialsSelect);

			expect(screen.queryByTestId('credential-option-private-badge')).toBeInTheDocument();
		});

		it('should not show private badge in dropdown for non-resolvable credentials', async () => {
			ndvStore.activeNode = httpNode;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential({ isResolvable: false }),
			};

			renderComponent();

			const credentialsSelect = screen.getByTestId('node-credentials-select');

			await userEvent.click(credentialsSelect);

			expect(screen.queryByTestId('credential-option-private-badge')).not.toBeInTheDocument();
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

		it('should show private indicator next to selected resolvable credential', async () => {
			setupResolvableCredential();

			renderComponent();

			expect(screen.queryByTestId('node-credential-private-icon')).toBeInTheDocument();
		});
	});

	describe('quick connect', () => {
		const oAuth2ApiType: ICredentialType = {
			name: 'oAuth2Api',
			displayName: 'OAuth2 API',
			properties: [
				{
					displayName: 'Use Dynamic Client Registration',
					name: 'useDynamicClientRegistration',
					type: 'hidden',
					default: false,
				},
				{
					displayName: 'Client ID',
					name: 'clientId',
					type: 'string',
					displayOptions: { show: { useDynamicClientRegistration: [false] } },
					default: '',
					required: true,
				},
				{
					displayName: 'Client Secret',
					name: 'clientSecret',
					type: 'string',
					displayOptions: { show: { useDynamicClientRegistration: [false] } },
					default: '',
					required: true,
				},
			],
		};

		const slackOAuth2ApiType: ICredentialType = {
			name: 'slackOAuth2Api',
			extends: ['oAuth2Api'],
			displayName: 'Slack OAuth2 API',
			properties: [],
			__overwrittenProperties: ['clientId', 'clientSecret'],
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

		it('should also show quick-connect-empty-state in standalone mode (NODE-5115)', () => {
			setupQuickConnectStores();

			ndvStore.activeNode = slackNode;

			renderComponent(
				{
					props: {
						node: slackNode,
						overrideCredType: 'slackOAuth2Api',
						standalone: true,
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

		it('should remove MCP from derived service name in quick connect CTA', () => {
			setupQuickConnectStores();

			const linearMcpOAuth2ApiType: ICredentialType = {
				name: 'linearMcpOAuth2Api',
				extends: ['oAuth2Api'],
				displayName: 'Linear MCP OAuth2 API',
				properties: [
					{
						displayName: 'Use Dynamic Client Registration',
						name: 'useDynamicClientRegistration',
						type: 'hidden',
						default: true,
					},
					{
						displayName: 'Server URL',
						name: 'serverUrl',
						type: 'hidden',
						default: 'https://mcp.linear.app/mcp',
					},
				],
			};

			const linearMcpNode: INodeUi = {
				parameters: {},
				type: 'n8n-nodes-base.linearMcp',
				typeVersion: 1,
				position: [0, 0],
				id: 'linear-mcp-node-id',
				name: 'Linear MCP',
				credentials: {},
			};

			credentialsStore.state.credentialTypes = {
				...credentialsStore.state.credentialTypes,
				linearMcpOAuth2Api: linearMcpOAuth2ApiType,
			};

			ndvStore.activeNode = linearMcpNode;

			renderComponent(
				{
					props: {
						node: linearMcpNode,
						overrideCredType: 'linearMcpOAuth2Api',
					},
				},
				{ merge: true },
			);

			expect(screen.getByText('Connect to Linear')).toBeInTheDocument();
			expect(screen.queryByText('Connect to Linear MCP')).not.toBeInTheDocument();
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

		it('should hide "setup manually" link when credential has no manual fields', () => {
			setupQuickConnectStores();

			const mcpOAuth2ApiType: ICredentialType = {
				name: 'mcpOAuth2Api',
				extends: ['oAuth2Api'],
				displayName: 'MCP OAuth2 API',
				properties: [
					{
						displayName: 'Use Dynamic Client Registration',
						name: 'useDynamicClientRegistration',
						type: 'hidden',
						default: true,
					},
				],
			};

			const mcpNode: INodeUi = {
				parameters: {},
				type: '@n8n/n8n-nodes-langchain.mcpClientTool',
				typeVersion: 1,
				position: [0, 0],
				id: 'mcp-node-id',
				name: 'Notion MCP',
				credentials: {},
			};

			credentialsStore.state.credentialTypes = {
				...credentialsStore.state.credentialTypes,
				mcpOAuth2Api: mcpOAuth2ApiType,
			};

			ndvStore.activeNode = mcpNode;

			renderComponent(
				{
					props: {
						node: mcpNode,
						overrideCredType: 'mcpOAuth2Api',
					},
				},
				{ merge: true },
			);

			expect(screen.queryByTestId('setup-manually-link')).not.toBeInTheDocument();
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

			// createNewCredential calls openNewCredential with context for auth-option resolution
			// "setup manually" passes forceManualMode=true
			expect(uiStore.openNewCredential).toHaveBeenCalledWith(
				'slackOAuth2Api',
				expect.any(Boolean),
				true,
				undefined,
				undefined,
				slackNode.name,
				expect.objectContaining({
					id: slackNode.id,
					name: slackNode.name,
					type: slackNode.type,
				}),
				{ hideAskAssistant: false, closeOnSave: true },
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
				isNodeTypeVersionSupported: vi.fn(() => true),
				isActionSupported: vi.fn(() => true),
				isActionOptionVisible: vi.fn(() => true),
				isNodePropertyHidden: vi.fn(() => false),
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
					isNodeTypeVersionSupported: vi.fn(() => true),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
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
					isNodeTypeVersionSupported: vi.fn(() => true),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
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

		describe('minNodeTypeVersion gate', () => {
			const versionedNodeType: INodeTypeDescription = {
				displayName: 'Some Node',
				name: 'some-package.SomeNode',
				group: ['transform'],
				version: 1,
				description: '',
				defaults: { name: 'Some Node' },
				inputs: [NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main],
				credentials: [{ name: 'someApi', required: true }],
				properties: [],
			};

			const someApiCredType: ICredentialType = {
				name: 'someApi',
				displayName: 'Some API',
				properties: [{ displayName: 'API Key', name: 'apiKey', type: 'string', default: '' }],
			};

			beforeEach(() => {
				const nodeTypesStore = mockedStore(useNodeTypesStore);
				nodeTypesStore.setNodeTypes([versionedNodeType]);
				credentialsStore.state.credentialTypes = { someApi: someApiCredType };
			});

			it('should hide AiGatewaySelector when typeVersion is below the minimum', () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn((credType: string) => credType === 'someApi'),
					isNodeTypeVersionSupported: vi.fn(() => false),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
					fetchError: computed(() => null),
				});

				const node: INodeUi = {
					id: 'node-some',
					name: 'Some Node',
					type: 'some-package.SomeNode',
					typeVersion: 1.0,
					position: [0, 0],
					parameters: {},
					credentials: {},
				};
				ndvStore.activeNode = node;

				renderComponent({
					props: { node, overrideCredType: 'someApi' },
					global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
				});

				expect(screen.queryByTestId('ai-gateway-toggle')).not.toBeInTheDocument();
			});

			it('should show AiGatewaySelector when typeVersion meets the minimum', () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn((credType: string) => credType === 'someApi'),
					isNodeTypeVersionSupported: vi.fn(() => true),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
					fetchError: computed(() => null),
				});

				const node: INodeUi = {
					id: 'node-some',
					name: 'Some Node',
					type: 'some-package.SomeNode',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: {},
					credentials: {},
				};
				ndvStore.activeNode = node;

				renderComponent({
					props: { node, overrideCredType: 'someApi' },
					global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
				});

				expect(screen.getByTestId('ai-gateway-toggle')).toBeInTheDocument();
			});

			it('should emit credentialSelected clearing __aiGatewayManaged when version gate fails on mount', () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn((credType: string) => credType === 'someApi'),
					isNodeTypeVersionSupported: vi.fn(() => false),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
					fetchError: computed(() => null),
				});

				const node: INodeUi = {
					id: 'node-some',
					name: 'Some Node',
					type: 'some-package.SomeNode',
					typeVersion: 1.0,
					position: [0, 0],
					parameters: {},
					credentials: { someApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = node;

				const { emitted } = renderComponent({
					props: { node, overrideCredType: 'someApi' },
					global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
				});

				expect(emitted('credentialSelected')).toBeTruthy();
				const payload = ((emitted('credentialSelected')[0] as unknown[]) ?? [])[0] as {
					properties: { credentials: Record<string, unknown> };
				};
				// No available credentials in store → entry is deleted, not restored
				expect(payload.properties.credentials['someApi']).toBeUndefined();
			});

			it('should not emit credentialSelected on mount when version gate fails but no managed credential exists', () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn((credType: string) => credType === 'someApi'),
					isNodeTypeVersionSupported: vi.fn(() => false),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
					fetchError: computed(() => null),
				});

				const node: INodeUi = {
					id: 'node-some',
					name: 'Some Node',
					type: 'some-package.SomeNode',
					typeVersion: 1.0,
					position: [0, 0],
					parameters: {},
					credentials: {},
				};
				ndvStore.activeNode = node;

				const { emitted } = renderComponent({
					props: { node, overrideCredType: 'someApi' },
					global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
				});

				expect(emitted('credentialSelected')).toBeFalsy();
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

		it('should auto-enable gateway credential on mount when the current action is supported', () => {
			credentialsStore.state.credentials = {};
			const nodeWithAction: INodeUi = {
				...googleAiNode,
				parameters: { resource: 'chat', operation: 'message' },
			};
			ndvStore.activeNode = nodeWithAction;

			const { emitted } = renderComponent({
				props: { node: nodeWithAction, overrideCredType: 'googlePalmApi' },
				global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
			});

			expect(emitted('credentialSelected')).toBeTruthy();
			const payload = ((emitted('credentialSelected')[0] as unknown[]) ?? [])[0] as {
				properties: { credentials: Record<string, unknown> };
			};
			expect(payload.properties.credentials['googlePalmApi']).toEqual({
				id: null,
				name: '',
				__aiGatewayManaged: true,
			});
		});

		it('should not auto-enable gateway credential when the credential selection experiment is enabled', () => {
			n8nCreditsCredentialSelectionEnabled.value = true;
			credentialsStore.state.credentials = {};
			const nodeWithAction: INodeUi = {
				...googleAiNode,
				parameters: { resource: 'chat', operation: 'message' },
			};
			ndvStore.activeNode = nodeWithAction;

			const { emitted } = renderComponent({
				props: { node: nodeWithAction, overrideCredType: 'googlePalmApi' },
				global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
			});

			expect(emitted('credentialSelected')).toBeFalsy();
		});

		it('should auto-select an own credential when one is available', () => {
			const ownCred = {
				id: 'cred-1',
				name: 'My Google Key',
				type: 'googlePalmApi',
				isManaged: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
			};
			credentialsStore.state.credentials = { 'cred-1': ownCred };
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(ownCred);

			const nodeWithoutCred: INodeUi = {
				...googleAiNode,
				credentials: {},
				parameters: { resource: 'chat', operation: 'message' },
			};
			ndvStore.activeNode = nodeWithoutCred;

			const { emitted } = renderComponent({
				props: { node: nodeWithoutCred, overrideCredType: 'googlePalmApi' },
				global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
			});

			expect(emitted('credentialSelected')).toBeTruthy();
			const payload = ((emitted('credentialSelected')[0] as unknown[]) ?? [])[0] as {
				properties: { credentials: Record<string, unknown> };
			};
			expect(payload.properties.credentials['googlePalmApi']).toEqual({
				id: 'cred-1',
				name: 'My Google Key',
			});
		});

		it('should not auto-enable gateway credential on mount when the current action is unsupported', () => {
			vi.mocked(useAiGateway).mockReturnValue({
				isEnabled: computed(() => true),
				isCredentialTypeSupported: vi.fn((credType: string) => credType === 'googlePalmApi'),
				isNodeTypeVersionSupported: vi.fn(() => true),
				isActionSupported: vi.fn(() => false),
				isActionOptionVisible: vi.fn(() => true),
				isNodePropertyHidden: vi.fn(() => false),
				balance: computed(() => undefined),
				budget: computed(() => undefined),
				fetchConfig: vi.fn().mockResolvedValue(undefined),
				fetchWallet: vi.fn().mockResolvedValue(undefined),
				saveAfterToggle: vi.fn().mockResolvedValue(undefined),
				fetchError: computed(() => null),
			});
			credentialsStore.state.credentials = {};
			const nodeWithAction: INodeUi = {
				...googleAiNode,
				parameters: { resource: 'chat', operation: 'unsupportedOp' },
			};
			ndvStore.activeNode = nodeWithAction;

			const { emitted } = renderComponent({
				props: { node: nodeWithAction, overrideCredType: 'googlePalmApi' },
				global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
			});

			expect(emitted('credentialSelected')).toBeFalsy();
		});

		it('should not redirect an empty node onto n8n Connect when a supported action is picked later', async () => {
			credentialsStore.state.credentials = {};
			const nodeWithAction: INodeUi = {
				...googleAiNode,
				parameters: { resource: 'chat', operation: 'message' },
				credentials: {},
			};
			ndvStore.activeNode = nodeWithAction;

			const { emitted } = renderComponent({
				props: { node: nodeWithAction, overrideCredType: 'googlePalmApi' },
				global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
			});

			const gatewayEmitCount = () =>
				(
					(emitted('credentialSelected') ?? []) as Array<
						[{ properties: { credentials: Record<string, { __aiGatewayManaged?: boolean }> } }]
					>
				).filter((e) => e[0]?.properties?.credentials?.googlePalmApi?.__aiGatewayManaged === true)
					.length;

			// n8n Connect is auto-selected once, as the initial default.
			expect(gatewayEmitCount()).toBe(1);

			// Re-trigger the credential-options watch, as changing the action would.
			credentialsStore.state.credentials = {
				other: { id: 'other', name: 'Other', type: 'otherApi' } as never,
			};
			await nextTick();

			// The action change must not redirect the user back onto n8n Connect.
			expect(gatewayEmitCount()).toBe(1);
		});

		it('should not switch a user-selected own credential to n8n Connect when the action changes', async () => {
			const ownCred = {
				id: 'cred-1',
				name: 'My Google Key',
				type: 'googlePalmApi',
				isManaged: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
			};
			credentialsStore.state.credentials = { 'cred-1': ownCred };
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(ownCred);

			const nodeWithOwnCred: INodeUi = {
				...googleAiNode,
				parameters: { resource: 'scrape', operation: 'scrape' },
				credentials: { googlePalmApi: { id: 'cred-1', name: 'My Google Key' } },
			};
			ndvStore.activeNode = nodeWithOwnCred;

			const { emitted } = renderComponent({
				props: { node: nodeWithOwnCred, overrideCredType: 'googlePalmApi' },
				global: { stubs: { AiGatewaySelector: aiGatewayToggleStub } },
			});

			const gatewayEmitCount = () =>
				(
					(emitted('credentialSelected') ?? []) as Array<
						[{ properties: { credentials: Record<string, { __aiGatewayManaged?: boolean }> } }]
					>
				).filter((e) => e[0]?.properties?.credentials?.googlePalmApi?.__aiGatewayManaged === true)
					.length;

			// The own credential is kept as-is; n8n Connect is never auto-selected.
			expect(gatewayEmitCount()).toBe(0);

			// Re-trigger the credential-options watch, as changing the action would.
			credentialsStore.state.credentials = {
				'cred-1': ownCred,
				other: { id: 'other', name: 'Other', type: 'otherApi' } as never,
			};
			await nextTick();

			// Still no switch to n8n Connect after the re-evaluation.
			expect(gatewayEmitCount()).toBe(0);
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

		describe('telemetry', () => {
			const toggleOnStub = {
				template: '<button data-test-id="ai-gateway-toggle-on" @click="$emit(\'toggle\', true)" />',
				props: ['aiGatewayEnabled'],
				emits: ['toggle'],
			};

			const toggleOffStub = {
				template:
					'<button data-test-id="ai-gateway-toggle-off" @click="$emit(\'toggle\', false)" />',
				props: ['aiGatewayEnabled'],
				emits: ['toggle'],
			};

			it('should track telemetry with mode "n8n_connect" when toggled ON by user', async () => {
				ndvStore.activeNode = googleAiNode;

				renderComponent({
					props: { node: googleAiNode, overrideCredType: 'googlePalmApi' },
					global: { stubs: { AiGatewaySelector: toggleOnStub } },
				});

				await userEvent.click(screen.getByTestId('ai-gateway-toggle-on'));

				expect(trackMock).toHaveBeenCalledWith('User toggled n8n connect credential', {
					credential_type: 'googlePalmApi',
					node_type: googleAiNode.type,
					mode: 'n8n_connect',
					workflow_id: expect.any(String),
				});
				expect(trackMock).toHaveBeenCalledWith('Node credential assigned', {
					credential_type: 'googlePalmApi',
					node_type: googleAiNode.type,
					workflow_id: expect.any(String),
					credential_kind: 'n8n_connect',
					source: 'user',
				});
			});

			it('should track telemetry with mode "own" when toggled OFF by user', async () => {
				// A stored credential exists, so toggling off restores it (BYOK) rather
				// than clearing the slot.
				credentialsStore.state.credentials = {
					'palm-1': createCredential({ id: 'palm-1', name: 'My Palm', type: 'googlePalmApi' }),
				};
				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;

				renderComponent({
					props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' },
					global: { stubs: { AiGatewaySelector: toggleOffStub } },
				});

				await userEvent.click(screen.getByTestId('ai-gateway-toggle-off'));

				expect(trackMock).toHaveBeenCalledWith('User toggled n8n connect credential', {
					credential_type: 'googlePalmApi',
					node_type: googleAiNode.type,
					mode: 'own',
					workflow_id: expect.any(String),
				});
				expect(trackMock).toHaveBeenCalledWith('Node credential assigned', {
					credential_type: 'googlePalmApi',
					node_type: googleAiNode.type,
					workflow_id: expect.any(String),
					credential_kind: 'own',
					source: 'user',
				});
			});

			it('does not track "Node credential assigned" when toggling off clears the slot', async () => {
				// No stored credential to restore → the slot is deleted, so no BYOK
				// assignment should be recorded (only the toggle event fires).
				credentialsStore.state.credentials = {};
				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;

				renderComponent({
					props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' },
					global: { stubs: { AiGatewaySelector: toggleOffStub } },
				});

				await userEvent.click(screen.getByTestId('ai-gateway-toggle-off'));

				expect(trackMock).not.toHaveBeenCalledWith('Node credential assigned', expect.anything());
			});

			it('should not track telemetry when toggled ON automatically on mount', () => {
				// No credentials — auto-select path calls onAiGatewaySelector with isUserAction=false
				ndvStore.activeNode = googleAiNode;

				renderComponent({
					props: { node: googleAiNode, overrideCredType: 'googlePalmApi' },
					global: { stubs: { AiGatewaySelector: toggleOnStub } },
				});

				expect(trackMock).not.toHaveBeenCalledWith(
					'User toggled n8n connect credential',
					expect.anything(),
				);
				expect(trackMock).not.toHaveBeenCalledWith('Node credential assigned', expect.anything());
			});

			it('does not emit "Node credential assigned" in standalone mode (backend attributes it)', async () => {
				ndvStore.activeNode = googleAiNode;

				renderComponent({
					props: { node: googleAiNode, overrideCredType: 'googlePalmApi', standalone: true },
					global: { stubs: { AiGatewaySelector: toggleOnStub } },
				});

				await userEvent.click(screen.getByTestId('ai-gateway-toggle-on'));

				// The Instance AI setup card hosts NodeCredentials in standalone mode;
				// the confirmed selection is counted server-side as source: 'instance-ai-*'.
				expect(trackMock).not.toHaveBeenCalledWith('Node credential assigned', expect.anything());
			});
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

	describe('private credential badge and callout', () => {
		const privateCredential = createCredential({
			id: 'private-cred-id',
			name: 'My Slack',
			type: 'openAiApi',
			isResolvable: true,
			scopes: ['credential:update', 'credential:connect'],
		});

		const notionNode: INodeUi = {
			...httpNode,
			id: 'notion-node-id',
			name: 'Notion',
			type: 'n8n-nodes-base.notion',
			credentials: { openAiApi: { id: 'private-cred-id', name: 'My Slack' } },
			parameters: {},
		};

		beforeEach(() => {
			ndvStore.activeNode = notionNode;
			credentialsStore.state.credentials = {
				'private-cred-id': privateCredential,
			};
		});

		it('renders the Private badge when selected credential is resolvable', async () => {
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			expect(screen.getByTestId('node-credential-private-icon')).toBeInTheDocument();
		});

		it('does not render the Private badge for a static credential', async () => {
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential({ isResolvable: false }),
			};
			renderComponent({ props: { node: httpNode, overrideCredType: 'openAiApi' } });

			expect(screen.queryByTestId('node-credential-private-icon')).not.toBeInTheDocument();
		});

		it('renders the private connection row when a private credential is selected', async () => {
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			expect(screen.getByTestId('node-credential-private-row')).toBeInTheDocument();
		});

		it('does not render the connection row for a static credential', async () => {
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential({ isResolvable: false }),
			};
			renderComponent({ props: { node: httpNode, overrideCredType: 'openAiApi' } });

			expect(screen.queryByTestId('node-credential-private-row')).not.toBeInTheDocument();
		});

		it('shows the Connected dropdown when connectedByMe is true', async () => {
			credentialsStore.state.credentials = {
				'private-cred-id': { ...privateCredential, connectedByMe: true },
			};
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			expect(screen.getByTestId('node-credential-private-connected-actions')).toBeInTheDocument();
			expect(screen.queryByTestId('node-credential-private-connect')).not.toBeInTheDocument();
		});

		it('shows the Connect button when connectedByMe is false', async () => {
			credentialsStore.state.credentials = {
				'private-cred-id': { ...privateCredential, connectedByMe: false },
			};
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			expect(screen.getByTestId('node-credential-private-connect')).toBeInTheDocument();
			expect(screen.getByTestId('node-credential-private-connect')).toBeEnabled();
		});

		it('disables the Connect button when the user lacks connect permission', async () => {
			credentialsStore.state.credentials = {
				'private-cred-id': {
					...privateCredential,
					connectedByMe: false,
					scopes: ['credential:read'],
				},
			};
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			expect(screen.getByTestId('node-credential-private-connect')).toBeDisabled();
		});

		it('disables the Connect button in readonly (execution view) mode', async () => {
			credentialsStore.state.credentials = {
				'private-cred-id': { ...privateCredential, connectedByMe: false },
			};
			renderComponent({
				props: { node: notionNode, overrideCredType: 'openAiApi', readonly: true },
			});

			expect(screen.getByTestId('node-credential-private-connect')).toBeDisabled();
		});

		it('disables the Connected actions dropdown in readonly (execution view) mode', async () => {
			credentialsStore.state.credentials = {
				'private-cred-id': { ...privateCredential, connectedByMe: true },
			};
			renderComponent({
				props: { node: notionNode, overrideCredType: 'openAiApi', readonly: true },
			});

			const dropdown = screen.getByTestId('node-credential-private-connected-actions');
			await userEvent.click(dropdown);

			// The connected/disconnect actions menu must not open while readonly
			expect(screen.queryByText('Disconnect')).not.toBeInTheDocument();
		});

		it('clicking the Connect button runs the OAuth flow without opening the edit modal', async () => {
			credentialsStore.state.credentials = {
				'private-cred-id': { ...privateCredential, connectedByMe: false },
			};
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			await userEvent.click(screen.getByTestId('node-credential-private-connect'));

			expect(authorizeMock).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'private-cred-id' }),
			);
			expect(uiStore.openExistingCredential).not.toHaveBeenCalled();
		});

		it('connects via OAuth even when the user has edit rights (single flow for all)', async () => {
			credentialsStore.state.credentials = {
				'private-cred-id': {
					...privateCredential,
					connectedByMe: false,
					scopes: ['credential:update', 'credential:connect'],
				},
			};
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			await userEvent.click(screen.getByTestId('node-credential-private-connect'));

			expect(authorizeMock).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'private-cred-id' }),
			);
			expect(uiStore.openExistingCredential).not.toHaveBeenCalled();
		});

		it('still renders the connection row when the workflow uses the default (system) resolver', async () => {
			workflowDocumentStore.mergeSettings({ credentialResolverId: SYSTEM_RESOLVER_ID });
			credentialsStore.state.credentials = {
				'private-cred-id': { ...privateCredential, connectedByMe: false },
			};
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			expect(screen.getByTestId('node-credential-private-row')).toBeInTheDocument();
		});

		it('hides the connection row when the workflow uses a non-default resolver', async () => {
			workflowDocumentStore.mergeSettings({ credentialResolverId: 'slack-resolver' });
			credentialsStore.state.credentials = {
				'private-cred-id': { ...privateCredential, connectedByMe: false },
			};
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			expect(screen.queryByTestId('node-credential-private-row')).not.toBeInTheDocument();
		});
	});
});
