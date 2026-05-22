import { fireEvent, screen, within } from '@testing-library/vue';
import { useSettingsStore } from '@/app/stores/settings.store';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import SettingsApiView from './SettingsApiView.vue';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useApiKeysStore } from '../apiKeys.store';
import { DateTime } from 'luxon';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useRBACStore } from '@/app/stores/rbac.store';
import type { ApiKey, ApiKeyOwner } from '@n8n/api-types';

setActivePinia(createTestingPinia());

const settingsStore = mockedStore(useSettingsStore);
const cloudStore = mockedStore(useCloudPlanStore);
const apiKeysStore = mockedStore(useApiKeysStore);
const rootStore = mockedStore(useRootStore);
const usersStore = mockedStore(useUsersStore);
const rbacStore = mockedStore(useRBACStore);

const ownerFixture: ApiKeyOwner = {
	id: 'u1',
	firstName: 'Test',
	lastName: 'User',
	email: 'test@n8n.io',
};

function makeKey(overrides: Partial<ApiKey> = {}): ApiKey {
	return {
		id: '1',
		label: 'test-key-1',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		apiKey: '****Atcr',
		expiresAt: null,
		scopes: ['user:create'],
		lastUsedAt: null,
		owner: ownerFixture,
		...overrides,
	};
}

const assertHintsAreShown = ({ isSwaggerUIEnabled }: { isSwaggerUIEnabled: boolean }) => {
	const apiDocsLink = screen.getByTestId('api-docs-link');
	expect(apiDocsLink).toBeInTheDocument();
	expect(apiDocsLink).toHaveAttribute('href', 'https://docs.n8n.io/api');
	expect(apiDocsLink).toHaveAttribute('target', '_blank');

	const webhookDocsLink = screen.getByTestId('webhook-docs-link');
	expect(webhookDocsLink).toBeInTheDocument();

	if (isSwaggerUIEnabled) {
		expect(screen.getByText('API Playground')).toBeInTheDocument();
	} else {
		expect(screen.getByText('the API documentation')).toBeInTheDocument();
	}
};

