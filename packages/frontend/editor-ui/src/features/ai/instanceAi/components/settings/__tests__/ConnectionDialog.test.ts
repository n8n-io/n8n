import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType, INodeCredentialTestResult } from 'n8n-workflow';
import { nextTick } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ConnectionDialog from '../ConnectionDialog.vue';
import { useInstanceAiSettingsStore } from '../../../instanceAiSettings.store';

// Renders ConnectionFields and CredentialInputs for real (unlike the view suite, which mocks
// ConnectionFields wholesale); only the parameter input leaf is stubbed.
vi.mock('@/features/ndv/parameters/components/ParameterInputExpanded.vue', async () => {
	const { defineComponent, h } = await import('vue');
	return {
		default: defineComponent({
			props: { parameter: { type: Object, required: true }, value: { default: '' } },
			emits: ['update'],
			setup(props, { emit }) {
				return () =>
					h('input', {
						'data-test-id': `param-${(props.parameter as { name: string }).name}`,
						value: String(props.value ?? ''),
						onInput: (event: Event) =>
							emit('update', {
								name: (props.parameter as { name: string }).name,
								value: (event.target as HTMLInputElement).value,
							}),
					});
			},
		}),
	};
});

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({ addEventListener: vi.fn() }),
}));

vi.mock('../../../instanceAi.settings.api', () => ({
	fetchSettings: vi.fn().mockResolvedValue(null),
	updateSettings: vi.fn(),
	fetchPreferences: vi.fn(),
	updatePreferences: vi.fn(),
	fetchServiceCredentials: vi.fn().mockResolvedValue([]),
	fetchInstanceModelCredentials: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../instanceAi.api', () => ({
	createGatewayLink: vi.fn(),
	getGatewayStatus: vi.fn(),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(true),
}));

const renderDialog = createComponentRenderer(ConnectionDialog);

const DAYTONA_TYPE: ICredentialType = {
	name: 'daytonaApi',
	displayName: 'Daytona',
	properties: [
		{ displayName: 'API URL', name: 'apiUrl', type: 'string', required: true, default: '' },
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	],
	test: { request: { url: '/test' } },
};

const OPENAI_TYPE: ICredentialType = {
	name: 'openAiApi',
	displayName: 'OpenAI',
	properties: [
		{ displayName: 'API Key', name: 'apiKey', type: 'string', required: true, default: '' },
		{ displayName: 'Organization ID', name: 'organizationId', type: 'string', default: '' },
		{ displayName: 'Add Custom Header', name: 'header', type: 'boolean', default: false },
		{
			displayName: 'Header Name',
			name: 'headerName',
			type: 'string',
			default: '',
			displayOptions: { show: { header: [true] } },
		},
		{
			displayName: 'Header Value',
			name: 'headerValue',
			type: 'string',
			default: '',
			displayOptions: { show: { header: [true] } },
		},
	],
};

