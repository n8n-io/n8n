import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { computed, defineComponent, h, ref, type PropType } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE } from '@n8n/api-types';
import type { ICredentialDataDecryptedObject, INodeProperties } from 'n8n-workflow';
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
	formOptions: vi.fn(),
	isOAuth: vi.fn(),
	canQuickConnect: vi.fn(),
	authorize: vi.fn(),
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
vi.mock('@/features/credentials/composables/useCredentialForm', () => ({
	useCredentialForm: (options: unknown) => {
		mocks.formOptions(options);
		return form;
	},
}));
vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		isOAuthCredentialType: mocks.isOAuth,
		canOAuthCredentialQuickConnect: mocks.canQuickConnect,
		createAndAuthorize: mocks.authorize,
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
			{ name: 'optional', displayName: 'Optional', type: 'string', default: '' },
			{ name: 'hidden', displayName: 'Hidden', type: 'hidden', default: '', required: true },
		]),
		parentTypes: ref<string[]>([]),
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
	id: 'new-credential',
	name: 'Service account',
	type: 'serviceApi',
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
	});

	async function openMenu(rendered: ReturnType<typeof renderComponent>, label: string) {
		await userEvent.click(rendered.getByRole('button', { name: /More options|Change connection/ }));
		await userEvent.click(await rendered.findByRole('menuitem', { name: label }));
	}

	it('uses the existing modal when legacy metadata does not identify required fields', async () => {
		form.credentialProperties.value = form.credentialProperties.value.map((property) => ({
			...property,
			required: false,
		}));
		const rendered = renderComponent();
		await flushPromises();
		await fireEvent.click(rendered.getByRole('button', { name: 'Connect' }));
		expect(mockedStore(useUIStore).openNewCredential).toHaveBeenCalled();
		expect(mockedStore(useCredentialsStore).createNewCredential).not.toHaveBeenCalled();
	});

	it('shows required fields and tests the key before publishing and binding it in the workflow project', async () => {
		const rendered = renderComponent();
		const store = mockedStore(useCredentialsStore);
		store.createNewCredential.mockResolvedValue(savedCredential);
		const test = Promise.withResolvers<void>();
		form.testCredential.mockReturnValue(test.promise);
		await flushPromises();
		expect(rendered.getByTestId('fields')).toHaveTextContent('apiKey');
		expect(rendered.getByTestId('fields')).not.toHaveTextContent('optional');
		expect(rendered.getByTestId('fields')).not.toHaveTextContent('hidden');
		expect(rendered.getByRole('button', { name: 'Save' })).toBeDisabled();
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
		mocks.authorize.mockResolvedValue(null);
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
		expect(rendered.getByText('Current account')).toBeVisible();
		expect(rendered.emitted<[unknown, string]>('bindCredential')).toBeUndefined();
	});

	it('offers managed OAuth as an alternative to an advanced custom OAuth connection', async () => {
		mocks.isOAuth.mockReturnValue(true);
		mocks.canQuickConnect.mockReturnValue(true);
		mocks.authorize.mockResolvedValue(null);
		mockedStore(useCredentialsStore).getCredentialData.mockResolvedValue({
			...savedCredential,
			data: { clientId: 'custom-client', clientSecret: 'custom-secret' },
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
		});
	});

	it('opens Advanced setup with the recipe and binds its created credential', async () => {
		const setupHint = {
			template: { headers: { Authorization: '{{api_key}}' } },
			placeholders: [{ name: 'api_key', title: 'API key' }],
		};
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
			store.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
			store.getUsableCredentialByType = vi.fn().mockReturnValue([savedCredential]);
			store.getCredentialById = vi
				.fn()
				.mockReturnValue({ ...savedCredential, isResolvable: isPrivate });
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
	});

	it('reconciles a newly saved binding without opening a new OAuth form', async () => {
		mocks.isOAuth.mockReturnValue(true);
		const rendered = renderComponent();
		await flushPromises();
		expect(rendered.getByLabelText('API key')).toBeVisible();
		await rendered.rerender({
			node: { ...node, credentials: { serviceApi: { id: 'existing', name: 'Existing account' } } },
		});
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
		expect(rendered.getByRole('button', { name: 'Save' })).toBeDisabled();
	});

	it.each(['version', 'action', 'unsupported'])(
		'omits Gateway if any bound node fails the %s eligibility check',
		async (reason) => {
			gateway.isEnabled.value = true;
			if (reason === 'version') gateway.isNodeTypeVersionSupported.mockReturnValue(false);
			if (reason === 'action') gateway.isActionSupported.mockReturnValue(false);
			const boundNode = {
				...node,
				type: reason === 'unsupported' ? 'n8n-nodes-base.httpRequest' : node.type,
				parameters: { operation: 'send' },
			};
			const rendered = renderComponent({ props: { nodes: [node, boundNode] } });
			await flushPromises();
			expect(rendered.queryByRole('button', { name: 'Use credits' })).toBeNull();
			expect(rendered.getByRole('button', { name: 'Save' })).toBeVisible();
		},
	);
});
