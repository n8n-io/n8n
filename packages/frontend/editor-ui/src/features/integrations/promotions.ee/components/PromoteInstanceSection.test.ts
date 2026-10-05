import { createTestingPinia } from '@pinia/testing';
import type { IUser } from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';
import { mock } from 'vitest-mock-extended';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type { PromotionConnection } from '../promotionsSettings.api';
import PromoteInstanceSection from './PromoteInstanceSection.vue';

const timestamps = {
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const promoteConfig = (
	baseBranchName = 'main',
	createBranchOnPromotion = false,
	checkout = { hasCheckout: true, matchesConfig: true },
) => ({
	id: 'config-promote',
	name: 'Promote',
	settings: { schemaVersion: 1 as const, baseBranchName, createBranchOnPromotion },
	checkout,
	...timestamps,
});

const instanceConnection = (overrides: Partial<PromotionConnection> = {}): PromotionConnection =>
	({
		id: 'connection-1',
		name: 'Production',
		scope: 'instance',
		target: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
		provider: {
			id: 'provider-ssh',
			name: 'Production key',
			type: 'git',
			authType: 'ssh-key',
			...timestamps,
		},
		configs: { promote: promoteConfig() },
		...timestamps,
		...overrides,
	}) as PromotionConnection;

const renderComponent = createComponentRenderer(PromoteInstanceSection);

let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

describe('PromoteInstanceSection', () => {
	beforeEach(() => {
		createTestingPinia();
		usersStore = mockedStore(useUsersStore);
		usersStore.currentUser = mock<IUser>({ globalScopes: ['gitConnection:push'] });
	});

	it('shows the promote action when a promote config and push scope are present', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { connection: instanceConnection() },
		});

		expect(getByTestId('promote-instance-button')).toBeEnabled();
		expect(queryByTestId('promote-instance-not-connected')).toBeNull();
	});

	it('disables the promote action and explains why when the checkout is not connected', () => {
		const { getByTestId } = renderComponent({
			props: {
				connection: instanceConnection({
					configs: {
						promote: promoteConfig('main', false, { hasCheckout: false, matchesConfig: false }),
					},
				}),
			},
		});

		expect(getByTestId('promote-instance-button')).toBeDisabled();
		expect(getByTestId('promote-instance-not-connected')).toBeInTheDocument();
	});

	it('shows nothing when the connection is not loaded yet', () => {
		const { queryByTestId } = renderComponent({ props: { connection: null } });

		expect(queryByTestId('promote-instance-button')).toBeNull();
	});

	it('shows nothing when the instance connection has no promote config', () => {
		const { queryByTestId } = renderComponent({
			props: { connection: instanceConnection({ configs: {} }) },
		});

		expect(queryByTestId('promote-instance-button')).toBeNull();
	});

	it('shows nothing when the user lacks the push scope', () => {
		usersStore.currentUser = mock<IUser>({ globalScopes: [] });
		const { queryByTestId } = renderComponent({
			props: { connection: instanceConnection() },
		});

		expect(queryByTestId('promote-instance-button')).toBeNull();
	});
});