describe('ConnectionDialog (real connection fields)', () => {
	let store: ReturnType<typeof useInstanceAiSettingsStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		store = useInstanceAiSettingsStore();
		store.$patch({
			settings: {
				enabled: true,
				permissions: {},
				mcpAccessEnabled: true,
				sandboxEnabled: false,
				sandboxProvider: 'daytona',
				daytonaCredentialId: null,
				n8nSandboxCredentialId: null,
				searchCredentialId: null,
				modelCredentialId: null,
				modelName: null,
				modelEnvConfigured: false,
				sandboxEnvConfigured: false,
				searchEnvConfigured: false,
				localGatewayDisabled: false,
			},
		});
	});

	it('renders an input per visible property of the selected credential type', async () => {
		useCredentialsStore().setCredentialTypes([DAYTONA_TYPE]);

		const { findByTestId, getAllByTestId, getByTestId } = renderDialog({
			props: { kind: 'sandbox', open: true },
		});

		await findByTestId('n8n-agent-sandbox-connection-fields');
		await waitFor(() => expect(getAllByTestId('credential-connection-parameter')).toHaveLength(2));
		expect(getByTestId('param-apiUrl')).toBeVisible();
		expect(getByTestId('param-apiKey')).toBeVisible();
		expect((getByTestId('param-apiUrl') as HTMLInputElement).value).toBe(
			'https://app.daytona.io/api',
		);
	});

	it('renders no inputs when credential types are not loaded, so the view must fetch them', async () => {
		const { findByTestId, queryAllByTestId, queryByTestId } = renderDialog({
			props: { kind: 'sandbox', open: true },
		});

		await findByTestId('n8n-agent-sandbox-provider-select');
		expect(queryByTestId('n8n-agent-sandbox-connection-fields')).toBeNull();
		expect(queryAllByTestId('credential-connection-parameter')).toHaveLength(0);
	});

	it('keeps supported OpenAI organization and custom-header fields editable', async () => {
		const credentialsStore = useCredentialsStore();
		credentialsStore.setCredentialTypes([OPENAI_TYPE]);
		vi.mocked(credentialsStore.getCredentialData).mockResolvedValue({
			data: {
				apiKey: 'stored-key',
				organizationId: 'org-old',
				header: true,
				headerName: 'x-proxy-key',
				headerValue: 'old-value',
			},
		} as never);
		store.$patch({
			settings: { ...store.settings!, modelCredentialId: 'openai-id', modelName: 'gpt-4o' },
			instanceModelCredentials: [
				{ id: 'openai-id', name: 'AI Assistant model', type: 'openAiApi' },
			],
		});
		vi.mocked(store.save).mockResolvedValue(true);
		const refresh = Promise.withResolvers<void>();
		vi.mocked(store.refreshInstanceModelCredentials).mockReturnValue(refresh.promise);

		const { emitted, findByTestId, getByTestId } = renderDialog({
			props: { kind: 'model', open: true },
		});

		await findByTestId('param-headerValue');
		expect(getByTestId('param-organizationId')).toBeVisible();
		expect(getByTestId('param-header')).toBeVisible();
		expect(getByTestId('param-headerName')).toBeVisible();
		await fireEvent.update(getByTestId('param-organizationId'), 'org-new');
		await fireEvent.update(getByTestId('param-headerName'), 'x-new-proxy-key');
		await fireEvent.update(getByTestId('param-headerValue'), 'new-value');
		await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));

		await waitFor(() => expect(store.save).toHaveBeenCalledOnce());
		expect(emitted().saved).toBeUndefined();
		expect(store.draft).toMatchObject({
			modelConnection: {
				type: 'openAiApi',
				data: {
					organizationId: 'org-new',
					header: true,
					headerName: 'x-new-proxy-key',
					headerValue: 'new-value',
				},
			},
		});
		refresh.resolve();
		await waitFor(() => expect(emitted().saved).toEqual([[]]));
	});

	it('hydrates the sandbox credential selected by the configured provider', async () => {
		const credentialsStore = useCredentialsStore();
		vi.mocked(credentialsStore.getCredentialData).mockResolvedValue({
			data: { name: 'x-api-key', value: 'stored-key' },
		} as never);
		store.$patch({
			settings: {
				...store.settings!,
				sandboxProvider: 'n8n-sandbox',
				daytonaCredentialId: 'daytona-id',
				n8nSandboxCredentialId: 'n8n-id',
			},
		});
		vi.mocked(store.save).mockResolvedValue(true);

		const { findByTestId, getByTestId } = renderDialog({
			props: { kind: 'sandbox', open: true },
		});

		const keyField = await findByTestId('n8n-agent-sandbox-api-key-input');
		const keyInput =
			keyField.tagName === 'INPUT'
				? (keyField as HTMLInputElement)
				: keyField.querySelector('input')!;
		expect(credentialsStore.getCredentialData).toHaveBeenCalledWith({ id: 'n8n-id' });
		expect(keyInput.value).toBe('stored-key');
		await fireEvent.update(keyInput, 'new-key');
		await fireEvent.click(getByTestId('n8n-agent-sandbox-dialog-save'));

		await waitFor(() => expect(store.save).toHaveBeenCalledOnce());
		expect(store.draft).toMatchObject({
			sandboxConnection: {
				type: 'httpHeaderAuth',
				data: { name: 'x-api-key', value: 'new-key' },
			},
		});
	});

	it('ignores a stale hydration after the dialog is reopened', async () => {
		const credentialsStore = useCredentialsStore();
		credentialsStore.setCredentialTypes([OPENAI_TYPE]);
		store.$patch({
			settings: { ...store.settings!, modelCredentialId: 'openai-id', modelName: 'gpt-4o' },
			instanceModelCredentials: [
				{ id: 'openai-id', name: 'AI Assistant model', type: 'openAiApi' },
			],
		});
		const stale =
			Promise.withResolvers<Awaited<ReturnType<typeof credentialsStore.getCredentialData>>>();
		const fresh =
			Promise.withResolvers<Awaited<ReturnType<typeof credentialsStore.getCredentialData>>>();
		vi.mocked(credentialsStore.getCredentialData)
			.mockReturnValueOnce(stale.promise)
			.mockReturnValueOnce(fresh.promise);

		const result = renderDialog({ props: { kind: 'model', open: true } });
		await waitFor(() => expect(credentialsStore.getCredentialData).toHaveBeenCalledTimes(1));
		await result.rerender({ kind: 'model', open: false });
		await result.rerender({ kind: 'model', open: true });
		await waitFor(() => expect(credentialsStore.getCredentialData).toHaveBeenCalledTimes(2));

		fresh.resolve({ data: { apiKey: 'fresh-key' } } as never);
		const apiKeyInput = await result.findByTestId('param-apiKey');
		expect((apiKeyInput as HTMLInputElement).value).toBe('fresh-key');
		stale.resolve({ data: { apiKey: 'stale-key' } } as never);
		await stale.promise;
		await nextTick();
		expect(result.getByTestId('param-apiKey')).toHaveValue('fresh-key');
	});

	it('keeps the dialog and fields locked while testing a connection', async () => {
		useCredentialsStore().setCredentialTypes([DAYTONA_TYPE]);
		const credentialsStore = useCredentialsStore();
		let finishTest = (_result: INodeCredentialTestResult) => {};
		vi.mocked(credentialsStore.testCredential).mockImplementation(
			async () =>
				await new Promise<INodeCredentialTestResult>((resolve) => {
					finishTest = resolve;
				}),
		);
		vi.mocked(store.save).mockResolvedValue(true);

		const { findByTestId, getByTestId } = renderDialog({
			props: { kind: 'sandbox', open: true },
		});
		const apiKeyInput = await findByTestId('param-apiKey');
		await fireEvent.update(apiKeyInput, 'secret');
		const saveButton = getByTestId('n8n-agent-sandbox-dialog-save');
		await waitFor(() => expect(saveButton).not.toBeDisabled());

		await fireEvent.click(saveButton);

		const cancelButton = getByTestId('n8n-agent-sandbox-dialog-cancel');
		await waitFor(() => expect(cancelButton).toBeDisabled());
		expect(apiKeyInput).toBeDisabled();
		await fireEvent.click(cancelButton);
		expect(getByTestId('n8n-agent-sandbox-dialog-cancel')).toBeDisabled();

		finishTest({ status: 'OK', message: '' });
		await waitFor(() => expect(store.save).toHaveBeenCalled());
	});
});
