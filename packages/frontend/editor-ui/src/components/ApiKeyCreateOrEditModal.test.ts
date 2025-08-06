import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY } from '@/constants';
import { STORES } from '@n8n/stores';
import { cleanupAppModals, createAppModals, mockedStore, retry } from '@/__tests__/utils';
import ApiKeyEditModal from './ApiKeyCreateOrEditModal.vue';
import { fireEvent } from '@testing-library/vue';

import { useApiKeysStore } from '@/stores/apiKeys.store';
import { DateTime } from 'luxon';
import type { ApiKeyWithRawValue } from '@n8n/api-types';
import { useSettingsStore } from '@/stores/settings.store';
import { createMockEnterpriseSettings } from '@/__tests__/mocks';

const renderComponent = createComponentRenderer(ApiKeyEditModal, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalsById: {
					[API_KEY_CREATE_OR_EDIT_MODAL_KEY]: { open: true },
				},
			},
		},
	}),
});

const testApiKey: ApiKeyWithRawValue = {
	id: '123',
	label: 'new api key',
	apiKey: '123456***',
	createdAt: new Date().toString(),
	updatedAt: new Date().toString(),
	rawApiKey: '123456',
	expiresAt: 0,
	scopes: ['user:create', 'user:list'],
};

const apiKeysStore = mockedStore(useApiKeysStore);
const settingsStore = mockedStore(useSettingsStore);

