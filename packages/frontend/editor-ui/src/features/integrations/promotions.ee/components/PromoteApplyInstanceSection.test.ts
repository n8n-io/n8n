import { createTestingPinia } from '@pinia/testing';
import type { IUser } from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';
import { mock } from 'vitest-mock-extended';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type { PromotionConnection } from '../promotionsSettings.api';
import PromoteApplyInstanceSection from './PromoteApplyInstanceSection.vue';

const timestamps = {
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const promoteConfig = (checkout = { hasCheckout: true, matchesConfig: true }) => ({
	id: 'config-promote',
	name: 'Promote',
	settings: { schemaVersion: 1 as const, baseBranchName: 'main', createBranchOnPromotion: false },
	checkout,
	...timestamps,
});

const applyConfig = (checkout = { hasCheckout: true, matchesConfig: true }) => ({
	id: 'config-apply',
	name: 'Apply',
	settings: { schemaVersion: 1 as const, branchName: 'main' },
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
		configs: { promote: promoteConfig(), apply: applyConfig() },
		...timestamps,
		...overrides,
	}) as PromotionConnection;

const renderComponent = createComponentRenderer(PromoteApplyInstanceSection);

let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

describe('PromoteApplyInstanceSection', () => {
	beforeEach(() => {
		createTestingPinia();
		usersStore = mockedStore(useUsersStore);
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:push', 'gitConnection:pull'],
		});
	});

	it('shows both actions in one section when both configs and scopes are present', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { connection: instanceConnection() },
		});

		expect(getByTestId('promote-instance-button')).toBeEnabled();
		expect(getByTestId('apply-instance-button')).toBeEnabled();
		expect(queryByTestId('promote-instance-not-connected')).toBeNull();
		expect(queryByTestId('apply-instance-not-connected')).toBeNull();
	});

	it('shows only the promote action when apply is unavailable', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { connection: instanceConnection({ configs: { promote: promoteConfig() } }) },
		});

		expect(getByTestId('promote-instance-button')).toBeInTheDocument();
		expect(queryByTestId('apply-instance-button')).toBeNull();
	});

	it('shows only the apply action when promote is unavailable', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { connection: instanceConnection({ configs: { apply: applyConfig() } }) },
		});

		expect(getByTestId('apply-instance-button')).toBeInTheDocument();
		expect(queryByTestId('promote-instance-button')).toBeNull();
	});

	it('disables each action and explains why when its checkout is not connected', () => {
		const { getByTestId } = renderComponent({
			props: {
				connection: instanceConnection({
					configs: {
						promote: promoteConfig({ hasCheckout: false, matchesConfig: false }),
						apply: applyConfig({ hasCheckout: false, matchesConfig: false }),
					},
				}),
			},
		});

		expect(getByTestId('promote-instance-button')).toBeDisabled();
		expect(getByTestId('promote-instance-not-connected')).toBeInTheDocument();
		expect(getByTestId('apply-instance-button')).toBeDisabled();
		expect(getByTestId('apply-instance-not-connected')).toBeInTheDocument();
	});

	it('shows nothing when the connection is not loaded yet', () => {
		const { queryByTestId } = renderComponent({ props: { connection: null } });

		expect(queryByTestId('promote-instance-button')).toBeNull();
		expect(queryByTestId('apply-instance-button')).toBeNull();
	});

	it('shows nothing when the connection has no promote or apply config', () => {
		const { queryByTestId } = renderComponent({
			props: { connection: instanceConnection({ configs: {} }) },
		});

		expect(queryByTestId('promote-instance-button')).toBeNull();
		expect(queryByTestId('apply-instance-button')).toBeNull();
	});

	it('hides the promote action when the user lacks the push scope', () => {
		usersStore.currentUser = mock<IUser>({ globalScopes: ['gitConnection:pull'] });
		const { getByTestId, queryByTestId } = renderComponent({
			props: { connection: instanceConnection() },
		});

		expect(queryByTestId('promote-instance-button')).toBeNull();
		expect(getByTestId('apply-instance-button')).toBeInTheDocument();
	});

	it('hides the apply action when the user lacks the pull scope', () => {
		usersStore.currentUser = mock<IUser>({ globalScopes: ['gitConnection:push'] });
		const { getByTestId, queryByTestId } = renderComponent({
			props: { connection: instanceConnection() },
		});

		expect(queryByTestId('apply-instance-button')).toBeNull();
		expect(getByTestId('promote-instance-button')).toBeInTheDocument();
	});
});
