import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY } from '../apiKeys.constants';
import { STORES } from '@n8n/stores';
import { mockedStore, retry } from '@/__tests__/utils';
import ApiKeyEditModal from './ApiKeyCreateOrEditModal.vue';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';

import { useApiKeysStore } from '../apiKeys.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { DateTime } from 'luxon';
import type { ApiKeyWithRawValue } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

vi.mock('@n8n/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({ track }),
	};
});

const clipboardCopy = vi.fn();
vi.mock('@vueuse/core', async (importOriginal) => {
	const original = await importOriginal<typeof import('@vueuse/core')>();
	return {
		...original,
		useClipboard: () => ({ copy: clipboardCopy }),
	};
});

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
	lastUsedAt: null,
	owner: {
		id: 'u1',
		firstName: 'Test',
		lastName: 'User',
		email: 'test@n8n.io',
	},
};

const apiKeysStore = mockedStore(useApiKeysStore);
const rootStore = mockedStore(useRootStore);
const usersStore = mockedStore(useUsersStore);
const uiStore = mockedStore(useUIStore);

describe('ApiKeyCreateOrEditModal', () => {
	beforeEach(() => {
		apiKeysStore.availableScopes = ['user:create', 'user:list'];
		// Default: current user IS the owner of the test key (no read-only).
		usersStore.currentUserId = 'u1';
		// @ts-expect-error: replacing a computed for the test
		usersStore.currentUser = { id: 'u1' };
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('should allow creating API key with default expiration (30 days)', async () => {
		apiKeysStore.createApiKey.mockResolvedValue(testApiKey);

		const { getByText, getByPlaceholderText, getByDisplayValue } = renderComponent({
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

		expect(getByText('API key created successfully')).toBeInTheDocument();

		expect(getByText('Done')).toBeInTheDocument();

		expect(
			getByText('Make sure to copy your API key now as you will not be able to see this again.'),
		).toBeInTheDocument();

		// The key is shown inside a readonly input, so query by display value.
		expect(getByDisplayValue('123456')).toBeInTheDocument();
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
			lastUsedAt: null,
			owner: {
				id: 'u1',
				firstName: 'Test',
				lastName: 'User',
				email: 'test@n8n.io',
			},
		});

		const { getByText, getAllByText, getByPlaceholderText, getByTestId, getByDisplayValue } =
			renderComponent({
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

		// 'Custom' also exists as a scopes radio option, so scope the query to the dropdown
		const customOption = getAllByText('Custom').find((element) =>
			element.closest('.el-select-dropdown__item'),
		);

		expect(customOption).toBeInTheDocument();

		await userEvent.click(customOption as HTMLElement);

		const customExpirationInput = getByPlaceholderText('yyyy-mm-dd');

		expect(customExpirationInput).toBeInTheDocument();

		await userEvent.type(customExpirationInput, '2029-12-31');

		await userEvent.click(saveButton);

		expect(getByDisplayValue('***456')).toBeInTheDocument();

		expect(getByText('API key created successfully')).toBeInTheDocument();

		expect(getByText('Done')).toBeInTheDocument();

		expect(
			getByText('Make sure to copy your API key now as you will not be able to see this again.'),
		).toBeInTheDocument();
	});

	test('should allow creating API key with no expiration', async () => {
		apiKeysStore.createApiKey.mockResolvedValue(testApiKey);

		const { getByText, getByPlaceholderText, getByTestId, getByDisplayValue } = renderComponent({
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

		const noExpirationOption = getByText('Never');

		expect(noExpirationOption).toBeInTheDocument();

		await userEvent.click(noExpirationOption);

		await userEvent.click(saveButton);

		expect(getByText('API key created successfully')).toBeInTheDocument();

		expect(getByText('Done')).toBeInTheDocument();

		expect(
			getByText('Make sure to copy your API key now as you will not be able to see this again.'),
		).toBeInTheDocument();

		expect(getByDisplayValue('123456')).toBeInTheDocument();
	});

	test('shows the expiration hint for the default option and the "never" copy when Never is selected', async () => {
		const { getByText, getByTestId } = renderComponent({
			props: {
				mode: 'new',
			},
		});

		await retry(() => expect(getByText('Create API Key')).toBeInTheDocument());

		// Default is 30 days → the hint spells out the concrete date.
		const expectedDate = DateTime.now()
			.setZone(rootStore.timezone)
			.startOf('day')
			.plus({ days: 30 })
			.toFormat('ccc, MMM d yyyy');
		expect(getByTestId('api-key-expiration-hint')).toHaveTextContent(
			`The API key will expire on ${expectedDate}`,
		);

		await userEvent.click(getByTestId('expiration-select'));
		await userEvent.click(getByText('Never'));

		// "Never" must explain itself instead of clearing the hint.
		expect(getByTestId('api-key-expiration-hint')).toHaveTextContent(
			'The API key will never expire. It will remain active until it is revoked manually.',
		);
	});

	test('should allow creating API key with scopes pre-selected', async () => {
		apiKeysStore.createApiKey.mockResolvedValue(testApiKey);

		const { getByText, getByPlaceholderText, getByTestId, getByDisplayValue } = renderComponent({
			props: {
				mode: 'new',
			},
		});

		await retry(() => expect(getByText('Create API Key')).toBeInTheDocument());
		expect(getByText('Label')).toBeInTheDocument();

		const inputLabel = getByPlaceholderText('e.g Internal Project');
		const saveButton = getByText('Save');

		expect(inputLabel).toBeInTheDocument();
		expect(getByTestId('api-key-scopes')).toBeInTheDocument();
		expect(saveButton).toBeInTheDocument();

		// All available scopes should be pre-selected for new keys
		await retry(() => expect(getByTestId('scopes-mode-all')).toBeChecked());

		await userEvent.type(inputLabel, 'new label');

		await userEvent.click(saveButton);

		expect(getByText('API key created successfully')).toBeInTheDocument();

		expect(getByText('Done')).toBeInTheDocument();

		expect(
			getByText('Make sure to copy your API key now as you will not be able to see this again.'),
		).toBeInTheDocument();

		expect(getByDisplayValue('123456')).toBeInTheDocument();
	});

	test('shows a rotated key in the same created view, with the rotation title', async () => {
		const { getByText, getByDisplayValue } = renderComponent({
			props: {
				mode: 'new',
				rotatedApiKey: testApiKey,
			},
		});

		await retry(() => expect(getByText('API key rotated successfully')).toBeInTheDocument());

		// Same created-view affordances as a freshly created key.
		expect(getByText('Done')).toBeInTheDocument();
		expect(
			getByText('Make sure to copy your API key now as you will not be able to see this again.'),
		).toBeInTheDocument();
		expect(getByDisplayValue('123456')).toBeInTheDocument();
	});

	test('flips the copy button to a check mark after copying, then back', async () => {
		vi.useFakeTimers();
		try {
			const { getByTestId } = renderComponent({
				props: {
					mode: 'new',
					rotatedApiKey: testApiKey,
				},
			});
			await nextTick();

			const copyButton = getByTestId('copy-input-button');
			expect(copyButton).toHaveAccessibleName('Copy');

			await fireEvent.click(copyButton);
			await nextTick();

			expect(clipboardCopy).toHaveBeenCalledWith('123456');
			expect(copyButton).toHaveAccessibleName('Copied to clipboard');

			// The feedback reverts on its own once the timer elapses.
			await vi.advanceTimersByTimeAsync(2000);
			await nextTick();
			expect(copyButton).toHaveAccessibleName('Copy');
		} finally {
			vi.useRealTimers();
		}
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

	describe('expiration in edit mode', () => {
		test('shows the "never" copy read-only for a key without expiry', async () => {
			apiKeysStore.apiKeys = [testApiKey]; // expiresAt: 0 → no expiry

			const { getByText, getByTestId } = renderComponent({
				props: { mode: 'edit', activeId: '123' },
			});

			await retry(() => expect(getByText('Edit API Key')).toBeInTheDocument());

			expect(getByTestId('api-key-expiration-readonly')).toHaveTextContent(
				'The API key will never expire. It will remain active until it is revoked manually.',
			);
		});

		test('shows the expiry date read-only for a key that expires in the future', async () => {
			const expiresAt = Math.floor(DateTime.now().plus({ days: 10 }).toSeconds());
			apiKeysStore.apiKeys = [{ ...testApiKey, expiresAt }];

			const { getByText, getByTestId } = renderComponent({
				props: { mode: 'edit', activeId: '123' },
			});

			await retry(() => expect(getByText('Edit API Key')).toBeInTheDocument());

			expect(getByTestId('api-key-expiration-readonly')).toHaveTextContent(
				`The API key will expire on ${DateTime.fromSeconds(expiresAt).toFormat('ccc, MMM d yyyy')}`,
			);
		});

		test('uses past-tense copy for an already-expired key', async () => {
			const expiresAt = Math.floor(DateTime.now().minus({ days: 3 }).toSeconds());
			apiKeysStore.apiKeys = [{ ...testApiKey, expiresAt }];

			const { getByText, getByTestId } = renderComponent({
				props: { mode: 'edit', activeId: '123' },
			});

			await retry(() => expect(getByText('Edit API Key')).toBeInTheDocument());

			expect(getByTestId('api-key-expiration-readonly')).toHaveTextContent(
				`The API key expired on ${DateTime.fromSeconds(expiresAt).toFormat('ccc, MMM d yyyy')}`,
			);
		});
	});

	describe('read-only mode (key not owned by current user)', () => {
		const setupNonOwnerView = () => {
			apiKeysStore.apiKeys = [testApiKey];
			// Current user differs from testApiKey.owner.id ('u1').
			usersStore.currentUserId = 'admin';
			// @ts-expect-error: replacing a computed for the test
			usersStore.currentUser = { id: 'admin' };
		};

		test('renders title with owner email, disables inputs, and shows Close + Revoke instead of Save', async () => {
			setupNonOwnerView();

			const { getByText, queryByText, getByTestId } = renderComponent({
				props: { mode: 'edit', activeId: '123' },
			});

			await retry(() => expect(getByText('API Key owned by test@n8n.io')).toBeInTheDocument());

			// Save button is hidden in read-only mode; Close + Revoke take its place.
			expect(queryByText('Save')).not.toBeInTheDocument();
			expect(getByTestId('api-key-readonly-close')).toBeInTheDocument();
			expect(getByTestId('api-key-readonly-revoke')).toBeInTheDocument();

			expect((getByTestId('api-key-label') as unknown as HTMLInputElement).disabled).toBe(true);
		});

		test('clicking Close dismisses the modal without calling deleteApiKey', async () => {
			setupNonOwnerView();

			const { getByTestId, getByText } = renderComponent({
				props: { mode: 'edit', activeId: '123' },
			});

			await retry(() => expect(getByText('API Key owned by test@n8n.io')).toBeInTheDocument());

			await userEvent.click(getByTestId('api-key-readonly-close'));

			expect(uiStore.closeModal).toHaveBeenCalledWith(API_KEY_CREATE_OR_EDIT_MODAL_KEY);
			expect(apiKeysStore.deleteApiKey).not.toHaveBeenCalled();
		});

		test('clicking Revoke and confirming calls deleteApiKey and tracks telemetry with is_own=false', async () => {
			setupNonOwnerView();
			apiKeysStore.deleteApiKey.mockResolvedValue();

			const { getByTestId, getByText, findAllByRole } = renderComponent({
				props: { mode: 'edit', activeId: '123' },
			});

			await retry(() => expect(getByText('API Key owned by test@n8n.io')).toBeInTheDocument());

			await userEvent.click(getByTestId('api-key-readonly-revoke'));

			// The alert dialog renders via a portal — confirm via its destructive button.
			const revokeButtons = await findAllByRole('button', { name: 'Revoke' });
			await userEvent.click(revokeButtons[revokeButtons.length - 1]);

			expect(apiKeysStore.deleteApiKey).toHaveBeenCalledWith('123');

			const { track } = useTelemetry();
			expect(track).toHaveBeenCalledWith('User clicked delete API key button', {
				is_own: false,
			});
		});
	});
});
