import type { ServiceAccount, ServiceAccountCredential } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { setActivePinia } from 'pinia';

import { renderComponent } from '@/__tests__/render';

import ServiceAccountCredentialsModal from './ServiceAccountCredentialsModal.vue';
import { useServiceAccountsStore } from '../serviceAccounts.store';

const serviceAccount: ServiceAccount = {
	id: 'sa-1',
	name: 'Deploy Bot',
	email: 'deploy-bot-abcd@service-accounts.invalid',
	role: 'global:member',
	disabled: false,
};

const credential = (
	overrides: Partial<ServiceAccountCredential> = {},
): ServiceAccountCredential => ({
	id: 'cred-1',
	clientId: 'client-abc',
	credentialType: 'client_secret',
	userId: serviceAccount.id,
	createdAt: '2026-08-01T10:00:00.000Z',
	...overrides,
});

const renderModal = async (credentials: ServiceAccountCredential[]) => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	const store = useServiceAccountsStore();
	store.listCredentials = vi.fn(async () => credentials);
	store.createCredential = vi.fn();
	store.deleteCredential = vi.fn(async () => ({ success: true }));

	// The list is fetched on the `open` transition, so mount closed and flip.
	const rendered = renderComponent(ServiceAccountCredentialsModal, {
		pinia,
		props: { serviceAccount, open: false },
	});
	await rendered.rerender({ serviceAccount, open: true });
	await screen.findByTestId('service-account-credentials-modal');

	return { store, ...rendered };
};

describe('ServiceAccountCredentialsModal', () => {
	it('lists existing credentials by client ID and creation date', async () => {
		const { store } = await renderModal([
			credential(),
			credential({ id: 'cred-2', clientId: 'client-xyz', createdAt: '2026-08-03T10:00:00.000Z' }),
		]);

		expect(store.listCredentials).toHaveBeenCalledWith(serviceAccount.id);

		const rows = await screen.findAllByTestId('service-account-credential-row');
		expect(rows).toHaveLength(2);
		// Newest first — creation date is the only thing distinguishing rows.
		expect(rows.map((row) => row.querySelector('input')?.value)).toEqual([
			'client-xyz',
			'client-abc',
		]);
	});

	it('explains an empty list instead of rendering an empty table', async () => {
		await renderModal([]);

		expect(await screen.findByTestId('service-account-credentials-empty')).toBeInTheDocument();
		expect(screen.queryByTestId('service-account-credentials-list')).not.toBeInTheDocument();
	});

	it('reveals the secret once after creating a credential', async () => {
		const { store } = await renderModal([]);
		store.createCredential = vi.fn(async () => ({
			...credential({ id: 'cred-new', clientId: 'client-new' }),
			clientSecret: 'super-secret',
		}));

		await userEvent.click(screen.getByTestId('service-account-credential-add'));

		expect(await screen.findByDisplayValue('super-secret')).toBeInTheDocument();
		expect(store.createCredential).toHaveBeenCalledWith(serviceAccount.id);
	});

	it('deletes a credential once the confirmation is accepted', async () => {
		const { store } = await renderModal([credential()]);

		await userEvent.click(await screen.findByTestId('service-account-credential-delete'));
		await userEvent.click(await screen.findByRole('button', { name: 'Delete credential' }));

		await waitFor(() => expect(store.deleteCredential).toHaveBeenCalledWith('cred-1'));
	});

	it('drops the revealed secret when reopened', async () => {
		const { store, rerender } = await renderModal([]);
		store.createCredential = vi.fn(async () => ({
			...credential({ id: 'cred-new', clientId: 'client-new' }),
			clientSecret: 'super-secret',
		}));

		await userEvent.click(screen.getByTestId('service-account-credential-add'));
		await screen.findByDisplayValue('super-secret');

		await rerender({ serviceAccount, open: false });
		await rerender({ serviceAccount, open: true });

		await waitFor(() => expect(screen.queryByDisplayValue('super-secret')).not.toBeInTheDocument());
	});
});