describe('ApiKeyCreateOrEditModal', () => {
	beforeEach(() => {
		createAppModals();
		apiKeysStore.availableScopes = ['user:create', 'user:list'];
		settingsStore.settings.enterprise = createMockEnterpriseSettings({ apiKeyScopes: false });
	});

	afterEach(() => {
		cleanupAppModals();
		vi.clearAllMocks();
	});

	test('should allow creating API key with default expiration (30 days)', async () => {
		apiKeysStore.createApiKey.mockResolvedValue(testApiKey);

		const { getByText, getByPlaceholderText } = renderComponent({
			props: {
				mode: 'new',
			},
		});

		await retry(() => expect(getByText('Create API Key')).toBeInTheDocument());
		expect(getByText('Label')).toBeInTheDocument();

		const inputLabel = getByPlaceholderText('e.g Internal Project');
		const saveButton = getByText('Save');

		expect(inputLabel).toBeInTheDocument();
		expect(saveButton).toBeInTheDocument();

		await fireEvent.update(inputLabel, 'new label');

		await fireEvent.click(saveButton);

		expect(getByText('API Key Created')).toBeInTheDocument();

		expect(getByText('Done')).toBeInTheDocument();

		expect(
			getByText('Make sure to copy your API key now as you will not be able to see this again.'),
		).toBeInTheDocument();

		expect(getByText('Click to copy')).toBeInTheDocument();

		expect(getByText('new api key')).toBeInTheDocument();
	});

	test('should allow creating API key with custom expiration', async () => {
		apiKeysStore.createApiKey.mockResolvedValue({
			id: '123',
			label: 'new api key',
			apiKey: '123456',
			createdAt: new Date().toString(),
			updatedAt: new Date().toString(),
			rawApiKey: '***456',
			expiresAt: 0,
			scopes: ['user:create', 'user:list'],
		});

		const { getByText, getByPlaceholderText, getByTestId } = renderComponent({
			props: {
				mode: 'new',
			},
		});

		await retry(() => expect(getByText('Create API Key')).toBeInTheDocument());
		expect(getByText('Label')).toBeInTheDocument();

		const inputLabel = getByPlaceholderText('e.g Internal Project');
		const saveButton = getByText('Save');
		const expirationSelect = getByTestId('expiration-select');

		expect(inputLabel).toBeInTheDocument();
		expect(saveButton).toBeInTheDocument();
		expect(expirationSelect).toBeInTheDocument();

		await fireEvent.update(inputLabel, 'new label');

		await fireEvent.click(expirationSelect);

		const customOption = getByText('Custom');

		expect(customOption).toBeInTheDocument();

		await fireEvent.click(customOption);

		const customExpirationInput = getByPlaceholderText('yyyy-mm-dd');

		expect(customExpirationInput).toBeInTheDocument();

		await fireEvent.input(customExpirationInput, '2029-12-31');

		await fireEvent.click(saveButton);

		expect(getByText('***456')).toBeInTheDocument();

		expect(getByText('API Key Created')).toBeInTheDocument();

		expect(getByText('Done')).toBeInTheDocument();

		expect(
			getByText('Make sure to copy your API key now as you will not be able to see this again.'),
		).toBeInTheDocument();

		expect(getByText('Click to copy')).toBeInTheDocument();

		expect(getByText('new api key')).toBeInTheDocument();
	});

	test('should allow creating API key with no expiration', async () => {
		apiKeysStore.createApiKey.mockResolvedValue(testApiKey);

		const { getByText, getByPlaceholderText, getByTestId } = renderComponent({
			props: {
				mode: 'new',
			},
		});

		await retry(() => expect(getByText('Create API Key')).toBeInTheDocument());
		expect(getByText('Label')).toBeInTheDocument();

		const inputLabel = getByPlaceholderText('e.g Internal Project');
		const saveButton = getByText('Save');
		const expirationSelect = getByTestId('expiration-select');

		expect(inputLabel).toBeInTheDocument();
		expect(saveButton).toBeInTheDocument();
		expect(expirationSelect).toBeInTheDocument();

		await fireEvent.update(inputLabel, 'new label');

		await fireEvent.click(expirationSelect);

		const noExpirationOption = getByText('No Expiration');

		expect(noExpirationOption).toBeInTheDocument();

		await fireEvent.click(noExpirationOption);

		await fireEvent.click(saveButton);

		expect(getByText('API Key Created')).toBeInTheDocument();

		expect(getByText('Done')).toBeInTheDocument();

		expect(
			getByText('Make sure to copy your API key now as you will not be able to see this again.'),
		).toBeInTheDocument();

		expect(getByText('Click to copy')).toBeInTheDocument();

		expect(getByText('new api key')).toBeInTheDocument();
	});

	test('should allow creating API key with scopes when feat:apiKeyScopes is enabled', async () => {
		settingsStore.settings.enterprise = createMockEnterpriseSettings({ apiKeyScopes: true });

		apiKeysStore.createApiKey.mockResolvedValue(testApiKey);

		const { getByText, getByPlaceholderText, getByTestId, getAllByText } = renderComponent({
			props: {
				mode: 'new',
			},
		});

		await retry(() => expect(getByText('Create API Key')).toBeInTheDocument());
		expect(getByText('Label')).toBeInTheDocument();

		const inputLabel = getByPlaceholderText('e.g Internal Project');
		const saveButton = getByText('Save');

		const scopesSelect = getByTestId('scopes-select');

		expect(inputLabel).toBeInTheDocument();
		expect(scopesSelect).toBeInTheDocument();
		expect(saveButton).toBeInTheDocument();

		await fireEvent.update(inputLabel, 'new label');

		await fireEvent.click(scopesSelect);

		const userCreateScope = getByText('user:create');

		expect(userCreateScope).toBeInTheDocument();

		await fireEvent.click(userCreateScope);

		const [userCreateTag, userCreateSelectOption] = getAllByText('user:create');

		expect(userCreateTag).toBeInTheDocument();
		expect(userCreateSelectOption).toBeInTheDocument();

		await fireEvent.click(saveButton);

		expect(getByText('API Key Created')).toBeInTheDocument();

		expect(getByText('Done')).toBeInTheDocument();

		expect(
			getByText('Make sure to copy your API key now as you will not be able to see this again.'),
		).toBeInTheDocument();

		expect(getByText('Click to copy')).toBeInTheDocument();

		expect(getByText('new api key')).toBeInTheDocument();
	});

	test('should not let the user select scopes and show upgrade banner when feat:apiKeyScopes is disabled', async () => {
		settingsStore.settings.enterprise = createMockEnterpriseSettings({ apiKeyScopes: false });

		apiKeysStore.createApiKey.mockResolvedValue(testApiKey);

		const { getByText, getByPlaceholderText, getByTestId, getAllByText } = renderComponent({
			props: {
				mode: 'new',
			},
		});

		await retry(() => expect(getByText('Create API Key')).toBeInTheDocument());
		expect(getByText('Label')).toBeInTheDocument();

		const inputLabel = getByPlaceholderText('e.g Internal Project');
		const saveButton = getByText('Save');

		expect(getByText('Upgrade')).toBeInTheDocument();
		expect(getByText('to unlock the ability to modify API key scopes')).toBeInTheDocument();

		const scopesSelect = getByTestId('scopes-select');

		expect(inputLabel).toBeInTheDocument();
		expect(scopesSelect).toBeInTheDocument();
		expect(saveButton).toBeInTheDocument();

		await fireEvent.update(inputLabel, 'new label');

		await fireEvent.click(scopesSelect);

		const userCreateScope = getAllByText('user:create');

		const [userCreateTag, userCreateSelectOption] = userCreateScope;
		expect(userCreateTag).toBeInTheDocument();
		expect(userCreateSelectOption).toBeInTheDocument();

		expect(userCreateSelectOption).toBeInTheDocument();

		expect(userCreateSelectOption.parentNode).toHaveClass('is-disabled');

		await fireEvent.click(userCreateSelectOption);

		await fireEvent.click(saveButton);

		expect(getByText('API Key Created')).toBeInTheDocument();

		expect(getByText('Done')).toBeInTheDocument();

		expect(
			getByText('Make sure to copy your API key now as you will not be able to see this again.'),
		).toBeInTheDocument();

		expect(getByText('Click to copy')).toBeInTheDocument();

		expect(getByText('new api key')).toBeInTheDocument();
	});

	test('should allow editing API key label', async () => {
		apiKeysStore.apiKeys = [testApiKey];

		apiKeysStore.updateApiKey.mockResolvedValue();

		const { getByText, getByTestId } = renderComponent({
			props: {
				mode: 'edit',
				activeId: '123',
			},
		});

		await retry(() => expect(getByText('Edit API Key')).toBeInTheDocument());

		expect(getByText('Label')).toBeInTheDocument();

		const formattedDate = DateTime.fromMillis(Date.parse(testApiKey.createdAt)).toFormat(
			'ccc, MMM d yyyy',
		);

		expect(getByText(`API key was created on ${formattedDate}`)).toBeInTheDocument();

		const labelInput = getByTestId('api-key-label');

		expect((labelInput as unknown as HTMLInputElement).value).toBe('new api key');

		await fireEvent.update(labelInput, 'updated api key');

		const saveButton = getByText('Save');

		expect(saveButton).toBeInTheDocument();

		await fireEvent.click(saveButton);

		expect(apiKeysStore.updateApiKey).toHaveBeenCalledWith('123', {
			label: 'updated api key',
			scopes: ['user:create', 'user:list'],
		});
	});
});
