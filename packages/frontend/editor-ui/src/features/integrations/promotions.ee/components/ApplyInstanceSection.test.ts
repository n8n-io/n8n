import { createTestingPinia } from '@pinia/testing';
import type { IUser } from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';
import { mock } from 'vitest-mock-extended';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type { PromotionConnection } from '../promotionsSettings.api';
import ApplyInstanceSection from './ApplyInstanceSection.vue';

const timestamps = {
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const applyConfig = (
	branchName = 'main',
	checkout = { hasCheckout: true, matchesConfig: true },
) => ({
	id: 'config-apply',
	name: 'Apply',
	settings: { schemaVersion: 1 as const, branchName },
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
		configs: { apply: applyConfig() },
		...timestamps,
		...overrides,
	}) as PromotionConnection;

const renderComponent = createComponentRenderer(ApplyInstanceSection);

let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

describe('ApplyInstanceSection', () => {
	beforeEach(() => {
		createTestingPinia();
		usersStore = mockedStore(useUsersStore);
		usersStore.currentUser = mock<IUser>({ globalScopes: ['gitConnection:pull'] });
	});

	it('shows the apply action when an apply config and pull scope are present', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { connection: instanceConnection() },
		});

		expect(getByTestId('apply-instance-button')).toBeEnabled();
		expect(queryByTestId('apply-instance-not-connected')).toBeNull();
	});

	it('disables the apply action and explains why when the checkout is not connected', () => {
		const { getByTestId } = renderComponent({
			props: {
				connection: instanceConnection({
					configs: { apply: applyConfig('main', { hasCheckout: false, matchesConfig: false }) },
				}),
			},
		});

		expect(getByTestId('apply-instance-button')).toBeDisabled();
		expect(getByTestId('apply-instance-not-connected')).toBeInTheDocument();
	});

	it('shows nothing when the connection is not loaded yet', () => {
		const { queryByTestId } = renderComponent({ props: { connection: null } });

		expect(queryByTestId('apply-instance-button')).toBeNull();
	});

	it('shows nothing when the instance connection has no apply config', () => {
		const { queryByTestId } = renderComponent({
			props: { connection: instanceConnection({ configs: {} }) },
		});

		expect(queryByTestId('apply-instance-button')).toBeNull();
	});

	it('shows nothing when the user lacks the pull scope', () => {
		usersStore.currentUser = mock<IUser>({ globalScopes: [] });
		const { queryByTestId } = renderComponent({
			props: { connection: instanceConnection() },
		});

		expect(queryByTestId('apply-instance-button')).toBeNull();
	});
});
