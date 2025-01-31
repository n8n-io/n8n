import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY, STORES } from '@/constants';
import { cleanupAppModals, createAppModals, mockedStore, retry } from '@/__tests__/utils';
import ApiKeyEditModal from './ApiKeyCreateOrEditModal.vue';
import { fireEvent } from '@testing-library/vue';

import { useApiKeysStore } from '@/stores/apiKeys.store';
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
};

const apiKeysStore = mockedStore(useApiKeysStore);

describe('ApiKeyCreateOrEditModal', () => {
	beforeEach(() => {
		createAppModals();
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

		expect(getByText('You can find more details in')).toBeInTheDocument();

		expect(getByText('the API documentation')).toBeInTheDocument();

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

		expect(getByText('You can find more details in')).toBeInTheDocument();

		expect(getByText('the API documentation')).toBeInTheDocument();

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

		expect(getByText('You can find more details in')).toBeInTheDocument();

		expect(getByText('the API documentation')).toBeInTheDocument();

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

		const editButton = getByText('Edit');

		expect(editButton).toBeInTheDocument();

		await fireEvent.click(editButton);

		expect(apiKeysStore.updateApiKey).toHaveBeenCalledWith('123', { label: 'updated api key' });
	});
});