describe('SettingsApiView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		usersStore.currentUserId = 'u1';
		// mockedStore lets us override computed properties.
		// @ts-expect-error: replacing a computed for the test
		usersStore.currentUser = { id: 'u1' };
		rbacStore.hasScope.mockReturnValue(false);
	});

	it('if user public api is not enabled and user is trialing it should show upgrade call to action', () => {
		settingsStore.isPublicApiEnabled = false;
		cloudStore.userIsTrialing = true;

		renderComponent(SettingsApiView);

		expect(screen.getByText('Upgrade to use API')).toBeInTheDocument();
		expect(screen.getByText('Upgrade plan')).toBeInTheDocument();
	});

	it('if user public api enabled and no API keys in account, it should show create API key CTA', () => {
		settingsStore.isPublicApiEnabled = true;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [];

		renderComponent(SettingsApiView);

		expect(screen.getByText('Create an API Key')).toBeInTheDocument();
		expect(screen.getByText('Control n8n programmatically using the')).toBeInTheDocument();
	});

	it('renders the table when keys exist, with swagger hint', () => {
		const dateInTheFuture = DateTime.now().plus({ days: 1 });

		rootStore.baseUrl = 'http://localhost:5678';
		settingsStore.publicApiPath = '/api';
		settingsStore.publicApiLatestVersion = 1;
		settingsStore.isPublicApiEnabled = true;
		settingsStore.isSwaggerUIEnabled = true;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [
			makeKey({ id: '1', label: 'test-key-1', apiKey: '****Atcr' }),
			makeKey({
				id: '2',
				label: 'test-key-2',
				apiKey: '****Bdcr',
				expiresAt: dateInTheFuture.toSeconds(),
			}),
		];

		renderComponent(SettingsApiView);

		expect(screen.getByTestId('api-key-table')).toBeInTheDocument();
		expect(screen.getByText('test-key-1')).toBeInTheDocument();
		expect(screen.getByText('test-key-2')).toBeInTheDocument();
		expect(screen.getByText('****Atcr')).toBeInTheDocument();
		expect(screen.getByText('****Bdcr')).toBeInTheDocument();
		// "Last used" is "Never" until populated.
		expect(screen.getAllByText('Never').length).toBeGreaterThan(0);

		assertHintsAreShown({ isSwaggerUIEnabled: true });
	});

	it('renders the table when keys exist, without swagger', () => {
		rootStore.baseUrl = 'http://localhost:5678';
		settingsStore.publicApiPath = '/api';
		settingsStore.publicApiLatestVersion = 1;
		settingsStore.isPublicApiEnabled = true;
		settingsStore.isSwaggerUIEnabled = false;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'test-key-1', apiKey: '****Atcr' })];

		renderComponent(SettingsApiView);

		expect(screen.getByText('test-key-1')).toBeInTheDocument();
		assertHintsAreShown({ isSwaggerUIEnabled: false });
	});

	it('hides the pagination when there is one page or fewer of keys', () => {
		settingsStore.isPublicApiEnabled = true;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'test-key-1', apiKey: '****Atcr' })];
		apiKeysStore.apiKeysCount = 1;
		apiKeysStore.pageSize = 10;

		renderComponent(SettingsApiView);

		expect(screen.queryByTestId('api-keys-pagination')).not.toBeInTheDocument();
	});

	it('shows the pagination and switches pages when there are more keys than fit on one page', async () => {
		settingsStore.isPublicApiEnabled = true;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'test-key-1', apiKey: '****Atcr' })];
		apiKeysStore.apiKeysCount = 25;
		apiKeysStore.pageSize = 10;
		apiKeysStore.page = 1;

		renderComponent(SettingsApiView);

		const pagination = screen.getByTestId('api-keys-pagination');
		expect(pagination).toBeInTheDocument();

		await fireEvent.click(within(pagination).getByText('2'));

		expect(apiKeysStore.setPage).toHaveBeenCalledWith(2);
	});

	it('shows the revoke confirm dialog when the revoke action is clicked', async () => {
		settingsStore.isPublicApiEnabled = true;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'test-key-1', apiKey: '****Atcr' })];

		renderComponent(SettingsApiView);

		const revokeButton = screen.getByTestId('api-key-revoke-action');
		await fireEvent.click(revokeButton);

		expect(screen.getByText(/Revoke "test-key-1" API key/)).toBeInTheDocument();
	});

	describe('admin tabs', () => {
		beforeEach(() => {
			rbacStore.hasScope.mockImplementation(
				(scope: string | string[]) =>
					scope === 'apiKey:manage' || (Array.isArray(scope) && scope.includes('apiKey:manage')),
			);
		});

		it("doesn't render tabs for non-admins", () => {
			rbacStore.hasScope.mockReturnValue(false);
			settingsStore.isPublicApiEnabled = true;
			apiKeysStore.apiKeys = [makeKey()];

			renderComponent(SettingsApiView);

			expect(screen.queryByTestId('api-keys-tabs')).toBeNull();
		});

		it('renders Mine/All tabs for admins and filters by tab', async () => {
			settingsStore.isPublicApiEnabled = true;
			apiKeysStore.apiKeys = [
				makeKey({ id: '1', label: 'admin-own', owner: ownerFixture }),
				makeKey({
					id: '2',
					label: 'members-key',
					owner: { id: 'u2', firstName: 'M', lastName: '', email: 'm@n8n.io' },
				}),
			];

			renderComponent(SettingsApiView);

			expect(screen.getByTestId('api-keys-tabs')).toBeInTheDocument();
			// Default is the "Mine" tab — only the admin's own key is visible.
			expect(screen.getByText('admin-own')).toBeInTheDocument();
			expect(screen.queryByText('members-key')).toBeNull();

			// Switch to All.
			await fireEvent.click(screen.getByText('All (2)'));
			expect(screen.getByText('admin-own')).toBeInTheDocument();
			expect(screen.getByText('members-key')).toBeInTheDocument();
		});
	});
});
