import { shallowRef, ref, computed, nextTick, watchSyncEffect } from 'vue';
import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, within, waitFor } from '@testing-library/vue';
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
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUsersStore } from '@n8n/stores/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import { ChatHubToolContextKey, WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

const trackMock = vi.hoisted(() => vi.fn());
const authorizeMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock('@n8n/composables/useTelemetry', () => ({
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
		canServeCredentialType: vi.fn(() => false),
		balance: computed(() => undefined),
		budget: computed(() => undefined),
		creditsLabelKey: computed(() => 'generic.freeCredits'),
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
	let stopCredentialsMirror: () => void;

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
		// Component triggers this on mount; avoid a real XHR with stubActions: false.
		credentialsStore.fetchUsableCredentials = vi
			.fn()
			.mockImplementation(async () => Object.values(credentialsStore.usableCredentials));

		// The picker reads `usableCredentials`, the slice only the scoped fetch writes.
		// Tests seed the flat map, and by the time an NDV mounts in production the
		// scoped fetch has already run (useWorkflowInitialization), so mirror the seed
		// into the slice. Tests that need the two to diverge stop the mirror first.
		stopCredentialsMirror = watchSyncEffect(() => {
			credentialsStore.usableCredentials = { ...credentialsStore.state.credentials };
		});
		credentialsStore.hasFetchedUsableCredentials = true;

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

	afterEach(() => {
		stopCredentialsMirror?.();
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

	it('should not offer a credential the scoped fetch left out of the usable slice', async () => {
		// An unscoped fetchAllCredentials from anywhere in the app can fill the flat
		// map with credentials from other projects while the NDV is open (IAM-1241).
		stopCredentialsMirror();
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
			'personal-cred': createCredential({ id: 'personal-cred', name: 'Personal OpenAi account' }),
		};
		credentialsStore.usableCredentials = {
			c8vqdPpPClh4TgIO: createCredential(),
		};

		renderComponent();

		await userEvent.click(screen.getByTestId('node-credentials-select'));

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
		expect(screen.queryByText('Personal OpenAi account')).not.toBeInTheDocument();
	});

	it('replaces the type-derived field label when credentialsFieldLabel is set', () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
		};

		renderComponent(
			{ props: { credentialsFieldLabel: 'fal.ai API Key credentials' } },
			{ merge: true },
		);

		expect(screen.getByTestId('credentials-label')).toHaveTextContent('fal.ai API Key credentials');
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

	it('passes the workflowId prop through to the new credential modal when standalone', async () => {
		workflowDocumentStoreRef.value = null;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
		};

		renderComponent(
			{
				props: {
					node: httpNode,
					overrideCredType: 'openAiApi',
					standalone: true,
					workflowId: 'wf-artifact',
				},
			},
			{ merge: true },
		);

		await userEvent.click(screen.getByTestId('node-credentials-select'));
		await userEvent.click(screen.getByTestId('node-credentials-select-item-new'));

		expect(uiStore.openNewCredential).toHaveBeenCalledWith(
			'openAiApi',
			false,
			false,
			undefined,
			undefined,
			httpNode.name,
			httpNode,
			expect.objectContaining({ workflowId: 'wf-artifact' }),
		);
		expect(trackMock).toHaveBeenCalledWith(
			'User opened Credential modal',
			expect.objectContaining({ workflow_id: 'wf-artifact' }),
		);
	});

	it('should refresh credentials from the server when mounted on an existing node', () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {};

		renderComponent();

		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
			workflowId: '1',
		});
	});

	it('should not fetch credentials on mount when skipCredentialsFetch is set', () => {
		// Hosts with a synthetic workflow document (e.g. the tool config modal)
		// own the credential fetch themselves; the component's own fetch would
		// query a nonexistent workflow id and wipe the store with its empty result.
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {};

		renderComponent({ props: { skipCredentialsFetch: true } });

		expect(credentialsStore.fetchUsableCredentials).not.toHaveBeenCalled();
	});

	it('should fetch credentials scoped to the project for an unsaved workflow', () => {
		workflowsStore.isNewWorkflow = true;
		projectsStore.currentProject = { id: 'project-1' } as Project;
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {};

		renderComponent();

		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
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

		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
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
			{ hideAskAssistant: false, closeOnSave: true, workflowId: '1' },
		);
	});

	it('should configure the new credential modal for a tool context', async () => {
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
			{ hideAskAssistant: true, closeOnSave: true, appendToBody: true, workflowId: '1' },
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
				credential_id: 'secondCred',
				credential_kind: 'own',
				source: 'user',
			});
		});

		it('should drop credentials the node no longer uses when selecting a credential', async () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			nodeTypesStore.setNodeTypes([
				{
					displayName: 'HTTP Request',
					name: 'n8n-nodes-base.httpRequest',
					group: ['input'],
					version: [4, 4.1, 4.2],
					description: 'Makes an HTTP request',
					defaults: { name: 'HTTP Request' },
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
					credentials: [
						{
							name: 'httpSslAuth',
							required: true,
							displayOptions: { show: { provideSslCertificates: [true] } },
						},
					],
					properties: [],
				} as unknown as INodeTypeDescription,
			]);

			// Node switched from generic to predefined auth: the httpHeaderAuth entry is stale.
			// Built from scratch (not from the shared httpNode fixture) because store actions
			// in earlier tests mutate the fixture object in place.
			const httpNodeWithStaleCred: INodeUi = {
				parameters: {
					method: 'GET',
					url: '',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'openAiApi',
					provideSslCertificates: false,
					options: {},
				},
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [-200, -160],
				id: 'e4b917b5-e994-42c7-8576-6ef28a7619b2',
				name: 'HTTP Request Stale',
				credentials: {
					openAiApi: { id: 'c8vqdPpPClh4TgIO', name: 'OpenAi account' },
					httpHeaderAuth: { id: 'staleCred', name: 'Header Auth' },
				},
			};

			ndvStore.activeNode = httpNodeWithStaleCred;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
				secondCred: createCredential({ id: 'secondCred', name: 'OpenAi account 2' }),
			};

			const { emitted } = renderComponent(
				{ props: { node: httpNodeWithStaleCred } },
				{ merge: true },
			);

			await userEvent.click(screen.getByTestId('node-credentials-select'));
			await userEvent.click(screen.queryByText('OpenAi account 2')!);

			const events = emitted('credentialSelected');
			const payload = (events[events.length - 1] as unknown[])[0] as {
				properties: { credentials: Record<string, unknown> };
			};
			expect(payload.properties.credentials).toEqual({
				openAiApi: { id: 'secondCred', name: 'OpenAi account 2' },
			});
		});

		it('should keep existing credentials when the node type is unknown', async () => {
			// No node types registered: the active credential types cannot be determined,
			// so selecting a credential must not remove any existing entries.
			const httpNodeWithStaleCred: INodeUi = {
				parameters: {
					method: 'GET',
					url: '',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'openAiApi',
					options: {},
				},
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [-200, -160],
				id: 'f5c917b5-e994-42c7-8576-6ef28a7619b3',
				name: 'HTTP Request Unknown Type',
				credentials: {
					openAiApi: { id: 'c8vqdPpPClh4TgIO', name: 'OpenAi account' },
					httpHeaderAuth: { id: 'staleCred', name: 'Header Auth' },
				},
			};

			ndvStore.activeNode = httpNodeWithStaleCred;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
				secondCred: createCredential({ id: 'secondCred', name: 'OpenAi account 2' }),
			};

			const { emitted } = renderComponent(
				{ props: { node: httpNodeWithStaleCred } },
				{ merge: true },
			);

			await userEvent.click(screen.getByTestId('node-credentials-select'));
			await userEvent.click(screen.queryByText('OpenAi account 2')!);

			const events = emitted('credentialSelected');
			const payload = (events[events.length - 1] as unknown[])[0] as {
				properties: { credentials: Record<string, unknown> };
			};
			// Presence matters (nothing was deleted); the renderer's merge:true option
			// deep-merges nodes into the shared httpNode fixture, so avoid exact equality.
			expect(payload.properties.credentials).toMatchObject({
				openAiApi: { id: 'secondCred', name: 'OpenAi account 2' },
				httpHeaderAuth: { id: 'staleCred', name: 'Header Auth' },
			});
		});

		it('should never drop the just-selected credential even when it is not in the active set', async () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			nodeTypesStore.setNodeTypes([
				{
					displayName: 'HTTP Request',
					name: 'n8n-nodes-base.httpRequest',
					group: ['input'],
					version: [4, 4.1, 4.2],
					description: 'Makes an HTTP request',
					defaults: { name: 'HTTP Request' },
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
					credentials: [],
					properties: [],
				} as unknown as INodeTypeDescription,
			]);

			// The node's configuration points at anthropicApi, so the openAiApi credential
			// the user is about to pick (rendered via overrideCredType) is not in the
			// active set — only the just-selected guard keeps it from being deleted.
			const httpNodeOtherAuth: INodeUi = {
				parameters: {
					method: 'GET',
					url: '',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'anthropicApi',
					options: {},
				},
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [-200, -160],
				id: 'a1b917b5-e994-42c7-8576-6ef28a7619b4',
				name: 'HTTP Request Other Auth',
				credentials: {
					anthropicApi: { id: 'anthCred', name: 'Anthropic account' },
				},
			};

			ndvStore.activeNode = httpNodeOtherAuth;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
				secondCred: createCredential({ id: 'secondCred', name: 'OpenAi account 2' }),
			};

			const { emitted } = renderComponent({ props: { node: httpNodeOtherAuth } }, { merge: true });

			await userEvent.click(screen.getByTestId('node-credentials-select'));
			await userEvent.click(screen.queryByText('OpenAi account 2')!);

			const events = emitted('credentialSelected');
			const payload = (events[events.length - 1] as unknown[])[0] as {
				properties: { credentials: Record<string, unknown> };
			};
			expect(payload.properties.credentials).toMatchObject({
				anthropicApi: { id: 'anthCred', name: 'Anthropic account' },
				openAiApi: { id: 'secondCred', name: 'OpenAi account 2' },
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
				{ hideAskAssistant: false, closeOnSave: true, workflowId: '1' },
			);
		});

		it('shows the connect entry state in the standard empty state', () => {
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

			// Without n8n credits the empty state is a single "Connect to <service>" button.
			expect(screen.queryByTestId('setup-credential-button')).not.toBeInTheDocument();
			const emptyState = screen.getByTestId('node-credentials-empty-state');
			expect(within(emptyState).getByRole('button', { name: /Connect to/ })).toBeInTheDocument();
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

		it('should show sibling OAuth quick connect when the auth field is kept in NDV', () => {
			setupQuickConnectStores();

			const discordOAuth2ApiType: ICredentialType = {
				...slackOAuth2ApiType,
				name: 'discordOAuth2Api',
				displayName: 'Discord OAuth2 API',
			};
			const discordNode: INodeUi = {
				parameters: { authentication: 'botToken' },
				type: 'n8n-nodes-base.discord',
				typeVersion: 2,
				position: [0, 0],
				id: 'discord-node-id',
				name: 'Discord',
				credentials: {},
			};

			credentialsStore.state.credentialTypes = {
				...credentialsStore.state.credentialTypes,
				discordOAuth2Api: discordOAuth2ApiType,
				discordBotApi: {
					name: 'discordBotApi',
					displayName: 'Discord Bot API',
					properties: [],
				},
			};
			mockedStore(useNodeTypesStore).setNodeTypes([
				{
					displayName: 'Discord',
					name: 'n8n-nodes-base.discord',
					group: ['output'],
					version: 2,
					description: '',
					defaults: { name: 'Discord' },
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
					credentials: [
						{
							name: 'discordBotApi',
							required: true,
							displayOptions: { show: { authentication: ['botToken'] } },
						},
						{
							name: 'discordOAuth2Api',
							required: true,
							displayOptions: { show: { authentication: ['oAuth2'] } },
						},
					],
					properties: [
						{
							displayName: 'Connection Type',
							name: 'authentication',
							type: 'options',
							options: [
								{ name: 'Bot Token', value: 'botToken' },
								{ name: 'OAuth2', value: 'oAuth2' },
							],
							default: 'botToken',
						},
					],
				} as unknown as INodeTypeDescription,
			]);
			ndvStore.activeNode = discordNode;

			renderComponent(
				{
					props: {
						node: discordNode,
						overrideCredType: '',
					},
				},
				{ merge: true },
			);

			expect(screen.queryByTestId('quick-connect-empty-state')).toBeInTheDocument();
			expect(screen.queryByTestId('node-credentials-empty-state')).not.toBeInTheDocument();
			expect(screen.getByText('Connect to Discord')).toBeInTheDocument();
		});

		it('should not show sibling OAuth quick connect for an independent credential field', () => {
			setupQuickConnectStores();

			const pipedriveOAuth2ApiType: ICredentialType = {
				...slackOAuth2ApiType,
				name: 'pipedriveOAuth2Api',
				displayName: 'Pipedrive OAuth2 API',
			};
			const pipedriveNode: INodeUi = {
				parameters: {
					authentication: 'apiToken',
					incomingAuthentication: 'basicAuth',
				},
				type: 'n8n-nodes-base.pipedriveTrigger',
				typeVersion: 1,
				position: [0, 0],
				id: 'pipedrive-trigger-node-id',
				name: 'Pipedrive Trigger',
				credentials: {},
			};

			credentialsStore.state.credentialTypes = {
				...credentialsStore.state.credentialTypes,
				pipedriveOAuth2Api: pipedriveOAuth2ApiType,
				pipedriveApi: {
					name: 'pipedriveApi',
					displayName: 'Pipedrive API',
					properties: [],
				},
				httpBasicAuth: {
					name: 'httpBasicAuth',
					displayName: 'Basic Auth',
					properties: [],
				},
			};
			mockedStore(useNodeTypesStore).setNodeTypes([
				{
					displayName: 'Pipedrive Trigger',
					name: 'n8n-nodes-base.pipedriveTrigger',
					group: ['trigger'],
					version: 1,
					description: '',
					defaults: { name: 'Pipedrive Trigger' },
					inputs: [],
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
							required: true,
							options: [
								{ name: 'API Token', value: 'apiToken' },
								{ name: 'OAuth2', value: 'oAuth2' },
							],
							default: 'apiToken',
						},
					],
				} as unknown as INodeTypeDescription,
			]);
			ndvStore.activeNode = pipedriveNode;

			renderComponent(
				{
					props: {
						node: pipedriveNode,
						overrideCredType: '',
					},
				},
				{ merge: true },
			);

			expect(screen.getAllByTestId('quick-connect-empty-state')).toHaveLength(1);
			expect(screen.getAllByTestId('node-credentials-empty-state')).toHaveLength(1);
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

		it('should configure the edit credential modal for a tool context', async () => {
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

			const editIcon = screen
				.getByTestId('credential-edit-button')
				.querySelector('[data-icon="pen"]');
			expect(editIcon).not.toBeNull();
			await userEvent.click(editIcon!);

			expect(uiStore.openExistingCredential).toHaveBeenCalledWith('c8vqdPpPClh4TgIO', {
				hideAskAssistant: true,
				appendToBody: true,
				workflowId: '1',
			});
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
		const emptyState = screen.getByTestId('node-credentials-empty-state');
		expect(within(emptyState).getByRole('button')).toBeDisabled();
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

	describe('credential auto-select', () => {
		it('should auto-select a credential of the overridden type on mount', () => {
			const httpNodeNoCreds: INodeUi = { ...httpNode, credentials: {} };
			ndvStore.activeNode = httpNodeNoCreds;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
			};

			const { emitted } = renderComponent({
				props: {
					node: httpNodeNoCreds,
					overrideCredType: 'openAiApi',
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
			expect(payload.name).toBe(httpNodeNoCreds.name);
			expect(payload.properties.credentials['openAiApi']).toEqual({
				id: 'c8vqdPpPClh4TgIO',
				name: 'OpenAi account',
			});
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
				canServeCredentialType: vi.fn((credType: string) => credType === 'googlePalmApi'),
				isNodeTypeVersionSupported: vi.fn(() => true),
				isActionSupported: vi.fn(() => true),
				isActionOptionVisible: vi.fn(() => true),
				isNodePropertyHidden: vi.fn(() => false),
				balance: computed(() => undefined),
				budget: computed(() => undefined),
				creditsLabelKey: computed(() => 'generic.freeCredits'),
				fetchConfig: vi.fn().mockResolvedValue(undefined),
				fetchWallet: vi.fn().mockResolvedValue(undefined),
				saveAfterToggle: vi.fn().mockResolvedValue(undefined),
				fetchError: computed(() => null),
			});

			const nodeTypesStore = mockedStore(useNodeTypesStore);
			nodeTypesStore.setNodeTypes([googleAiNodeType]);

			credentialsStore.state.credentialTypes = { googlePalmApi: googlePalmApiCredType };
		});

		describe('rendering', () => {
			it('offers n8n credits alongside own credentials when the gateway supports the type', async () => {
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
				});

				await userEvent.click(screen.getByTestId('node-credentials-select'));

				expect(screen.getByTestId('node-credentials-select-item-n8n-credits')).toBeInTheDocument();
				expect(screen.getByTestId('node-credentials-select-item-cred-1')).toBeInTheDocument();
			});

			it('should show the select with n8n credits selected when gateway is managed', async () => {
				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;

				renderComponent({
					props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' },
				});

				// The select stays visible with n8n credits as the selection.
				expect(screen.getByTestId('node-credentials-select')).toBeInTheDocument();
				expect(await screen.findByDisplayValue('Gateway credits')).toBeInTheDocument();
			});

			it('keeps the managed selection when gateway config has not loaded yet', () => {
				// Simulates the case where the AI gateway backend is unreachable and fetchConfig
				// fails, leaving isCredentialTypeSupported returning false. The managed selection
				// must still render so the user can switch away on existing nodes.
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn(() => false),
					canServeCredentialType: vi.fn(() => false),
					isNodeTypeVersionSupported: vi.fn(() => true),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					creditsLabelKey: computed(() => 'generic.freeCredits'),
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
				});

				expect(screen.getByTestId('node-credentials-select')).toBeInTheDocument();
			});

			it('does not offer n8n credits when the gateway feature is disabled', async () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => false),
					isCredentialTypeSupported: vi.fn(() => false),
					canServeCredentialType: vi.fn(() => false),
					isNodeTypeVersionSupported: vi.fn(() => true),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					creditsLabelKey: computed(() => 'generic.freeCredits'),
					fetchError: computed(() => null),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
				});
				ndvStore.activeNode = googleAiNode;

				renderComponent({
					props: { node: googleAiNode, overrideCredType: 'googlePalmApi' },
				});

				// Without n8n credits the empty state is a plain create button, not a picker.
				const emptyState = screen.getByTestId('node-credentials-empty-state');
				expect(within(emptyState).queryByRole('combobox')).not.toBeInTheDocument();
				expect(
					screen.queryByTestId('node-credentials-select-item-n8n-credits'),
				).not.toBeInTheDocument();
			});

			it('shows the managed selection in readonly mode', () => {
				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;

				renderComponent({
					props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi', readonly: true },
				});

				// The readonly disabled input shows the managed selection.
				expect(screen.getByTestId('node-credentials-select')).toBeInTheDocument();
				expect(screen.getByDisplayValue('Gateway credits')).toBeInTheDocument();
			});

			it('should show the readonly disabled input when readonly and not managed', () => {
				const nodeWithCred: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: 'cred-1', name: 'My Google Key' } },
				};
				ndvStore.activeNode = nodeWithCred;

				renderComponent({
					props: { node: nodeWithCred, overrideCredType: 'googlePalmApi', readonly: true },
				});

				expect(screen.getByTestId('node-credentials-select')).toBeInTheDocument();
			});
		});

		describe('n8n credits dropdown option', () => {
			const existingCred = {
				id: 'cred-1',
				name: 'My Google Key',
				type: 'googlePalmApi',
				isManaged: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
			};

			const nodeWithCred: INodeUi = {
				...googleAiNode,
				credentials: { googlePalmApi: { id: 'cred-1', name: 'My Google Key' } },
			};

			beforeEach(() => {
				credentialsStore.state.credentials = { 'cred-1': existingCred };
				credentialsStore.getCredentialById = vi.fn().mockReturnValue(existingCred);
				ndvStore.activeNode = nodeWithCred;
			});

			it('lists n8n credits as the first option for a gateway-served type', async () => {
				renderComponent({ props: { node: nodeWithCred, overrideCredType: 'googlePalmApi' } });

				await userEvent.click(screen.getByTestId('node-credentials-select'));

				const creditsOption = screen.getByTestId('node-credentials-select-item-n8n-credits');
				expect(creditsOption).toBeInTheDocument();
				// First row, above the user's own credentials.
				const allOptions = screen.getAllByTestId(/node-credentials-select-item-/);
				expect(allOptions[0]).toBe(creditsOption);
			});

			it('does not offer n8n credits when the gateway does not serve the type', async () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn(() => false),
					canServeCredentialType: vi.fn(() => false),
					isNodeTypeVersionSupported: vi.fn(() => true),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					creditsLabelKey: computed(() => 'generic.freeCredits'),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
					fetchError: computed(() => null),
				});

				renderComponent({ props: { node: nodeWithCred, overrideCredType: 'googlePalmApi' } });

				await userEvent.click(screen.getByTestId('node-credentials-select'));

				expect(screen.queryByText('My Google Key')).toBeInTheDocument();
				expect(
					screen.queryByTestId('node-credentials-select-item-n8n-credits'),
				).not.toBeInTheDocument();
			});

			it('writes the managed slot when the n8n credits option is chosen', async () => {
				const { emitted } = renderComponent({
					props: { node: nodeWithCred, overrideCredType: 'googlePalmApi' },
				});

				await userEvent.click(screen.getByTestId('node-credentials-select'));
				await userEvent.click(screen.getByTestId('node-credentials-select-item-n8n-credits'));

				const payload = ((emitted('credentialSelected')?.at(-1) as unknown[]) ?? [])[0] as {
					properties: { credentials: Record<string, unknown> };
				};
				expect(payload.properties.credentials.googlePalmApi).toEqual({
					id: null,
					name: '',
					__aiGatewayManaged: true,
				});
			});

			it('shows the balance pill on the n8n credits row and the managed trigger', async () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn((credType: string) => credType === 'googlePalmApi'),
					canServeCredentialType: vi.fn((credType: string) => credType === 'googlePalmApi'),
					isNodeTypeVersionSupported: vi.fn(() => true),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => 2.75),
					budget: computed(() => undefined),
					creditsLabelKey: computed(() => 'generic.freeCredits'),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
					fetchError: computed(() => null),
				});
				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;

				renderComponent({ props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' } });

				// Trigger overlay + the dropdown row both carry the balance.
				expect(screen.getAllByText('$2.75 left').length).toBeGreaterThanOrEqual(1);

				const credentialsSelect = screen.getByTestId('node-credentials-select');
				await userEvent.click(credentialsSelect);

				const credentialSearch = credentialsSelect.querySelector('input') as HTMLElement;
				await userEvent.type(credentialSearch, 'My');

				expect(screen.queryByText('$2.75 left')).not.toBeInTheDocument();
			});

			it('shows a top-up gear instead of the pen while managed', () => {
				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;

				renderComponent({ props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' } });

				expect(screen.getByTestId('credential-topup-button')).toBeInTheDocument();
				expect(screen.queryByTestId('credential-edit-button')).not.toBeInTheDocument();
			});

			it('opens the top-up modal from the gear', async () => {
				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;
				vi.spyOn(uiStore, 'openModalWithData');

				renderComponent({ props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' } });

				await userEvent.click(screen.getByTestId('credential-topup-button'));

				await waitFor(() => {
					expect(uiStore.openModalWithData).toHaveBeenCalledWith({
						name: AI_GATEWAY_TOP_UP_MODAL_KEY,
						data: { variant: 'member' },
					});
				});
			});

			it('switches to an own credential from the managed state via the dropdown', async () => {
				const nodeWithGateway: INodeUi = {
					...googleAiNode,
					credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
				};
				ndvStore.activeNode = nodeWithGateway;

				const { emitted } = renderComponent({
					props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' },
				});

				await userEvent.click(screen.getByTestId('node-credentials-select'));
				await userEvent.click(screen.getByTestId('node-credentials-select-item-cred-1'));

				const payload = ((emitted('credentialSelected')?.at(-1) as unknown[]) ?? [])[0] as {
					properties: { credentials: Record<string, unknown> };
				};
				expect(payload.properties.credentials.googlePalmApi).toEqual({
					id: 'cred-1',
					name: 'My Google Key',
				});
			});
		});

		describe('multiple credential types (n8n credits on a non-default auth)', () => {
			// Mirrors a node whose `authentication` defaults to an option mapping to a
			// credential type NOT covered by n8n credits, while a sibling auth option
			// maps to a covered type.
			const serviceOAuth2CredType: ICredentialType = {
				name: 'serviceOAuth2Api',
				displayName: 'Service OAuth2 API',
				properties: [],
			};
			const serviceApiKeyCredType: ICredentialType = {
				name: 'serviceApiKey',
				displayName: 'Service API',
				properties: [],
			};

			const multiAuthNodeType: INodeTypeDescription = {
				displayName: 'Service',
				name: 'service',
				group: ['transform'],
				version: 1,
				description: '',
				defaults: { name: 'Service' },
				inputs: [NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main],
				credentials: [
					{
						name: 'serviceOAuth2Api',
						required: true,
						displayOptions: { show: { authentication: ['oAuth2'] } },
					},
					{
						name: 'serviceApiKey',
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
							{ name: 'OAuth2', value: 'oAuth2' },
							{ name: 'API Key', value: 'apiKey' },
						],
						default: 'oAuth2',
					},
				],
			};

			const multiAuthNode: INodeUi = {
				id: 'node-service',
				name: 'Service',
				type: 'service',
				typeVersion: 1,
				position: [0, 0],
				parameters: { authentication: 'oAuth2' },
				credentials: {},
			};

			beforeEach(() => {
				// Gateway covers only the API-key credential type, not the default OAuth2 one.
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn((credType: string) => credType === 'serviceApiKey'),
					canServeCredentialType: vi.fn((credType: string) => credType === 'serviceApiKey'),
					isNodeTypeVersionSupported: vi.fn(() => true),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					creditsLabelKey: computed(() => 'generic.freeCredits'),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
					fetchError: computed(() => null),
				});

				const nodeTypesStore = mockedStore(useNodeTypesStore);
				nodeTypesStore.setNodeTypes([multiAuthNodeType]);
				credentialsStore.state.credentialTypes = {
					serviceOAuth2Api: serviceOAuth2CredType,
					serviceApiKey: serviceApiKeyCredType,
				};
				credentialsStore.state.credentials = {};
			});

			it('offers the n8n credits option when a non-displayed sibling credential type is supported', async () => {
				ndvStore.activeNode = multiAuthNode;

				renderComponent({
					// Clear the suite-wide default override — these tests model the NDV row.
					props: { node: multiAuthNode, overrideCredType: '' },
				});

				await userEvent.click(
					within(screen.getByTestId('node-credentials-empty-state')).getByRole('combobox'),
				);

				expect(screen.getByTestId('node-credentials-select-item-n8n-credits')).toBeInTheDocument();
			});

			it('switches authentication to the supported credential type when n8n credits is chosen', async () => {
				ndvStore.activeNode = multiAuthNode;

				const { emitted } = renderComponent({
					props: { node: multiAuthNode, overrideCredType: '' },
				});

				await userEvent.click(
					within(screen.getByTestId('node-credentials-empty-state')).getByRole('combobox'),
				);
				await userEvent.click(screen.getByTestId('node-credentials-select-item-n8n-credits'));

				// Managed credential is attached to the supported (API-key) type, not the default OAuth2 type.
				const credPayload = ((emitted('credentialSelected')?.[0] as unknown[]) ?? [])[0] as {
					properties: { credentials: Record<string, unknown> };
				};
				expect(credPayload.properties.credentials.serviceApiKey).toEqual({
					id: null,
					name: '',
					__aiGatewayManaged: true,
				});
				expect(credPayload.properties.credentials.serviceOAuth2Api).toBeUndefined();

				// And the node's authentication is switched to the supported option.
				const authPayload = ((emitted('valueChanged')?.[0] as unknown[]) ?? [])[0] as {
					name: string;
					value: string;
				};
				expect(authPayload).toEqual({ name: 'parameters.authentication', value: 'apiKey' });
			});

			// Mirrors the real NDV mount: `show-all` is true and the node has no
			// explicit `authentication` (relies on the type's `oAuth2` default),
			// exactly like a freshly inserted PDF.co node.
			it('switches authentication when show-all is set and authentication is unset', async () => {
				ndvStore.activeNode = multiAuthNode;

				const { emitted } = renderComponent({
					props: { node: multiAuthNode, overrideCredType: '', showAll: true },
				});

				await userEvent.click(
					within(screen.getByTestId('node-credentials-empty-state')).getByRole('combobox'),
				);
				await userEvent.click(screen.getByTestId('node-credentials-select-item-n8n-credits'));

				const credPayload = ((emitted('credentialSelected')?.[0] as unknown[]) ?? [])[0] as {
					properties: { credentials: Record<string, unknown> };
				};
				expect(credPayload.properties.credentials.serviceApiKey).toEqual({
					id: null,
					name: '',
					__aiGatewayManaged: true,
				});

				const authPayload = ((emitted('valueChanged')?.[0] as unknown[]) ?? [])[0] as {
					name: string;
					value: string;
				};
				expect(authPayload).toEqual({ name: 'parameters.authentication', value: 'apiKey' });
			});

			// Setup-flow hosts (standalone Instance AI cards, setup panel via
			// overrideCredType) read the credentialSelected payload by this row's
			// type and don't handle valueChanged, so the sibling fallback must not
			// surface the toggle there.
			it('does not offer the sibling fallback in standalone mode', async () => {
				ndvStore.activeNode = multiAuthNode;

				renderComponent({
					props: { node: multiAuthNode, overrideCredType: '', standalone: true },
				});

				// The sibling fallback is suppressed, so no picker (and no n8n credits) appears.
				const emptyState = screen.getByTestId('node-credentials-empty-state');
				expect(within(emptyState).queryByRole('combobox')).not.toBeInTheDocument();
				expect(
					screen.queryByTestId('node-credentials-select-item-n8n-credits'),
				).not.toBeInTheDocument();
			});

			it('does not offer the sibling fallback when a credential type override is set', async () => {
				ndvStore.activeNode = multiAuthNode;

				renderComponent({
					props: { node: multiAuthNode, overrideCredType: 'serviceOAuth2Api' },
				});

				// The sibling fallback is suppressed, so no picker (and no n8n credits) appears.
				const emptyState = screen.getByTestId('node-credentials-empty-state');
				expect(within(emptyState).queryByRole('combobox')).not.toBeInTheDocument();
				expect(
					screen.queryByTestId('node-credentials-select-item-n8n-credits'),
				).not.toBeInTheDocument();
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

			it('does not offer n8n credits when typeVersion is below the minimum', async () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn((credType: string) => credType === 'someApi'),
					canServeCredentialType: vi.fn((credType: string) => credType === 'someApi'),
					isNodeTypeVersionSupported: vi.fn(() => false),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					creditsLabelKey: computed(() => 'generic.freeCredits'),
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
				});

				// Below the minimum version the gateway is unsupported, so no picker appears.
				const emptyState = screen.getByTestId('node-credentials-empty-state');
				expect(within(emptyState).queryByRole('combobox')).not.toBeInTheDocument();
				expect(
					screen.queryByTestId('node-credentials-select-item-n8n-credits'),
				).not.toBeInTheDocument();
			});

			it('offers n8n credits when typeVersion meets the minimum', async () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn((credType: string) => credType === 'someApi'),
					canServeCredentialType: vi.fn((credType: string) => credType === 'someApi'),
					isNodeTypeVersionSupported: vi.fn(() => true),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					creditsLabelKey: computed(() => 'generic.freeCredits'),
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
				});

				await userEvent.click(
					within(screen.getByTestId('node-credentials-empty-state')).getByRole('combobox'),
				);

				expect(screen.getByTestId('node-credentials-select-item-n8n-credits')).toBeInTheDocument();
			});

			it('should emit credentialSelected clearing __aiGatewayManaged when version gate fails on mount', () => {
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn((credType: string) => credType === 'someApi'),
					canServeCredentialType: vi.fn((credType: string) => credType === 'someApi'),
					isNodeTypeVersionSupported: vi.fn(() => false),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					creditsLabelKey: computed(() => 'generic.freeCredits'),
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
					canServeCredentialType: vi.fn((credType: string) => credType === 'someApi'),
					isNodeTypeVersionSupported: vi.fn(() => false),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					creditsLabelKey: computed(() => 'generic.freeCredits'),
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
				});

				expect(emitted('credentialSelected')).toBeFalsy();
			});
		});

		describe('nodes with a parameter-selected credential type (HTTP Request, GraphQL)', () => {
			const httpRequestNodeType: INodeTypeDescription = {
				displayName: 'HTTP Request',
				name: 'n8n-nodes-base.httpRequest',
				group: ['transform'],
				version: 4.5,
				description: '',
				defaults: { name: 'HTTP Request' },
				inputs: [NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main],
				credentials: [{ name: 'openAiApi', required: true }],
				properties: [],
			};

			const openAiApiCredType: ICredentialType = {
				name: 'openAiApi',
				displayName: 'OpenAI API',
				properties: [{ displayName: 'API Key', name: 'apiKey', type: 'string', default: '' }],
			};

			beforeEach(() => {
				const nodeTypesStore = mockedStore(useNodeTypesStore);
				nodeTypesStore.setNodeTypes([httpRequestNodeType]);
				credentialsStore.state.credentialTypes = { openAiApi: openAiApiCredType };

				// Even though the gateway serves the credential type and the node's
				// version clears the (permissive-by-default) version gate, the node
				// itself lets the user point at ANY predefined credential type — n8n
				// credits must never be offered for it.
				vi.mocked(useAiGateway).mockReturnValue({
					isEnabled: computed(() => true),
					isCredentialTypeSupported: vi.fn((credType: string) => credType === 'openAiApi'),
					canServeCredentialType: vi.fn((credType: string) => credType === 'openAiApi'),
					isNodeTypeVersionSupported: vi.fn(() => true),
					isActionSupported: vi.fn(() => true),
					isActionOptionVisible: vi.fn(() => true),
					isNodePropertyHidden: vi.fn(() => false),
					balance: computed(() => undefined),
					budget: computed(() => undefined),
					creditsLabelKey: computed(() => 'generic.freeCredits'),
					fetchConfig: vi.fn().mockResolvedValue(undefined),
					fetchWallet: vi.fn().mockResolvedValue(undefined),
					saveAfterToggle: vi.fn().mockResolvedValue(undefined),
					fetchError: computed(() => null),
				});
			});

			it('never offers n8n credits on an HTTP Request node, even for a gateway-served type', async () => {
				const node: INodeUi = {
					id: 'node-http',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.5,
					position: [0, 0],
					parameters: {
						authentication: 'predefinedCredentialType',
						nodeCredentialType: 'openAiApi',
					},
					credentials: {},
				};
				ndvStore.activeNode = node;

				renderComponent({ props: { node, overrideCredType: 'openAiApi' } });

				await userEvent.click(
					within(screen.getByTestId('node-credentials-empty-state')).getByRole('button'),
				);

				expect(
					screen.queryByTestId('node-credentials-select-item-n8n-credits'),
				).not.toBeInTheDocument();
			});

			it('does not auto-enable n8n credits on mount for an HTTP Request node with no credentials', () => {
				const node: INodeUi = {
					id: 'node-http',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.5,
					position: [0, 0],
					parameters: {
						authentication: 'predefinedCredentialType',
						nodeCredentialType: 'openAiApi',
					},
					credentials: {},
				};
				ndvStore.activeNode = node;

				const { emitted } = renderComponent({ props: { node, overrideCredType: 'openAiApi' } });

				const payload = ((emitted('credentialSelected')?.at(-1) as unknown[] | undefined) ??
					[])[0] as { properties: { credentials: Record<string, unknown> } } | undefined;
				expect(payload?.properties.credentials.openAiApi).toBeUndefined();
			});
		});

		it('writes the managed slot when n8n credits is chosen with no stored credentials', async () => {
			ndvStore.activeNode = googleAiNode;

			const { emitted } = renderComponent({
				props: { node: googleAiNode, overrideCredType: 'googlePalmApi' },
			});

			await userEvent.click(
				within(screen.getByTestId('node-credentials-empty-state')).getByRole('combobox'),
			);
			await userEvent.click(screen.getByTestId('node-credentials-select-item-n8n-credits'));

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

		it('should not auto-enable the gateway before the scoped fetch has resolved', async () => {
			// An unfetched slice reads as "no credentials" — acting on it would switch a
			// node that has a perfectly good credential onto n8n credits (IAM-1241).
			stopCredentialsMirror();
			const ownCred = {
				id: 'cred-1',
				name: 'My Google Key',
				type: 'googlePalmApi',
				isManaged: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
			};
			credentialsStore.hasFetchedUsableCredentials = false;
			credentialsStore.usableCredentials = {};
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(ownCred);
			const nodeWithAction: INodeUi = {
				...googleAiNode,
				parameters: { resource: 'chat', operation: 'message' },
			};
			ndvStore.activeNode = nodeWithAction;

			const { emitted } = renderComponent({
				props: { node: nodeWithAction, overrideCredType: 'googlePalmApi' },
			});

			expect(emitted('credentialSelected')).toBeFalsy();

			// Once the scope lands the user's own credential is selected instead.
			credentialsStore.usableCredentials = { 'cred-1': ownCred };
			credentialsStore.hasFetchedUsableCredentials = true;
			await nextTick();

			const payload = ((emitted('credentialSelected')?.[0] as unknown[]) ?? [])[0] as {
				properties: { credentials: Record<string, unknown> };
			};
			expect(payload.properties.credentials['googlePalmApi']).toEqual(
				expect.objectContaining({ id: 'cred-1' }),
			);
		});

		it('should auto-enable gateway credential on mount for a directly-supported single-cred node in the NDV (show-all, no override)', () => {
			// Real NDV config: show-all is true and no overrideCredType. Regression guard
			// for the sibling-fallback change not clobbering directly-supported types.
			credentialsStore.state.credentials = {};
			const nodeWithAction: INodeUi = {
				...googleAiNode,
				parameters: { resource: 'chat', operation: 'message' },
			};
			ndvStore.activeNode = nodeWithAction;

			const { emitted } = renderComponent({
				props: { node: nodeWithAction, overrideCredType: '', showAll: true },
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
				canServeCredentialType: vi.fn((credType: string) => credType === 'googlePalmApi'),
				isNodeTypeVersionSupported: vi.fn(() => true),
				isActionSupported: vi.fn(() => false),
				isActionOptionVisible: vi.fn(() => true),
				isNodePropertyHidden: vi.fn(() => false),
				balance: computed(() => undefined),
				budget: computed(() => undefined),
				creditsLabelKey: computed(() => 'generic.freeCredits'),
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

		it('restores the stored credential on mount when the node version loses gateway support', async () => {
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

			// Mount-time cleanup: the node's version no longer supports the gateway.
			vi.mocked(useAiGateway).mockReturnValue({
				isEnabled: computed(() => true),
				isCredentialTypeSupported: vi.fn((credType: string) => credType === 'googlePalmApi'),
				canServeCredentialType: vi.fn((credType: string) => credType === 'googlePalmApi'),
				isNodeTypeVersionSupported: vi.fn(() => false),
				isActionSupported: vi.fn(() => true),
				isActionOptionVisible: vi.fn(() => true),
				isNodePropertyHidden: vi.fn(() => false),
				balance: computed(() => undefined),
				budget: computed(() => undefined),
				creditsLabelKey: computed(() => 'generic.freeCredits'),
				fetchConfig: vi.fn().mockResolvedValue(undefined),
				fetchWallet: vi.fn().mockResolvedValue(undefined),
				saveAfterToggle: vi.fn().mockResolvedValue(undefined),
				fetchError: computed(() => null),
			});

			const { emitted } = renderComponent({
				props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' },
			});

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
			it('should track telemetry with mode "n8n_connect" when toggled ON by user', async () => {
				ndvStore.activeNode = googleAiNode;

				renderComponent({
					props: { node: googleAiNode, overrideCredType: 'googlePalmApi' },
				});

				await userEvent.click(
					within(screen.getByTestId('node-credentials-empty-state')).getByRole('combobox'),
				);
				await userEvent.click(screen.getByTestId('node-credentials-select-item-n8n-credits'));

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
					credential_id: null,
					credential_kind: 'n8n_connect',
					source: 'user',
				});
			});

			it('should not track telemetry when toggled ON automatically on mount', () => {
				// No credentials — auto-select path calls onAiGatewaySelector with isUserAction=false
				ndvStore.activeNode = googleAiNode;

				renderComponent({
					props: { node: googleAiNode, overrideCredType: 'googlePalmApi' },
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
				});

				await userEvent.click(
					within(screen.getByTestId('node-credentials-empty-state')).getByRole('combobox'),
				);
				await userEvent.click(screen.getByTestId('node-credentials-select-item-n8n-credits'));

				// The Instance AI setup card hosts NodeCredentials in standalone mode;
				// the confirmed selection is counted server-side as source: 'instance-ai-*'.
				expect(trackMock).not.toHaveBeenCalledWith('Node credential assigned', expect.anything());
			});
		});

		it('clears the managed slot on mount when the node version loses gateway support and no credential exists', async () => {
			credentialsStore.state.credentials = {};

			const nodeWithGateway: INodeUi = {
				...googleAiNode,
				credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
			};
			ndvStore.activeNode = nodeWithGateway;

			// Mount-time cleanup: the node's version no longer supports the gateway.
			vi.mocked(useAiGateway).mockReturnValue({
				isEnabled: computed(() => true),
				isCredentialTypeSupported: vi.fn((credType: string) => credType === 'googlePalmApi'),
				canServeCredentialType: vi.fn((credType: string) => credType === 'googlePalmApi'),
				isNodeTypeVersionSupported: vi.fn(() => false),
				isActionSupported: vi.fn(() => true),
				isActionOptionVisible: vi.fn(() => true),
				isNodePropertyHidden: vi.fn(() => false),
				balance: computed(() => undefined),
				budget: computed(() => undefined),
				creditsLabelKey: computed(() => 'generic.freeCredits'),
				fetchConfig: vi.fn().mockResolvedValue(undefined),
				fetchWallet: vi.fn().mockResolvedValue(undefined),
				saveAfterToggle: vi.fn().mockResolvedValue(undefined),
				fetchError: computed(() => null),
			});

			const { emitted } = renderComponent({
				props: { node: nodeWithGateway, overrideCredType: 'googlePalmApi' },
			});

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

		it('names the provider account the connection authenticates as', async () => {
			credentialsStore.state.credentials = {
				'private-cred-id': {
					...privateCredential,
					connectedByMe: true,
					connectedAccountIdentifier: 'jane@gmail.com',
				},
			};
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			expect(screen.getByTestId('node-credential-private-row')).toHaveTextContent(
				'Connected as jane@gmail.com',
			);
		});

		it('does not name the n8n account when the provider tells us no account', async () => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.usersById = {
				'user-1': { id: 'user-1', email: 'signed-in@n8n.io' } as IUser,
			};
			usersStore.currentUserId = 'user-1';
			credentialsStore.state.credentials = {
				'private-cred-id': { ...privateCredential, connectedByMe: true },
			};
			renderComponent({ props: { node: notionNode, overrideCredType: 'openAiApi' } });

			const row = screen.getByTestId('node-credential-private-row');
			expect(row).toHaveTextContent('Connected');
			expect(row).not.toHaveTextContent('signed-in@n8n.io');
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

		it('keeps the Connect button enabled in readonly mode for a user who can connect', async () => {
			// Connecting your own account is a personal action gated by the connect
			// scope, not by the node's readonly state (mirrors the credentials list).
			credentialsStore.state.credentials = {
				'private-cred-id': { ...privateCredential, connectedByMe: false },
			};
			renderComponent({
				props: { node: notionNode, overrideCredType: 'openAiApi', readonly: true },
			});

			expect(screen.getByTestId('node-credential-private-connect')).toBeEnabled();
		});

		it('keeps the Connected actions dropdown usable in readonly mode', async () => {
			credentialsStore.state.credentials = {
				'private-cred-id': { ...privateCredential, connectedByMe: true },
			};
			renderComponent({
				props: { node: notionNode, overrideCredType: 'openAiApi', readonly: true },
			});

			const dropdown = screen.getByTestId('node-credential-private-connected-actions');
			await userEvent.click(dropdown);

			expect(screen.getByText('Disconnect')).toBeInTheDocument();
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
