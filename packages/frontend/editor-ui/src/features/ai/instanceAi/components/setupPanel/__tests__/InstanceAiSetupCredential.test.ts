import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { computed, defineComponent, h, reactive, ref, type PropType } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE } from '@n8n/api-types';
import {
	DOMAIN_RESTRICTION_FIELDS,
	type ICredentialDataDecryptedObject,
	type ICredentialType,
	type INodeProperties,
} from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import type { IUpdateInformation } from '@/Interface';
import { AI_GATEWAY_MANAGED_TAG } from '../../../constants';
import InstanceAiSetupCredential from '../InstanceAiSetupCredential.vue';

const mocks = vi.hoisted(() => ({
	useRealForm: false,
	formOptions: vi.fn(),
	isOAuth: vi.fn(),
	canQuickConnect: vi.fn(),
	authorize: vi.fn(),
	authorizeExisting: vi.fn(),
	cancelAuthorize: vi.fn(),
	quickOption: vi.fn(),
	quickConnect: vi.fn(),
	cancelConnect: vi.fn(),
	showError: vi.fn(),
	track: vi.fn(),
	runHook: vi.fn().mockResolvedValue(undefined),
	openTopUp: vi.fn(),
}));
vi.mock('../../../composables/useSetupPanelDocument', () => ({ useSetupPanelDocument: vi.fn() }));
vi.mock('@/features/credentials/composables/useCredentialForm', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/credentials/composables/useCredentialForm')>();
	return {
		useCredentialForm: (options: Parameters<typeof actual.useCredentialForm>[0]) => {
			mocks.formOptions(options);
			return mocks.useRealForm ? actual.useCredentialForm(options) : form;
		},
	};
});
vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		isOAuthCredentialType: mocks.isOAuth,
		canOAuthCredentialQuickConnect: mocks.canQuickConnect,
		createAndAuthorize: mocks.authorize,
		authorizeExistingCredential: mocks.authorizeExisting,
		cancelAuthorize: mocks.cancelAuthorize,
	}),
}));
vi.mock('@/features/credentials/quickConnect/composables/useQuickConnect', () => ({
	useQuickConnect: () => ({
		getQuickConnectOption: mocks.quickOption,
		connect: mocks.quickConnect,
		cancelConnect: mocks.cancelConnect,
	}),
}));
vi.mock('@/app/composables/useAiGateway', () => ({ useAiGateway: () => gateway }));
vi.mock('@/app/composables/useAiGatewayTopUp', () => ({
	useAiGatewayTopUp: () => ({ openTopUp: mocks.openTopUp }),
}));
vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: () => ({ run: mocks.runHook }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: mocks.showError }) }));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track: mocks.track }) }));

function createForm() {
	const credentialData = ref<ICredentialDataDecryptedObject>({
		apiKey: '',
		homeProject: 'ui-only',
	});
	return {
		credentialData,
		credentialName: ref('Service account'),
		credentialPermissions: ref(getResourcePermissions(['credential:create']).credential),
		credentialType: ref({
			name: 'serviceApi',
			displayName: 'Service API',
			documentationUrl: 'service',
		}),
		credentialProperties: ref<INodeProperties[]>([
			{ name: 'apiKey', displayName: 'API key', type: 'string', default: '', required: true },
		]),
		parentTypes: ref<string[]>([]),
		isOAuthType: computed(
			() => mocks.isOAuth() && credentialData.value.grantType !== 'clientCredentials',
		),
		managedOAuthAvailable: computed(() => mocks.canQuickConnect()),
		isManagedOAuthMode: computed(() => mocks.isOAuth() && mocks.canQuickConnect()),
		setCredentialPropertyDefaults: vi.fn(),
		requiredPropertiesFilled: computed(() => Boolean(credentialData.value.apiKey)),
		showValidationWarning: ref(false),
		isCredentialTestable: ref(true),
		testedSuccessfully: ref(true),
		authError: ref(''),
		initialize: vi.fn().mockResolvedValue(undefined),
		testCredential: vi.fn().mockResolvedValue(undefined),
		onDataChange: vi.fn((update: IUpdateInformation) => {
			if (typeof update.value !== 'string') return false;
			credentialData.value = { ...credentialData.value, [update.name]: update.value };
			return true;
		}),
	};
}
let form: ReturnType<typeof createForm>;
let gateway: {
	isEnabled: ReturnType<typeof ref<boolean>>;
	balance: ReturnType<typeof ref<number>>;
	isCredentialTypeSupported: ReturnType<typeof vi.fn>;
	isNodeTypeVersionSupported: ReturnType<typeof vi.fn>;
	isActionSupported: ReturnType<typeof vi.fn>;
	fetchConfig: ReturnType<typeof vi.fn>;
	fetchWallet: ReturnType<typeof vi.fn>;
};
const InputStub = defineComponent({
	props: {
		credentialProperties: Array as PropType<INodeProperties[]>,
		credentialData: { type: Object as PropType<ICredentialDataDecryptedObject>, required: true },
	},
	emits: ['update'],
	setup(props, { emit }) {
		return () =>
			h('div', [
				h('input', {
					'aria-label': 'API key',
					value: props.credentialData.apiKey,
					onInput: (event: Event) =>
						emit('update', { name: 'apiKey', value: (event.target as HTMLInputElement).value }),
				}),
				h('output', { 'data-test-id': 'fields' }, JSON.stringify(props.credentialProperties)),
			]);
	},
});
const ExistingCredentialStub = defineComponent({
	props: ['workflowId', 'projectId', 'overrideCredType'],
	emits: ['credentialSelected'],
	setup(props, { emit }) {
		return () =>
			h(
				'button',
				{
					'data-workflow-id': props.workflowId,
					'data-project-id': props.projectId,
					onClick: () =>
						emit('credentialSelected', {
							properties: {
								credentials: { [props.overrideCredType]: { id: 'existing', name: 'Existing' } },
							},
						}),
				},
				'Select existing connection',
			);
	},
});
const item = {
	id: 'wf:credential:serviceApi',
	kind: 'credential',
	credentialType: 'serviceApi',
	nodeBindings: [{ nodeName: 'Service' }],
} as const;
const node = createTestNode({ name: 'Service', type: 'test.service' });
const savedCredential = mock<ICredentialsResponse>({
	isResolvable: false,
	id: 'new-credential',
	name: 'Service account',
	type: 'serviceApi',
	scopes: ['credential:read', 'credential:update'],
});
const renderComponent = createComponentRenderer(InstanceAiSetupCredential, {
	props: {
		item: { ...item, nodeBindings: [...item.nodeBindings] },
		node,
		nodes: [node],
		workflowId: 'wf',
		projectId: 'workflow-project',
	},
	global: {
		stubs: {
			CredentialInputs: InputStub,
			TemplatedAuthSimpleView: InputStub,
			NodeCredentials: ExistingCredentialStub,
		},
	},
});

