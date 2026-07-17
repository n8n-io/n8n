import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

import { CREDENTIAL_SELECT_MODAL_KEY } from '../credentials.constants';
import { useCredentialsStore } from '../credentials.store';
import type { ICredentialsResponse } from '../credentials.types';
import SettingsInstanceCredentialsView from './SettingsInstanceCredentialsView.vue';

const mockMessage = { confirm: vi.fn() };
const mockToast = { showError: vi.fn() };

vi.mock('@/app/composables/useMessage', () => ({ useMessage: () => mockMessage }));
vi.mock('@/app/composables/useToast', () => ({ useToast: () => mockToast }));
vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

const credential: ICredentialsResponse = {
	id: 'credential-id',
	name: 'Shared model',
	type: 'openAiApi',
	createdAt: '2026-07-16T10:00:00.000Z',
	updatedAt: '2026-07-16T11:00:00.000Z',
	isManaged: false,
	availability: 'instance',
};

const renderView = (credentials: ICredentialsResponse[]) => {
	const pinia = createTestingPinia();
	const credentialsStore = mockedStore(useCredentialsStore);
	const uiStore = mockedStore(useUIStore);
	credentialsStore.fetchCredentialTypes.mockResolvedValue(undefined);
	credentialsStore.fetchInstanceCredentials.mockResolvedValue(credentials);
	credentialsStore.deleteCredential.mockResolvedValue(undefined);

	return {
		credentialsStore,
		uiStore,
		...createComponentRenderer(SettingsInstanceCredentialsView, {
			pinia,
			global: { stubs: { CredentialIcon: true, TimeAgo: true } },
		})(),
	};
};

describe('SettingsInstanceCredentialsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockMessage.confirm.mockResolvedValue(MODAL_CONFIRM);
	});

	it('opens credential creation with instance availability', async () => {
		const { getByTestId, uiStore } = renderView([]);
		const emptyState = await waitFor(() => getByTestId('instance-credentials-empty-state'));

		await userEvent.click(within(emptyState).getByRole('button'));

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: CREDENTIAL_SELECT_MODAL_KEY,
			data: { availability: 'instance' },
		});
	});

	it('opens an existing instance credential from its card', async () => {
		const { getByTestId, uiStore } = renderView([credential]);
		const card = await waitFor(() => getByTestId('instance-credential-card'));

		await userEvent.click(card);

		expect(uiStore.openExistingCredential).toHaveBeenCalledWith(credential.id);
	});

	it('deletes a credential after confirmation', async () => {
		const { getByTestId, queryByTestId, credentialsStore } = renderView([credential]);
		const actions = await waitFor(() => getByTestId('instance-credential-card-actions'));

		await userEvent.click(within(actions).getByRole('button'));
		await userEvent.click(getByTestId('action-delete'));

		expect(credentialsStore.deleteCredential).toHaveBeenCalledWith({ id: credential.id });
		await waitFor(() => expect(queryByTestId('instance-credential-card')).not.toBeInTheDocument());
	});
});
