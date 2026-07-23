import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType, INodeCredentialTestResult } from 'n8n-workflow';
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