describe('InstanceAiSetupCredential', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.useRealForm = false;
		setActivePinia(createTestingPinia());
		form = createForm();
		gateway = {
			isEnabled: ref(false),
			balance: ref(10),
			isCredentialTypeSupported: vi.fn().mockReturnValue(true),
			isNodeTypeVersionSupported: vi.fn().mockReturnValue(true),
			isActionSupported: vi.fn().mockReturnValue(true),
			fetchConfig: vi.fn().mockResolvedValue(undefined),
			fetchWallet: vi.fn().mockResolvedValue(undefined),
		};
		mocks.isOAuth.mockReturnValue(false);
		mocks.canQuickConnect.mockReturnValue(false);
		mocks.quickOption.mockReturnValue(undefined);
		mocks.authorize.mockResolvedValue(savedCredential);
		mockedStore(useCredentialsStore).fetchUsableCredentials.mockResolvedValue([]);
	});

	async function openMenu(rendered: ReturnType<typeof renderComponent>, label: string) {
		await userEvent.click(rendered.getByRole('button', { name: /More options|Change connection/ }));
		await userEvent.click(await rendered.findByRole('menuitem', { name: label }));
	}

	function renderRealForm(credentialType: string, types: ICredentialType[]) {
		mocks.useRealForm = true;
		const store = mockedStore(useCredentialsStore);
		store.getCredentialTypeByName = vi.fn((name) => types.find((type) => type.name === name));
		return renderComponent({
			props: { item: { ...item, credentialType, nodeBindings: [] }, node: undefined, nodes: [] },
			global: { stubs: { CredentialInputs: false } },
		});
	}

	it('offers per-node accounts only after a shared credential has been selected', async () => {
		const view = renderComponent({ props: { allowPerNode: true } });
		await userEvent.click(view.getByRole('button', { name: 'More options' }));
		expect(
			view.queryByRole('menuitem', { name: 'Set credentials per node' }),
		).not.toBeInTheDocument();
		await userEvent.keyboard('{Escape}');
		await view.rerender({
			node: {
				...node,
				credentials: { serviceApi: { id: savedCredential.id, name: savedCredential.name } },
			},
		});
		await openMenu(view, 'Set credentials per node');
		expect(view.emitted('setCredentialsPerNode')).toHaveLength(1);
		expect(mockedStore(useCredentialsStore).createNewCredential).not.toHaveBeenCalled();
	});

	it('shows the form without an action spinner while its credential name loads', async () => {
		const initialization = Promise.withResolvers<void>();
		form.initialize.mockReturnValueOnce(initialization.promise);
		const view = renderComponent({ global: { stubs: { CredentialInputs: false } } });
		expect(view.getByLabelText('API key')).toBeVisible();
		expect(view.getByRole('button', { name: 'Save' })).toBeDisabled();
		expect(view.queryByText(/This workflow needs/)).not.toBeInTheDocument();
		expect(view.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-busy', 'true');
		initialization.resolve();
		await flushPromises();
	});

	it('keeps the default GitHub server out of inline setup and preserves it when saving', async () => {
		const github: ICredentialType = {
			name: 'githubApi',
			displayName: 'GitHub API',
			properties: [
				{
					name: 'server',
					displayName: 'GitHub Server',
					type: 'string',
					default: 'https://api.github.com',
				},
				{ name: 'user', displayName: 'User', type: 'string', default: '' },
				{
					name: 'accessToken',
					displayName: 'Access Token',
					type: 'string',
					default: '',
					typeOptions: { password: true },
				},
			],
		};
		const store = mockedStore(useCredentialsStore);
		store.getNewCredentialName.mockResolvedValue('GitHub account');
		store.isCredentialTypeTestable = vi.fn().mockReturnValue(false);
		store.createNewCredential.mockResolvedValue(savedCredential);
		const view = renderRealForm('githubApi', [github]);
		await flushPromises();
		expect(view.queryByRole('button', { name: 'Advanced' })).not.toBeInTheDocument();
		expect(view.queryByRole('textbox', { name: 'GitHub Server' })).not.toBeInTheDocument();
		expect(view.getByLabelText('User')).toBeVisible();
		expect(view.getByLabelText('Access Token')).toBeVisible();
		await fireEvent.update(view.getByLabelText('User'), 'example-user');
		await fireEvent.update(view.getByLabelText('Access Token'), 'example-token');
		await fireEvent.click(view.getByRole('button', { name: 'Save' }));
		await flushPromises();
		expect(store.createNewCredential).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					server: 'https://api.github.com',
					user: 'example-user',
					accessToken: 'example-token',
				}),
			}),
			'workflow-project',
			undefined,
			{ skipStoreUpdate: true },
		);
		expect(mockedStore(useUIStore).openNewCredential).not.toHaveBeenCalled();
	});

	it('keeps OpenAI options in the Advanced setup menu and preserves their defaults on inline save', async () => {
		const openAi: ICredentialType = {
			name: 'openAiApi',
			displayName: 'OpenAI',
			properties: [
				{ name: 'apiKey', displayName: 'API key', type: 'string', default: '', required: true },
				{ name: 'organizationId', displayName: 'Organization ID', type: 'string', default: '' },
				{
					name: 'url',
					displayName: 'Base URL',
					type: 'string',
					default: 'https://api.openai.com/v1',
				},
				{ name: 'header', displayName: 'Add Custom Header', type: 'boolean', default: false },
				{
					name: 'headerName',
					displayName: 'Header Name',
					type: 'string',
					default: '',
					displayOptions: { show: { header: [true] } },
				},
				{
					name: 'headerValue',
					displayName: 'Header Value',
					type: 'string',
					typeOptions: { password: true },
					default: '',
					displayOptions: { show: { header: [true] } },
				},
				...DOMAIN_RESTRICTION_FIELDS,
			],
		};
		const store = mockedStore(useCredentialsStore);
		store.getNewCredentialName.mockResolvedValue('OpenAI account');
		store.isCredentialTypeTestable = vi.fn().mockReturnValue(false);
		store.createNewCredential.mockResolvedValue(savedCredential);
		const view = renderRealForm('openAiApi', [openAi]);
		await flushPromises();
		expect(view.queryByRole('button', { name: 'Advanced' })).not.toBeInTheDocument();
		expect(view.getByLabelText('API key')).toBeVisible();
		expect(view.getAllByRole('textbox')).toHaveLength(1);
		expect(view.queryByRole('switch')).not.toBeInTheDocument();
		expect(view.queryByRole('combobox')).not.toBeInTheDocument();
		await userEvent.click(view.getByRole('button', { name: 'Save' }));
		expect(view.getByLabelText('API key')).toHaveAttribute('aria-invalid', 'true');
		expect(view.getByRole('alert')).toHaveTextContent('This field is required');
		expect(store.createNewCredential).not.toHaveBeenCalled();
		await fireEvent.update(view.getByLabelText('API key'), 'example-key');
		await openMenu(view, 'Advanced setup');
		expect(mockedStore(useUIStore).openNewCredential.mock.calls[0][0]).toBe('openAiApi');
		await userEvent.click(view.getByRole('button', { name: 'Save' }));
		expect(store.createNewCredential).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					apiKey: 'example-key',
					organizationId: '',
					url: 'https://api.openai.com/v1',
					header: false,
					headerName: '',
					headerValue: '',
					allowedHttpRequestDomains: 'all',
					allowedDomains: '',
				},
			}),
			'workflow-project',
			undefined,
			{ skipStoreUpdate: true },
		);
	});

	it('includes visible OAuth fields and instance availability in its help request', async () => {
		mocks.isOAuth.mockReturnValue(true);
		form.credentialProperties.value = [
			{ name: 'clientId', displayName: 'Client ID', type: 'string', default: '', required: true },
			{
				name: 'clientSecret',
				displayName: 'Client Secret',
				type: 'string',
				default: '',
				required: true,
			},
		];
		const view = renderComponent();
		await fireEvent.click(view.getByRole('button', { name: 'Help me set this up' }));
		expect(view.emitted<[unknown]>('askForHelp')?.[0]?.[0]).toMatchObject({
			setupContext:
				"Selected OAuth mode: custom. Connection state: disconnected. The OAuth form asks for: Client ID, Client Secret. Managed OAuth isn't available on this instance. Help me configure my own OAuth app.",
		});
	});

	it('renders inherited OAuth fields and prefilled endpoint selectors inline', async () => {
		mocks.isOAuth.mockReturnValue(true);
		const types: ICredentialType[] = [
			{
				name: 'oAuth2Api',
				displayName: 'OAuth2 API',
				properties: [
					{
						name: 'grantType',
						displayName: 'Grant Type',
						type: 'hidden',
						default: 'authorizationCode',
					},
					{
						name: 'clientId',
						displayName: 'Client ID',
						type: 'string',
						default: '',
						required: true,
					},
					{
						name: 'clientSecret',
						displayName: 'Client Secret',
						type: 'string',
						default: '',
						required: true,
					},
				],
			},
			{
				name: 'zohoOAuth2Api',
				displayName: 'Zoho OAuth2 API',
				extends: ['oAuth2Api'],
				properties: [
					{
						name: 'authUrl',
						displayName: 'Authorization URL',
						type: 'options',
						required: true,
						default: 'https://accounts.zoho.com/oauth/v2/auth',
						options: [
							{
								name: 'Global authorization endpoint',
								value: 'https://accounts.zoho.com/oauth/v2/auth',
							},
						],
					},
					{
						name: 'accessTokenUrl',
						displayName: 'Access Token URL',
						type: 'options',
						required: true,
						default: 'https://accounts.zoho.com/oauth/v2/token',
						options: [
							{ name: 'US token endpoint', value: 'https://accounts.zoho.com/oauth/v2/token' },
						],
					},
				],
			},
		];
		const store = mockedStore(useCredentialsStore);
		store.getNewCredentialName.mockResolvedValue('Zoho account');
		const view = renderRealForm('zohoOAuth2Api', types);
		await flushPromises();
		const selectors = view.getAllByRole('combobox');
		expect(selectors).toHaveLength(2);
		expect(selectors[0]).toHaveValue('Global authorization endpoint');
		expect(selectors[1]).toHaveValue('US token endpoint');
		expect(view.queryByText('Grant Type')).not.toBeInTheDocument();
		await fireEvent.update(view.getByLabelText('Client ID'), 'example-client');
		await fireEvent.update(view.getByLabelText('Client Secret'), 'example-secret');
		await userEvent.click(view.getByRole('button', { name: 'Save and sign in' }));
		expect(mocks.authorize).toHaveBeenCalledWith(
			'zohoOAuth2Api',
			undefined,
			expect.objectContaining({
				data: {
					grantType: 'authorizationCode',
					clientId: 'example-client',
					clientSecret: 'example-secret',
					authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
					accessTokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
				},
			}),
		);
		expect(mockedStore(useUIStore).openNewCredential).not.toHaveBeenCalled();
	});

	it('shows default database fields and updates conditional controls through the shared form', async () => {
		const postgres: ICredentialType = {
			name: 'postgres',
			displayName: 'Postgres',
			properties: [
				{ name: 'host', displayName: 'Host', type: 'string', default: 'localhost' },
				{ name: 'database', displayName: 'Database', type: 'string', default: 'postgres' },
				{ name: 'user', displayName: 'User', type: 'string', default: 'postgres' },
				{
					name: 'password',
					displayName: 'Password',
					type: 'string',
					default: '',
					typeOptions: { password: true },
				},
				{ name: 'sshTunnel', displayName: 'SSH Tunnel', type: 'boolean', default: false },
				{
					name: 'sshHost',
					displayName: 'SSH Host',
					type: 'string',
					default: '',
					displayOptions: { show: { sshTunnel: [true] } },
				},
			],
		};
		const store = mockedStore(useCredentialsStore);
		store.getNewCredentialName.mockResolvedValue('Postgres account');
		store.isCredentialTypeTestable = vi.fn().mockReturnValue(false);
		store.createNewCredential.mockResolvedValue(savedCredential);
		const view = renderRealForm('postgres', [postgres]);
		await flushPromises();
		expect(view.getByLabelText('Host')).toHaveValue('localhost');
		expect(view.getByLabelText('Database')).toHaveValue('postgres');
		expect(view.getByLabelText('User')).toHaveValue('postgres');
		expect(view.queryByLabelText('SSH Host')).not.toBeInTheDocument();
		await userEvent.click(view.getByRole('switch'));
		await fireEvent.update(view.getByLabelText('SSH Host'), 'ssh.example.test');
		await fireEvent.update(view.getByLabelText('Password'), 'example-password');
		await userEvent.click(view.getByRole('button', { name: 'Save' }));
		expect(store.createNewCredential).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					host: 'localhost',
					database: 'postgres',
					user: 'postgres',
					password: 'example-password',
					sshTunnel: true,
					sshHost: 'ssh.example.test',
				},
			}),
			'workflow-project',
			undefined,
			{ skipStoreUpdate: true },
		);
		expect(mockedStore(useUIStore).openNewCredential).not.toHaveBeenCalled();
	});

	it.each([1, 2])(
		'saves %s inline inputs when legacy metadata omits required flags',
		async (count) => {
			form.credentialProperties.value = [
				...[
					{ name: 'apiKey', displayName: 'API key', type: 'string' as const, default: '' },
					{ name: 'apiUrl', displayName: 'API URL', type: 'string' as const, default: '' },
				].slice(0, count),
				...DOMAIN_RESTRICTION_FIELDS,
				{ name: 'notice', displayName: 'Help text', type: 'notice', default: '' },
				{
					name: 'callback',
					displayName: 'Callback URL',
					type: 'string',
					default: '',
					typeOptions: { copyButton: true },
				},
			];
			form.credentialData.value.allowedHttpRequestDomains = 'domains';
			form.credentialData.value.allowedDomains = 'example.test';
			const store = mockedStore(useCredentialsStore);
			store.createNewCredential.mockResolvedValue(savedCredential);
			const rendered = renderComponent({ global: { stubs: { CredentialInputs: false } } });
			await flushPromises();
			expect(rendered.getAllByRole('textbox')).toHaveLength(count);
			expect(rendered.queryByLabelText('Allowed Domains')).not.toBeInTheDocument();
			expect(rendered.getByText('Help text')).toBeVisible();
			expect(rendered.getByText('Callback URL')).toBeVisible();
			await fireEvent.update(rendered.getByLabelText('API key'), 'submitted-key');
			if (count === 2)
				await fireEvent.update(rendered.getByLabelText('API URL'), 'https://example.test');
			await fireEvent.click(rendered.getByRole('button', { name: 'Save' }));
			await flushPromises();
			expect(store.createNewCredential).toHaveBeenCalledWith(
				expect.objectContaining({
					data: {
						apiKey: 'submitted-key',
						allowedHttpRequestDomains: 'domains',
						allowedDomains: 'example.test',
						...(count === 2 ? { apiUrl: 'https://example.test' } : {}),
					},
				}),
				'workflow-project',
				undefined,
				{ skipStoreUpdate: true },
			);
			expect(rendered.emitted<[unknown, string]>('bindCredential')?.[0][1]).toBe(
				savedCredential.id,
			);
			expect(mockedStore(useUIStore).openNewCredential).not.toHaveBeenCalled();
		},
	);

	it('uses the modal when the shared form has no visible fields', async () => {
		form.credentialProperties.value = [];
		const rendered = renderComponent({ global: { stubs: { CredentialInputs: false } } });
		await flushPromises();
		expect(rendered.queryAllByRole('textbox')).toHaveLength(0);
		await fireEvent.click(rendered.getByRole('button', { name: 'Connect' }));
		expect(mockedStore(useUIStore).openNewCredential).toHaveBeenCalled();
		expect(mockedStore(useCredentialsStore).createNewCredential).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'validates on submission without starting a connection, OAuth: %s',
		async (isOAuth) => {
			mocks.isOAuth.mockReturnValue(isOAuth);
			const view = renderComponent({ global: { stubs: { CredentialInputs: false } } });
			await flushPromises();
			await fireEvent.blur(view.getByLabelText('API key'));
			expect(view.queryByRole('alert')).toBeNull();
			await fireEvent.click(
				view.getByRole('button', { name: isOAuth ? 'Save and sign in' : 'Save' }),
			);
			expect(view.getByRole('alert')).toHaveTextContent('This field is required');
			expect(mockedStore(useCredentialsStore).createNewCredential).not.toHaveBeenCalled();
			expect(mocks.authorize).not.toHaveBeenCalled();
		},
	);

	it.each(['https://generativelanguage.googleapis.com', 'https://gemini.example.test'])(
		'keeps Gemini Host out of inline setup and preserves it: %s',
		async (host) => {
			const defaultHost = 'https://generativelanguage.googleapis.com';
			form.credentialData.value = { apiKey: 'test-key', host };
			form.credentialProperties.value = [
				{ name: 'host', displayName: 'Host', type: 'string', default: defaultHost, required: true },
				{ name: 'apiKey', displayName: 'API key', type: 'string', default: '', required: true },
			];
			mockedStore(useCredentialsStore).createNewCredential.mockResolvedValue(savedCredential);
			const view = renderComponent({
				props: {
					item: { ...item, nodeBindings: [...item.nodeBindings], credentialType: 'googlePalmApi' },
				},
				global: { stubs: { CredentialInputs: false } },
			});
			await flushPromises();
			expect(view.queryByRole('button', { name: 'Advanced' })).not.toBeInTheDocument();
			expect(view.queryByRole('textbox', { name: 'Host' })).not.toBeInTheDocument();
			await fireEvent.click(view.getByRole('button', { name: 'Save' }));
			await flushPromises();
			expect(mockedStore(useCredentialsStore).createNewCredential).toHaveBeenCalledWith(
				expect.objectContaining({ data: { apiKey: 'test-key', host } }),
				'workflow-project',
				undefined,
				{ skipStoreUpdate: true },
			);
		},
	);

	it.each([
		{ readOnly: true, readFails: false },
		{ readOnly: true, readFails: true },
		{ readOnly: false, readFails: false },
		{ readOnly: false, readFails: true },
	])(
		'keeps unavailable OAuth data complete only for read-only credentials: $readOnly, failure: $readFails',
		async ({ readOnly, readFails }) => {
			mocks.isOAuth.mockReturnValue(true);
			const credential: ICredentialsResponse = {
				...savedCredential,
				scopes: readOnly ? ['credential:read'] : ['credential:read', 'credential:update'],
			};
			const store = mockedStore(useCredentialsStore);
			store.getCredentialById = vi.fn().mockReturnValue(credential);
			if (readFails) store.getCredentialData.mockRejectedValue(new Error('Request failed'));
			else store.getCredentialData.mockResolvedValue({ ...credential, data: undefined });
			const view = renderComponent({
				props: {
					node: {
						...node,
						credentials: { serviceApi: { id: credential.id, name: credential.name } },
					},
				},
			});
			await flushPromises();
			expect(view.queryByRole('button', { name: 'Connect my account' }) !== null).toBe(!readOnly);
			expect(view.queryByText('Credential selected') !== null).toBe(readOnly);
		},
	);

	it('keeps the same sign-in button available without creating another credential', async () => {
		mocks.isOAuth.mockReturnValue(true);
		form.credentialProperties.value = [
			{ name: 'clientId', displayName: 'Client ID', type: 'string', default: '', required: true },
			{
				name: 'clientSecret',
				displayName: 'Client Secret',
				type: 'string',
				default: '',
				required: true,
			},
		];
		const credential = reactive({ ...savedCredential });
		mockedStore(useCredentialsStore).getCredentialById = vi.fn().mockReturnValue(credential);
		mockedStore(useCredentialsStore).getCredentialData.mockResolvedValue({
			...credential,
			data: { clientId: 'client', clientSecret: '__n8n_BLANK_VALUE' },
		});
		const authorization = Promise.withResolvers<ICredentialsResponse | null>();
		const reopen = vi.fn();
		mocks.authorizeExisting.mockImplementationOnce((_credential, options) => {
			options.onAuthorizationStarted(reopen);
			return authorization.promise;
		});
		const view = renderComponent({
			props: {
				node: {
					...node,
					credentials: { serviceApi: { id: credential.id, name: credential.name } },
				},
			},
		});
		await flushPromises();
		expect(view.queryByText('Credential selected')).toBeNull();
		await fireEvent.click(view.getByRole('button', { name: 'Help me set this up' }));
		expect(view.emitted('askForHelp')?.[0]).toEqual([
			expect.objectContaining({
				id: credential.id,
				setupContext: expect.stringContaining(
					'Selected OAuth mode: custom. Connection state: disconnected.',
				),
			}),
		]);
		await fireEvent.click(view.getByRole('button', { name: 'Connect my account' }));
		expect(view.getByRole('button', { name: 'Connect my account' })).toBeEnabled();
		expect(view.queryByRole('button', { name: 'Reopen sign-in' })).toBeNull();
		expect(view.queryByRole('button', { name: 'Cancel' })).toBeNull();
		await fireEvent.click(view.getByRole('button', { name: 'Connect my account' }));
		expect(reopen).toHaveBeenCalledOnce();
		expect(mocks.authorizeExisting).toHaveBeenCalledOnce();
		authorization.resolve(null);
		await flushPromises();
		expect(view.getByRole('button', { name: 'Connect my account' })).toBeEnabled();
		expect(mocks.authorizeExisting).toHaveBeenCalledWith(
			credential,
			expect.objectContaining({ workflowId: 'wf' }),
		);
		expect(mocks.authorize).not.toHaveBeenCalled();
		expect(view.emitted('bindCredential')).toBeUndefined();
	});

	it('uses edited fields for the next attempt instead of reopening the old sign-in', async () => {
		mocks.isOAuth.mockReturnValue(true);
		const authorization = Promise.withResolvers<ICredentialsResponse | null>();
		const reopen = vi.fn();
		mocks.authorize
			.mockImplementationOnce((_type, _node, options) => {
				options.onAuthorizationStarted(reopen);
				return authorization.promise;
			})
			.mockResolvedValueOnce(null);
		const view = renderComponent();
		await flushPromises();
		await fireEvent.update(view.getByLabelText('API key'), 'first');
		await fireEvent.click(view.getByRole('button', { name: 'Save and sign in' }));
		expect(view.getByRole('button', { name: 'Save and sign in' })).toBeEnabled();
		await fireEvent.update(view.getByLabelText('API key'), 'updated');
		expect(mocks.cancelAuthorize).toHaveBeenCalledOnce();
		authorization.resolve(null);
		await flushPromises();
		await fireEvent.click(view.getByRole('button', { name: 'Save and sign in' }));
		await flushPromises();
		expect(reopen).not.toHaveBeenCalled();
		expect(mocks.authorize).toHaveBeenLastCalledWith(
			'serviceApi',
			node.type,
			expect.objectContaining({ data: { apiKey: 'updated' } }),
		);
	});

	it('shows required and optional fields and tests the key before binding it in the workflow project', async () => {
		form.credentialProperties.value.push({
			name: 'optional',
			displayName: 'Optional',
			type: 'string',
			default: '',
		});
		const rendered = renderComponent();
		const store = mockedStore(useCredentialsStore);
		store.createNewCredential.mockResolvedValue(savedCredential);
		const test = Promise.withResolvers<void>();
		form.testCredential.mockReturnValue(test.promise);
		await flushPromises();
		expect(rendered.getByTestId('fields')).toHaveTextContent('apiKey');
		expect(rendered.getByTestId('fields')).toHaveTextContent('optional');
		expect(rendered.getByRole('button', { name: 'Save' })).toBeEnabled();
		await fireEvent.update(rendered.getByLabelText('API key'), 'submitted-key');
		await fireEvent.click(rendered.getByRole('button', { name: 'Save' }));
		await flushPromises();
		expect(store.createNewCredential).toHaveBeenCalledWith(
			expect.objectContaining({ data: { apiKey: 'submitted-key' } }),
			'workflow-project',
			undefined,
			{ skipStoreUpdate: true },
		);
		expect(rendered.emitted<[unknown, string]>('bindCredential')).toBeUndefined();
		expect(store.upsertCredential).not.toHaveBeenCalled();
		test.resolve();
		await flushPromises();
		expect(store.fetchUsableCredentials).toHaveBeenCalledWith({ workflowId: 'wf' });
		expect(rendered.emitted<[unknown, string]>('bindCredential')?.[0]).toEqual([
			item,
			savedCredential.id,
		]);
	});

	it('removes a failed credential and keeps the key available for correction and retry', async () => {
		const rendered = renderComponent();
		const store = mockedStore(useCredentialsStore);
		store.createNewCredential.mockResolvedValue(savedCredential);
		form.testedSuccessfully.value = false;
		await flushPromises();
		await fireEvent.update(rendered.getByLabelText('API key'), 'wrong');
		await fireEvent.click(rendered.getByRole('button', { name: 'Save' }));
		await flushPromises();
		expect(rendered.emitted<[unknown, string]>('bindCredential')).toBeUndefined();
		expect(store.deleteCredential).toHaveBeenCalledWith({ id: savedCredential.id });
		expect(rendered.getByLabelText('API key')).toHaveValue('wrong');
		form.testedSuccessfully.value = true;
		await fireEvent.update(rendered.getByLabelText('API key'), 'correct');
		await fireEvent.click(rendered.getByRole('button', { name: 'Save' }));
		await flushPromises();
		expect(store.createNewCredential).toHaveBeenCalledTimes(2);
		expect(store.createNewCredential).toHaveBeenLastCalledWith(
			expect.objectContaining({ data: { apiKey: 'correct' } }),
			'workflow-project',
			undefined,
			{ skipStoreUpdate: true },
		);
		expect(rendered.emitted<[unknown, string]>('bindCredential')).toHaveLength(1);
	});

	it('saves client credentials without starting an interactive OAuth flow', async () => {
		mocks.isOAuth.mockReturnValue(true);
		mocks.canQuickConnect.mockReturnValue(true);
		form.credentialData.value.grantType = 'clientCredentials';
		const rendered = renderComponent();
		mockedStore(useCredentialsStore).createNewCredential.mockResolvedValue(savedCredential);
		await flushPromises();
		await fireEvent.update(rendered.getByLabelText('API key'), 'client-secret');
		await fireEvent.click(rendered.getByRole('button', { name: 'Save' }));
		await flushPromises();
		expect(mocks.authorize).not.toHaveBeenCalled();
		expect(rendered.emitted('bindCredential')).toEqual([[item, savedCredential.id]]);
	});

	it('binds a saved key even if refreshing the picker fails', async () => {
		const rendered = renderComponent();
		const store = mockedStore(useCredentialsStore);
		store.createNewCredential.mockResolvedValue(savedCredential);
		store.fetchUsableCredentials.mockRejectedValueOnce(new Error('Refresh failed'));
		await flushPromises();
		await fireEvent.update(rendered.getByLabelText('API key'), 'key');
		await fireEvent.click(rendered.getByRole('button', { name: 'Save' }));
		await flushPromises();
		expect(store.createNewCredential).toHaveBeenCalledOnce();
		expect(rendered.emitted('bindCredential')).toEqual([[item, savedCredential.id]]);
	});

	it.each([false, true])(
		'preserves a later edit when a pending credential save completes, OAuth: %s',
		async (isOAuth) => {
			mocks.isOAuth.mockReturnValue(isOAuth);
			const request = Promise.withResolvers<ICredentialsResponse>();
			mocks.authorize.mockReturnValue(request.promise);
			const rendered = renderComponent();
			mockedStore(useCredentialsStore).createNewCredential.mockReturnValue(request.promise);
			await flushPromises();
			await fireEvent.update(rendered.getByLabelText('API key'), 'first');
			await fireEvent.click(
				rendered.getByRole('button', { name: isOAuth ? 'Save and sign in' : 'Save' }),
			);
			await fireEvent.update(rendered.getByLabelText('API key'), 'later');
			request.resolve(savedCredential);
			await flushPromises();
			await rendered.rerender({
				node: {
					...node,
					credentials: { serviceApi: { id: savedCredential.id, name: savedCredential.name } },
				},
			});
			expect(rendered.getByLabelText('API key')).toHaveValue('later');
			expect(
				rendered.getByRole('button', { name: isOAuth ? 'Save and sign in' : 'Save' }),
			).toBeEnabled();
		},
	);

	it('reuses managed OAuth and leaves the current account unchanged on cancellation', async () => {
		mocks.isOAuth.mockReturnValue(true);
		mocks.canQuickConnect.mockReturnValue(true);
		mockedStore(useCredentialsStore).getCredentialData.mockResolvedValue({
			...savedCredential,
			data: { oauthTokenData: true },
		});
		const authorization = Promise.withResolvers<ICredentialsResponse | null>();
		const reopen = vi.fn();
		mocks.authorize.mockImplementationOnce((_type, _node, options) => {
			options.onAuthorizationStarted(reopen);
			return authorization.promise;
		});
		const rendered = renderComponent({
			props: {
				node: { ...node, credentials: { serviceApi: { id: 'existing', name: 'Current account' } } },
			},
		});
		await flushPromises();
		expect(form.initialize).not.toHaveBeenCalled();
		await openMenu(rendered, 'Switch account');
		expect(mocks.authorize).toHaveBeenCalledWith(
			'serviceApi',
			'test.service',
			expect.objectContaining({ workflowId: 'wf', projectId: 'workflow-project' }),
		);
		await fireEvent.click(rendered.getByRole('button', { name: 'Connect' }));
		expect(reopen).toHaveBeenCalledOnce();
		expect(mocks.authorize).toHaveBeenCalledOnce();
		authorization.resolve(null);
		await flushPromises();
		expect(rendered.getByText('Current account')).toBeVisible();
		expect(rendered.emitted<[unknown, string]>('bindCredential')).toBeUndefined();
	});

	it('offers managed OAuth as an alternative to an advanced custom OAuth connection', async () => {
		mocks.isOAuth.mockReturnValue(true);
		mocks.canQuickConnect.mockReturnValue(true);
		mocks.authorize.mockResolvedValue(null);
		mockedStore(useCredentialsStore).getCredentialById = vi.fn().mockReturnValue({
			...savedCredential,
			name: 'Custom account',
		});
		mockedStore(useCredentialsStore).getCredentialData.mockResolvedValue({
			...savedCredential,
			data: { clientId: 'client', clientSecret: '__n8n_BLANK_VALUE', oauthTokenData: true },
		});
		const rendered = renderComponent({
			props: {
				node: {
					...node,
					credentials: { serviceApi: { id: savedCredential.id, name: 'Custom account' } },
				},
			},
		});
		await flushPromises();
		await openMenu(rendered, 'Connect with OAuth instead');
		expect(mockedStore(useCredentialsStore).getCredentialData).toHaveBeenCalledWith({
			id: savedCredential.id,
		});
		expect(mocks.authorize).toHaveBeenCalledWith(
			'serviceApi',
			node.type,
			expect.objectContaining({ data: undefined }),
		);
		expect(rendered.getByText('Custom account')).toBeVisible();
		expect(rendered.emitted('bindCredential')).toBeUndefined();
	});

	it('reuses API-key quick connect with the setup workflow and project', async () => {
		mocks.quickOption.mockReturnValue({});
		mocks.quickConnect.mockResolvedValue(savedCredential);
		const rendered = renderComponent();
		await flushPromises();
		await fireEvent.click(rendered.getByRole('button', { name: 'Connect' }));
		await flushPromises();
		expect(mocks.quickConnect).toHaveBeenCalledWith({
			credentialTypeName: 'serviceApi',
			nodeType: node.type,
			serviceName: 'Service',
			source: 'credential_type',
			projectId: 'workflow-project',
			workflowId: 'wf',
		});
		expect(rendered.emitted<[unknown, string]>('bindCredential')?.[0][1]).toBe(savedCredential.id);
	});

	it('passes self-hosted OAuth form data and callback context to the shared flow', async () => {
		mocks.isOAuth.mockReturnValue(true);
		const rendered = renderComponent();
		mockedStore(useRootStore).OAuthCallbackUrls = { oauth2: 'https://example.com/oauth2/callback' };
		await flushPromises();
		expect(rendered.getByDisplayValue('https://example.com/oauth2/callback')).toBeVisible();
		await fireEvent.update(rendered.getByLabelText('API key'), 'client-secret');
		await fireEvent.click(rendered.getByRole('button', { name: 'Save and sign in' }));
		await flushPromises();
		expect(mocks.authorize).toHaveBeenCalledWith('serviceApi', 'test.service', {
			workflowId: 'wf',
			projectId: 'workflow-project',
			data: { apiKey: 'client-secret' },
			name: 'Service account',
			onAuthorizationStarted: expect.any(Function),
		});
	});

	it('opens Advanced setup with the recipe and binds its created credential', async () => {
		const setupHint = {
			template: { headers: { Authorization: '{{api_key}}' } },
			placeholders: [{ name: 'api_key', title: 'API key' }],
		};
		form.credentialData.value.template = JSON.stringify(setupHint.template);
		form.credentialData.value.placeholderDefs = JSON.stringify(setupHint.placeholders);
		const rendered = renderComponent({
			props: {
				item: {
					...item,
					nodeBindings: [],
					credentialType: TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
					setupHint,
				},
			},
		});
		await flushPromises();
		expect(mocks.formOptions.mock.calls[0][0].setupHint()).toEqual(setupHint);
		await openMenu(rendered, 'Advanced setup');
		const ui = mockedStore(useUIStore);
		expect(ui.openNewCredential).toHaveBeenCalledWith(
			TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
			false,
			true,
			'workflow-project',
			undefined,
			'Service',
			node,
			expect.objectContaining({
				credentialSetupHint: setupHint,
				workflowId: 'wf',
				closeOnSave: true,
			}),
		);
		ui.openNewCredential.mock.calls[0][7]?.onCredentialCreated?.(savedCredential);
		expect(rendered.emitted<[unknown, string]>('bindCredential')?.[0][1]).toBe(savedCredential.id);
	});

	it.each(['', JSON.stringify({ headers: { 'X-Client': 'n8n' } })])(
		'opens Advanced setup directly when the custom-auth template has no input markers: %s',
		async (template) => {
			form.credentialData.value.template = template;
			const rendered = renderComponent({
				props: {
					item: {
						...item,
						nodeBindings: [...item.nodeBindings],
						credentialType: TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
					},
				},
				global: { stubs: { TemplatedAuthSimpleView: false } },
			});
			await flushPromises();
			expect(rendered.queryByTestId('templated-auth-simple-view')).not.toBeInTheDocument();
			expect(rendered.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
			expect(rendered.queryByRole('button', { name: 'More options' })).not.toBeInTheDocument();
			await fireEvent.click(rendered.getByRole('button', { name: 'Advanced setup' }));
			const ui = mockedStore(useUIStore);
			expect(ui.openNewCredential).toHaveBeenCalledWith(
				TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
				false,
				true,
				'workflow-project',
				undefined,
				'Service',
				node,
				expect.objectContaining({ workflowId: 'wf', closeOnSave: true }),
			);
			ui.openNewCredential.mock.calls[0][7]?.onCredentialCreated?.(savedCredential);
			expect(rendered.emitted<[unknown, string]>('bindCredential')?.[0][1]).toBe(
				savedCredential.id,
			);
			expect(mockedStore(useCredentialsStore).createNewCredential).not.toHaveBeenCalled();
		},
	);

	it('recovers initialization failures and cancels pending connections when closed', async () => {
		form.initialize.mockRejectedValueOnce(new Error('offline'));
		const rendered = renderComponent();
		await flushPromises();
		expect(rendered.getByRole('button', { name: 'Save' })).toBeDisabled();
		await fireEvent.click(rendered.getByRole('button', { name: 'Retry' }));
		await flushPromises();
		expect(form.initialize).toHaveBeenCalledTimes(2);
		expect(rendered.queryByRole('button', { name: 'Retry' })).toBeNull();
		rendered.unmount();
		expect(mocks.cancelAuthorize).toHaveBeenCalled();
		expect(mocks.cancelConnect).toHaveBeenCalled();
	});

	it.each([false, true])(
		'reuses the scoped picker for existing and private credentials, private: %s',
		async (isPrivate) => {
			const store = mockedStore(useCredentialsStore);
			const credential = { ...savedCredential, isResolvable: isPrivate };
			store.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
			store.getUsableCredentialByType = vi.fn().mockReturnValue([credential]);
			store.getCredentialById = vi.fn().mockReturnValue(credential);
			const rendered = renderComponent({
				props: {
					node: isPrivate
						? {
								...node,
								credentials: { serviceApi: { id: savedCredential.id, name: savedCredential.name } },
							}
						: node,
				},
			});
			await flushPromises();
			expect(rendered.queryByLabelText('API key')).toBeNull();
			const picker = rendered.getByRole('button', { name: 'Select existing connection' });
			expect(picker).toHaveAttribute('data-project-id', 'workflow-project');
			expect(picker).toHaveAttribute('data-workflow-id', 'wf');
			await fireEvent.click(picker);
			expect(rendered.emitted<[unknown, string]>('bindCredential')?.[0][1]).toBe('existing');
			expect(store.createNewCredential).not.toHaveBeenCalled();
		},
	);

	it('offers an existing credential before the announced workflow node exists', async () => {
		const store = mockedStore(useCredentialsStore);
		store.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
		store.getUsableCredentialByType = vi.fn().mockReturnValue([savedCredential]);
		const rendered = renderComponent({ props: { node: undefined, nodes: [] } });
		await flushPromises();
		expect(rendered.queryByLabelText('API key')).toBeNull();
		await userEvent.click(rendered.getByRole('combobox'));
		const option = rendered.getByRole('option', { name: /Service account/ });
		expect(rendered.container.contains(option)).toBe(false);
		await userEvent.click(option);
		expect(rendered.emitted<[unknown, string]>('bindCredential')?.[0][1]).toBe(savedCredential.id);
		expect(store.createNewCredential).not.toHaveBeenCalled();
		await rendered.rerender({
			pendingCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		expect(rendered.getByTitle(savedCredential.name)).toBeVisible();
		expect(rendered.getByRole('status')).toHaveTextContent('Credential selected');
		expect(rendered.queryByLabelText('API key')).toBeNull();
	});

	it('asks for help with service and field context without submitting the key', async () => {
		const rendered = renderComponent();
		await flushPromises();
		await fireEvent.update(rendered.getByLabelText('API key'), 'private-draft');
		await userEvent.click(rendered.getByRole('button', { name: 'Help me find my API key' }));
		expect(rendered.emitted('askForHelp')).toEqual([
			[
				expect.objectContaining({
					credentialType: 'serviceApi',
					displayName: 'Service',
					placeholderTitles: ['API key'],
					documentationUrl: expect.stringContaining('/service/'),
				}),
			],
		]);
		expect(JSON.stringify(rendered.emitted('askForHelp'))).not.toContain('private-draft');
		expect(rendered.getByLabelText('API key')).toHaveValue('private-draft');
		await rendered.rerender({ helpDisabled: true });
		expect(rendered.getByRole('button', { name: 'Help me find my API key' })).toBeDisabled();
	});

	it('explains why Help is unavailable while the assistant is building', async () => {
		const view = renderComponent({ props: { helpDisabled: true } });
		const button = view.getByRole('button', { name: 'Help me find my API key' });
		expect(button).toBeDisabled();
		await userEvent.hover(button.parentElement!);
		expect(await view.findByTestId('tooltip-content')).toHaveTextContent(
			'The assistant is still working. Help will be available when it finishes.',
		);
		await userEvent.click(button);
		expect(view.emitted('askForHelp')).toBeUndefined();
	});

	it.each([false, true])(
		'lets users return to their existing credential through the menu, credits: %s',
		async (useCredits) => {
			const store = mockedStore(useCredentialsStore);
			store.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
			store.getUsableCredentialByType = vi.fn().mockReturnValue([savedCredential]);
			const rendered = renderComponent({
				props: { pendingCredential: { id: savedCredential.id, name: savedCredential.name } },
			});
			await flushPromises();
			await userEvent.click(rendered.getByRole('button', { name: 'Change connection' }));
			expect(rendered.queryByRole('menuitem', { name: 'Use an existing credential' })).toBeNull();
			await userEvent.click(rendered.getByRole('menuitem', { name: 'Create new credential' }));
			await flushPromises();
			await fireEvent.update(rendered.getByLabelText('API key'), 'draft-key');
			if (useCredits) {
				gateway.isEnabled.value = true;
				await flushPromises();
				await userEvent.click(rendered.getByRole('radio', { name: 'Gateway credits' }));
			}
			expect(rendered.queryByRole('button', { name: 'Use an existing credential' })).toBeNull();
			await openMenu(rendered, 'Use an existing credential');
			expect(rendered.getByRole('button', { name: 'Select existing connection' })).toBeVisible();
			await userEvent.click(rendered.getByRole('button', { name: 'Cancel' }));
			if (useCredits)
				await userEvent.click(rendered.getByRole('radio', { name: 'Use my API key' }));
			expect(rendered.getByLabelText('API key')).toHaveValue('draft-key');
			await openMenu(rendered, 'Use an existing credential');
			await userEvent.click(rendered.getByRole('button', { name: 'Select existing connection' }));
			expect(rendered.emitted<[unknown, string]>('bindCredential')?.[0][1]).toBe('existing');
			expect(store.createNewCredential).not.toHaveBeenCalled();
		},
	);

	it('reconciles a newly saved binding without opening a new OAuth form', async () => {
		mocks.isOAuth.mockReturnValue(true);
		const rendered = renderComponent();
		await flushPromises();
		expect(rendered.getByLabelText('API key')).toBeVisible();
		await rendered.rerender({
			node: { ...node, credentials: { serviceApi: { id: 'existing', name: 'Existing account' } } },
		});
		await flushPromises();
		expect(rendered.queryByLabelText('API key')).toBeNull();
		expect(rendered.getByText('Existing account')).toBeVisible();
		expect(mocks.authorize).not.toHaveBeenCalled();
	});

	it('does not bind a pending API key after its detail has closed', async () => {
		const pending = Promise.withResolvers<ICredentialsResponse>();
		const rendered = renderComponent();
		mockedStore(useCredentialsStore).createNewCredential.mockReturnValue(pending.promise);
		await flushPromises();
		await fireEvent.update(rendered.getByLabelText('API key'), 'key');
		await fireEvent.click(rendered.getByRole('button', { name: 'Save' }));
		rendered.unmount();
		pending.resolve(savedCredential);
		await flushPromises();
		expect(rendered.emitted<[unknown, string]>('bindCredential')).toBeUndefined();
		expect(mockedStore(useCredentialsStore).fetchUsableCredentials).not.toHaveBeenCalled();
	});

	it('binds Gateway credits as a managed selection and allows switching to an own key', async () => {
		gateway.isEnabled.value = true;
		const rendered = renderComponent();
		await flushPromises();
		await fireEvent.click(rendered.getByRole('button', { name: 'Use credits' }));
		expect(rendered.emitted<[unknown, string]>('bindCredential')?.[0][1]).toBe(
			AI_GATEWAY_MANAGED_TAG,
		);
		expect(mockedStore(useCredentialsStore).createNewCredential).not.toHaveBeenCalled();
		await rendered.rerender({
			node: {
				...node,
				credentials: { serviceApi: { id: null, name: '', __aiGatewayManaged: true } },
			},
		});
		await openMenu(rendered, 'Use my API key');
		await flushPromises();
		expect(rendered.getByLabelText('API key')).toBeVisible();
		expect(rendered.getByRole('button', { name: 'Save' })).toBeEnabled();
	});

	it('starts a requested new account on the own-key form', async () => {
		gateway.isEnabled.value = true;
		const rendered = renderComponent({
			props: { item: { ...item, nodeBindings: [], preferNew: true } },
		});
		await flushPromises();
		expect(rendered.getByLabelText('API key')).toBeVisible();
		expect(rendered.queryByRole('button', { name: 'Use credits' })).toBeNull();
		expect(mockedStore(useCredentialsStore).createNewCredential).not.toHaveBeenCalled();
	});

	it.each([
		{ reason: 'version', reverse: false },
		{ reason: 'version', reverse: true },
		{ reason: 'action', reverse: false },
		{ reason: 'unsupported', reverse: false },
	])('omits Gateway when a node fails $reason, reversed: $reverse', async ({ reason, reverse }) => {
		gateway.isEnabled.value = true;
		if (reason === 'version')
			gateway.isNodeTypeVersionSupported.mockImplementation(
				(_type: string, version: number) => version === 1,
			);
		if (reason === 'action') gateway.isActionSupported.mockReturnValue(false);
		const boundNode = {
			...node,
			type: reason === 'unsupported' ? 'n8n-nodes-base.httpRequest' : node.type,
			typeVersion: 2,
			parameters: { operation: 'send' },
		};
		const nodes = [{ ...node, typeVersion: 1 }, boundNode];
		const rendered = renderComponent({ props: { nodes: reverse ? nodes.toReversed() : nodes } });
		await flushPromises();
		expect(rendered.queryByRole('button', { name: 'Use credits' })).toBeNull();
		expect(rendered.getByRole('button', { name: 'Save' })).toBeVisible();
	});
});
