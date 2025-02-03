import { createComponentRenderer } from '@/__tests__/render';
import CredentialEdit from '@/components/CredentialEdit/CredentialEdit.vue';
import { createTestingPinia } from '@pinia/testing';
import { CREDENTIAL_EDIT_MODAL_KEY, STORES } from '@/constants';
import { cleanupAppModals, createAppModals, retry } from '@/__tests__/utils';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { ICredentialsResponse } from '@/Interface';

vi.mock('@/permissions', () => ({
	getResourcePermissions: vi.fn(() => ({
		credential: {
			create: true,
			update: true,
		},
	})),
}));

const renderComponent = createComponentRenderer(CredentialEdit, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalsById: {
					[CREDENTIAL_EDIT_MODAL_KEY]: { open: true },
				},
			},
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						sharing: true,
						externalSecrets: false,
					},
					templates: {
						host: '',
					},
				},
			},
		},
	}),
});
describe('CredentialEdit', () => {
	beforeEach(() => {
		createAppModals();
	});

	afterEach(() => {
		cleanupAppModals();
		vi.clearAllMocks();
	});

	test('shows the save button when credentialId is null', async () => {
		const { queryByTestId } = renderComponent({
			props: {
				isTesting: false,
				isSaving: false,
				hasUnsavedChanges: false,
				modalName: CREDENTIAL_EDIT_MODAL_KEY,
				mode: 'new',
			},
		});
		await retry(() => expect(queryByTestId('credential-save-button')).toBeInTheDocument());
	});

	test('hides the save button when credentialId exists and there are no unsaved changes', async () => {
		const { queryByTestId } = renderComponent({
			props: {
				activeId: '123', // credentialId will be set to this value in edit mode
				isTesting: false,
				isSaving: false,
				hasUnsavedChanges: false,
				modalName: CREDENTIAL_EDIT_MODAL_KEY,
				mode: 'edit',
			},
		});
		await retry(() => expect(queryByTestId('credential-save-button')).not.toBeInTheDocument());
	});

	test('hides menu item when credential is managed', async () => {
		const credentialsStore = useCredentialsStore();

		credentialsStore.state.credentials = {
			'123': {
				isManaged: false,
			} as ICredentialsResponse,
		};

		const { queryByText } = renderComponent({
			props: {
				activeId: '123', // credentialId will be set to this value in edit mode
				isTesting: false,
				isSaving: false,
				hasUnsavedChanges: false,
				modalName: CREDENTIAL_EDIT_MODAL_KEY,
				mode: 'edit',
			},
		});

		await retry(() => expect(queryByText('Details')).toBeInTheDocument());
		await retry(() => expect(queryByText('Connection')).toBeInTheDocument());
		await retry(() => expect(queryByText('Sharing')).toBeInTheDocument());
	});

	test('shows menu item when credential is not managed', async () => {
		const credentialsStore = useCredentialsStore();

		credentialsStore.state.credentials = {
			'123': {
				isManaged: true,
			} as ICredentialsResponse,
		};

		const { queryByText } = renderComponent({
			props: {
				activeId: '123', // credentialId will be set to this value in edit mode
				isTesting: false,
				isSaving: false,
				hasUnsavedChanges: false,
				modalName: CREDENTIAL_EDIT_MODAL_KEY,
				mode: 'edit',
			},
		});

		await retry(() => expect(queryByText('Details')).not.toBeInTheDocument());
		await retry(() => expect(queryByText('Connection')).not.toBeInTheDocument());
		await retry(() => expect(queryByText('Sharing')).not.toBeInTheDocument());
	});
});
