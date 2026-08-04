import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { setActivePinia } from 'pinia';

import { renderComponent } from '@/__tests__/render';

import ImpersonationBar from './ImpersonationBar.vue';
import { useImpersonationStore } from '../impersonation.store';

const actor = { id: 'human-1', email: 'admin@example.com', firstName: 'Ada', lastName: 'Lovelace' };

const renderBar = () => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);
	return { pinia, ...renderComponent(ImpersonationBar, { pinia }) };
};

describe('ImpersonationBar', () => {
	it('renders nothing when not impersonating', () => {
		renderBar();

		expect(screen.queryByTestId('impersonation-bar')).not.toBeInTheDocument();
	});

	it('names both identities so the operator knows who they are acting as', async () => {
		renderBar();
		const store = useImpersonationStore();

		store.setState({ actor, serviceAccountName: 'Deploy Bot' });

		const bar = await screen.findByTestId('impersonation-bar');
		expect(bar).toHaveTextContent('Deploy Bot');
		expect(bar).toHaveTextContent('Ada Lovelace');
	});

	it('offers a return action and no dismiss control', async () => {
		renderBar();
		const store = useImpersonationStore();
		store.setState({ actor, serviceAccountName: 'Deploy Bot' });

		const bar = await screen.findByTestId('impersonation-bar');

		expect(screen.getByTestId('impersonation-bar-return')).toBeInTheDocument();
		// The bar is the only exit. Nothing may dismiss it.
		expect(bar.querySelectorAll('button')).toHaveLength(1);
	});

	it('calls stop() when the return button is clicked', async () => {
		renderBar();
		const store = useImpersonationStore();
		store.setState({ actor, serviceAccountName: 'Deploy Bot' });
		const stop = vi.spyOn(store, 'stop').mockResolvedValue(undefined);

		await screen.findByTestId('impersonation-bar');
		await userEvent.click(screen.getByTestId('impersonation-bar-return'));

		await waitFor(() => expect(stop).toHaveBeenCalled());
	});

	it('stays visible after a failed return so the operator can retry', async () => {
		renderBar();
		const store = useImpersonationStore();
		store.setState({ actor, serviceAccountName: 'Deploy Bot' });
		vi.spyOn(store, 'stop').mockRejectedValue(new Error('nope'));

		await screen.findByTestId('impersonation-bar');
		await userEvent.click(screen.getByTestId('impersonation-bar-return'));

		await waitFor(() => expect(screen.getByTestId('impersonation-bar-return')).toBeInTheDocument());
	});
});
