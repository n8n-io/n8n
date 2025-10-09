import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY } from '@/constants';
import { STORES } from '@n8n/stores';
import { mockedStore, retry } from '@/__tests__/utils';
import ApiKeyEditModal from './ApiKeyCreateOrEditModal.vue';
import userEvent from '@testing-library/user-event';

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
		apiKeysStore.availableScopes = ['user:create', 'user:list'];
		settingsStore.settings.enterprise = createMockEnterpriseSettings({ apiKeyScopes: false });
	});

	afterEach(() => {
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

		await userEvent.type(inputLabel, 'new label');

		await userEvent.click(saveButton);

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

		await userEvent.type(inputLabel, 'new label');

		await userEvent.click(expirationSelect);

		const customOption = getByText('Custom');

		expect(customOption).toBeInTheDocument();

		await userEvent.click(customOption);

		const customExpirationInput = getByPlaceholderText('yyyy-mm-dd');

		expect(customExpirationInput).toBeInTheDocument();

		await userEvent.type(customExpirationInput, '2029-12-31');

		await userEvent.click(saveButton);

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

		await userEvent.type(inputLabel, 'new label');

		await userEvent.click(expirationSelect);

		const noExpirationOption = getByText('No Expiration');

		expect(noExpirationOption).toBeInTheDocument();

		await userEvent.click(noExpirationOption);

		await userEvent.click(saveButton);

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

		await userEvent.type(inputLabel, 'new label');

		await userEvent.click(scopesSelect);

		const userCreateScope = getByText('user:create');

		expect(userCreateScope).toBeInTheDocument();

		await userEvent.click(userCreateScope);

		const [userCreateTag, userCreateSelectOption] = getAllByText('user:create');

		expect(userCreateTag).toBeInTheDocument();
		expect(userCreateSelectOption).toBeInTheDocument();

		await userEvent.click(saveButton);

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

		const { getByText, getByPlaceholderText, getByTestId, getByRole } = renderComponent({
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

		await userEvent.type(inputLabel, 'new label');

		await userEvent.click(scopesSelect);

		// Use separate semantic queries instead of destructuring
		// The text is nested inside .el-select__tags-text which is inside .el-tag
		const userCreateTag = getByText('user:create', { selector: '.el-select__tags-text' });
		const userCreateSelectOption = getByRole('option', { name: 'user:create' });

		expect(userCreateTag).toBeInTheDocument();
		expect(userCreateSelectOption).toBeInTheDocument();

		expect(userCreateSelectOption).toHaveClass('is-disabled');

		await userEvent.click(userCreateSelectOption);

		await userEvent.click(saveButton);

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

		await userEvent.clear(labelInput);
		await userEvent.type(labelInput, 'updated api key');

		const saveButton = getByText('Save');

		expect(saveButton).toBeInTheDocument();

		await userEvent.click(saveButton);

		expect(apiKeysStore.updateApiKey).toHaveBeenCalledWith('123', {
			label: 'updated api key',
			scopes: ['user:create', 'user:list'],
		});
	});
});
