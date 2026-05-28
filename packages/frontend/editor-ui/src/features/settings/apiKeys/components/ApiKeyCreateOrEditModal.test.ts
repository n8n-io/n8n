import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY } from '../apiKeys.constants';
import { STORES } from '@n8n/stores';
import { mockedStore, retry } from '@/__tests__/utils';
import ApiKeyEditModal from './ApiKeyCreateOrEditModal.vue';
import userEvent from '@testing-library/user-event';

import { useApiKeysStore } from '../apiKeys.store';
import { DateTime } from 'luxon';
import type { ApiKeyWithRawValue } from '@n8n/api-types';

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

describe('ApiKeyCreateOrEditModal', () => {
	beforeEach(() => {
		apiKeysStore.availableScopes = ['user:create', 'user:list'];
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

	test('should allow creating API key with scopes pre-selected', async () => {
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

		const scopesSelect = getByTestId('scopes-select');

		expect(inputLabel).toBeInTheDocument();
		expect(scopesSelect).toBeInTheDocument();
		expect(saveButton).toBeInTheDocument();

		// All available scopes should be pre-selected for new keys
		expect(scopesSelect).toHaveTextContent('user:create');
		expect(scopesSelect).toHaveTextContent('user:list');

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
