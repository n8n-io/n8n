import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useToast } from '@/app/composables/useToast';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import SettingsApiView from './SettingsApiView.vue';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useApiKeysStore } from '../apiKeys.store';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY } from '../apiKeys.constants';
import { DateTime } from 'luxon';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import type { ApiKey, ApiKeyOwner, ApiKeyOwnerSummary } from '@n8n/api-types';

vi.mock('@/app/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({ track }),
	};
});

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	const showToast = vi.fn();
	return {
		useToast: () => ({ showError, showMessage, showToast }),
	};
});

// The real ApiKeyOwnerFilter renders inside an N8nPopover whose panel only mounts
// on open (driven by Reka UI, which doesn't open in jsdom). Replace it with a stub
// so we can assert the props the view passes down and emit `update:model-value`
// back without driving the popover.
vi.mock('../components/ApiKeyOwnerFilter.vue', async () => {
	const { defineComponent } = await import('vue');
	return {
		default: defineComponent({
			name: 'ApiKeyOwnerFilter',
			props: {
				modelValue: { type: Array as () => string[], default: () => [] },
				users: { type: Array, default: () => [] },
				counts: { type: Object as () => Record<string, number>, default: () => ({}) },
				totalCount: { type: Number, default: undefined },
				currentUserId: { type: String, default: '' },
			},
			emits: ['update:modelValue'],
			// The view passes data-test-id="api-keys-owner-filter" as a fallthrough
			// attribute, which overrides any data-test-id set here, so we expose the
			// mapped props through dedicated data-* attributes (as plain strings to
			// avoid JSON parsing) and query by the view's own test id.
			computed: {
				modelValueAttr(): string {
					return [...this.modelValue].join(',');
				},
				countsAttr(): string {
					return Object.keys(this.counts)
						.sort()
						.map((id) => `${id}:${this.counts[id]}`)
						.join(',');
				},
			},
			template: `
				<button
					:data-model-value="modelValueAttr"
					:data-counts="countsAttr"
					:data-total-count="totalCount"
					@click="$emit('update:modelValue', ['u1'])"
				>filter</button>
			`,
		}),
	};
});

// Reka UI's dropdown menu doesn't open in jsdom (no pointer-capture support), so the
// row action menu can't be driven through the real component. Stub it to render its
// items directly as buttons keyed by their testId, emitting `select` on click.
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nActionDropdown: {
			name: 'N8nActionDropdown',
			props: { items: { type: Array, required: true } },
			emits: ['select'],
			template: `
				<div>
					<button
						v-for="item in items"
						:key="item.id"
						:data-test-id="item.testId"
						@click="$emit('select', item.id)"
					>{{ item.label }}</button>
				</div>
			`,
		},
	};
});

setActivePinia(createTestingPinia());

const settingsStore = mockedStore(useSettingsStore);
const cloudStore = mockedStore(useCloudPlanStore);
const apiKeysStore = mockedStore(useApiKeysStore);
const rootStore = mockedStore(useRootStore);
const usersStore = mockedStore(useUsersStore);
const rbacStore = mockedStore(useRBACStore);
const uiStore = mockedStore(useUIStore);

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

const assertHintsAreShown = (expectedPlaygroundHref: string) => {
	const apiDocsLink = screen.getByTestId('api-docs-link');
	expect(apiDocsLink).toBeInTheDocument();
	expect(apiDocsLink).toHaveAttribute('href', 'https://docs.n8n.io/api');
	expect(apiDocsLink).toHaveAttribute('target', '_blank');

	expect(screen.getByTestId('webhook-docs-link')).toBeInTheDocument();

	const playgroundLink = screen.getByTestId('api-playground-link');
	expect(playgroundLink).toBeInTheDocument();
	// The playground href must have exactly one slash between baseUrl and publicApiPath.
	expect(playgroundLink).toHaveAttribute('href', expectedPlaygroundHref);
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

		expect(screen.getByText('Create API key')).toBeInTheDocument();
		expect(screen.getByText('Control n8n programmatically using the')).toBeInTheDocument();
	});

	it('renders the table when keys exist, with swagger hint', () => {
		const dateInTheFuture = DateTime.now().plus({ days: 1 });

		rootStore.baseUrl = 'http://localhost:5678';
		// Match the backend default (no leading slash) so the join logic is tested as in prod.
		settingsStore.publicApiPath = 'api';
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
		apiKeysStore.allCount = 2;
		apiKeysStore.mineCount = 2;
		apiKeysStore.totalMineCount = apiKeysStore.mineCount;
		apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

		renderComponent(SettingsApiView);

		expect(screen.getByTestId('api-key-table')).toBeInTheDocument();
		expect(screen.getByText('test-key-1')).toBeInTheDocument();
		expect(screen.getByText('test-key-2')).toBeInTheDocument();
		expect(screen.getByText('****Atcr')).toBeInTheDocument();
		expect(screen.getByText('****Bdcr')).toBeInTheDocument();
		// "Last used" is "Never" until populated.
		expect(screen.getAllByText('Never').length).toBeGreaterThan(0);

		// Swagger UI enabled: link points at the instance's API docs, joined with a single slash.
		assertHintsAreShown('http://localhost:5678/api/v1/docs');
	});

	it('renders the table when keys exist, without swagger', () => {
		rootStore.baseUrl = 'http://localhost:5678';
		// Match the backend default (no leading slash) so the join logic is tested as in prod.
		settingsStore.publicApiPath = 'api';
		settingsStore.publicApiLatestVersion = 1;
		settingsStore.isPublicApiEnabled = true;
		settingsStore.isSwaggerUIEnabled = false;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'test-key-1', apiKey: '****Atcr' })];
		apiKeysStore.allCount = 1;
		apiKeysStore.mineCount = 1;
		apiKeysStore.totalMineCount = apiKeysStore.mineCount;
		apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

		renderComponent(SettingsApiView);

		expect(screen.getByText('test-key-1')).toBeInTheDocument();
		// Swagger UI disabled: link falls back to the public docs API reference.
		assertHintsAreShown('https://docs.n8n.io/api/api-reference/');
	});

	it('joins baseUrl and publicApiPath with a single slash regardless of their slash shape', () => {
		// baseUrl with a trailing slash + publicApiPath with a leading slash would
		// otherwise concatenate into a double slash ("…//api/…").
		rootStore.baseUrl = 'http://localhost:5678/';
		settingsStore.publicApiPath = '/api';
		settingsStore.publicApiLatestVersion = 1;
		settingsStore.isPublicApiEnabled = true;
		settingsStore.isSwaggerUIEnabled = true;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'test-key-1', apiKey: '****Atcr' })];
		apiKeysStore.allCount = 1;
		apiKeysStore.mineCount = 1;
		apiKeysStore.totalMineCount = apiKeysStore.mineCount;
		apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

		renderComponent(SettingsApiView);

		expect(screen.getByTestId('api-playground-link')).toHaveAttribute(
			'href',
			'http://localhost:5678/api/v1/docs',
		);
	});

	it('shows the revoke confirm dialog when the revoke action is clicked', async () => {
		settingsStore.isPublicApiEnabled = true;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'test-key-1', apiKey: '****Atcr' })];
		apiKeysStore.allCount = 1;
		apiKeysStore.mineCount = 1;
		apiKeysStore.totalMineCount = apiKeysStore.mineCount;
		apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

		renderComponent(SettingsApiView);

		await fireEvent.click(screen.getByTestId('api-key-revoke-action'));

		expect(screen.getByText(/Revoke "test-key-1" API key/)).toBeInTheDocument();
	});

	describe('rotation', () => {
		const singleOwnedKey = (overrides: Partial<ApiKey> = {}) => {
			settingsStore.isPublicApiEnabled = true;
			cloudStore.userIsTrialing = false;
			apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'test-key-1', ...overrides })];
			apiKeysStore.allCount = 1;
			apiKeysStore.mineCount = 1;
			apiKeysStore.totalMineCount = 1;
			apiKeysStore.totalAllCount = 1;
		};

		it('offers Rotate for an owned, non-expired key', () => {
			singleOwnedKey({ expiresAt: null });

			renderComponent(SettingsApiView);

			expect(screen.getByTestId('api-key-rotate-action')).toBeInTheDocument();
		});

		it('hides Rotate for an expired key', () => {
			singleOwnedKey({ expiresAt: DateTime.now().minus({ days: 1 }).toSeconds() });

			renderComponent(SettingsApiView);

			expect(screen.queryByTestId('api-key-rotate-action')).toBeNull();
		});

		it('hides Rotate for another user’s key', () => {
			singleOwnedKey({ owner: { ...ownerFixture, id: 'someone-else' } });

			renderComponent(SettingsApiView);

			expect(screen.queryByTestId('api-key-rotate-action')).toBeNull();
		});

		it('confirms, rotates via the store, and opens the created modal with the new key', async () => {
			singleOwnedKey({ expiresAt: null });
			const rotated = {
				...makeKey({ id: '1', label: 'test-key-1' }),
				rawApiKey: 'rotated-raw-key',
			};
			apiKeysStore.rotateApiKey.mockResolvedValue(rotated);

			renderComponent(SettingsApiView);

			await fireEvent.click(screen.getByTestId('api-key-rotate-action'));
			expect(screen.getByText(/Rotate "test-key-1" API key/)).toBeInTheDocument();

			// The confirm dialog renders via a portal; click the modal's confirm action.
			const rotateButtons = await screen.findAllByRole('button', { name: 'Rotate' });
			await fireEvent.click(rotateButtons[rotateButtons.length - 1]);

			expect(apiKeysStore.rotateApiKey).toHaveBeenCalledWith('1');
			// The rotated key is shown through the same modal used for newly created keys.
			await waitFor(() =>
				expect(uiStore.openModalWithData).toHaveBeenCalledWith({
					name: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
					data: { mode: 'new', rotatedApiKey: rotated },
				}),
			);
		});
	});

	it('keeps the search input visible when a filter zeroes the results', () => {
		settingsStore.isPublicApiEnabled = true;
		apiKeysStore.apiKeys = [];
		apiKeysStore.allCount = 0;
		apiKeysStore.mineCount = 0;
		apiKeysStore.totalMineCount = apiKeysStore.mineCount;
		apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;
		apiKeysStore.labelFilter = 'production';

		renderComponent(SettingsApiView);

		// Search input stays visible — the user must be able to clear the filter.
		expect(screen.getByTestId('api-keys-search')).toBeInTheDocument();
		// And we show the no-results message instead of the empty-state CTA.
		expect(screen.getByTestId('api-keys-no-results')).toBeInTheDocument();
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
			apiKeysStore.mineCount = 1;
			apiKeysStore.allCount = 1;
			apiKeysStore.totalMineCount = apiKeysStore.mineCount;
			apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

			renderComponent(SettingsApiView);

			expect(screen.queryByTestId('api-keys-tabs')).toBeNull();
		});

		it('renders Mine/All tabs with per-scope counts for admins', () => {
			settingsStore.isPublicApiEnabled = true;
			apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'admin-own', owner: ownerFixture })];
			apiKeysStore.mineCount = 1;
			apiKeysStore.allCount = 2;
			apiKeysStore.totalMineCount = apiKeysStore.mineCount;
			apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

			renderComponent(SettingsApiView);

			const tabs = screen.getByTestId('api-keys-tabs');
			expect(tabs).toBeInTheDocument();
			// Counts render as pills next to the label, populated from the store
			// (server-side totals — independent of the current page).
			expect(within(tabs).getByText('1')).toBeInTheDocument();
			expect(within(tabs).getByText('2')).toBeInTheDocument();
		});

		it('renders tab badges from unfiltered totals so an active filter does not shrink them', () => {
			settingsStore.isPublicApiEnabled = true;
			apiKeysStore.apiKeys = [];
			// Filtered counts collapsed by an active label search…
			apiKeysStore.mineCount = 0;
			apiKeysStore.allCount = 0;
			// …but the unfiltered totals stay at their true population.
			apiKeysStore.totalMineCount = 3;
			apiKeysStore.totalAllCount = 7;
			apiKeysStore.labelFilter = 'nothing-matches';

			renderComponent(SettingsApiView);

			const tabs = screen.getByTestId('api-keys-tabs');
			expect(within(tabs).getByText('3')).toBeInTheDocument();
			expect(within(tabs).getByText('7')).toBeInTheDocument();
		});

		it('switches ownership server-side when the user clicks a tab', async () => {
			settingsStore.isPublicApiEnabled = true;
			apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'admin-own', owner: ownerFixture })];
			apiKeysStore.mineCount = 1;
			apiKeysStore.allCount = 2;
			apiKeysStore.totalMineCount = apiKeysStore.mineCount;
			apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

			renderComponent(SettingsApiView);

			await fireEvent.click(screen.getByText('All'));

			expect(apiKeysStore.setOwnership).toHaveBeenCalledWith('all');
		});

		it('tracks "User viewed all API keys" when the admin opens the All tab', async () => {
			settingsStore.isPublicApiEnabled = true;
			apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'admin-own', owner: ownerFixture })];
			apiKeysStore.mineCount = 1;
			apiKeysStore.allCount = 2;
			apiKeysStore.totalMineCount = apiKeysStore.mineCount;
			apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

			renderComponent(SettingsApiView);

			const { track } = useTelemetry();

			await fireEvent.click(screen.getByText('All'));

			expect(track).toHaveBeenCalledWith('User viewed all API keys');
		});

		it('does not track "User viewed all API keys" when switching back to Mine', async () => {
			settingsStore.isPublicApiEnabled = true;
			apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'admin-own', owner: ownerFixture })];
			apiKeysStore.mineCount = 1;
			apiKeysStore.allCount = 2;
			apiKeysStore.totalMineCount = apiKeysStore.mineCount;
			apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

			renderComponent(SettingsApiView);

			const { track } = useTelemetry();

			await fireEvent.click(screen.getByText('Mine'));

			expect(track).not.toHaveBeenCalledWith('User viewed all API keys');
		});
	});

	describe('telemetry', () => {
		beforeEach(() => {
			settingsStore.isPublicApiEnabled = true;
		});

		it('tracks "User clicked view API key scopes" with is_own=true for the current user’s key', async () => {
			apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'mine', owner: ownerFixture })];
			apiKeysStore.mineCount = 1;
			apiKeysStore.allCount = 1;
			apiKeysStore.totalMineCount = apiKeysStore.mineCount;
			apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

			renderComponent(SettingsApiView);

			const { track } = useTelemetry();

			await fireEvent.click(screen.getByTestId('api-key-scopes-cell'));

			expect(track).toHaveBeenCalledWith('User clicked view API key scopes', { is_own: true });
		});

		it('tracks "User clicked view API key scopes" with is_own=false for another user’s key', async () => {
			apiKeysStore.apiKeys = [
				makeKey({
					id: '1',
					label: 'theirs',
					owner: { ...ownerFixture, id: 'someone-else' },
				}),
			];
			apiKeysStore.mineCount = 1;
			apiKeysStore.allCount = 1;
			apiKeysStore.totalMineCount = apiKeysStore.mineCount;
			apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

			renderComponent(SettingsApiView);

			const { track } = useTelemetry();

			await fireEvent.click(screen.getByTestId('api-key-scopes-cell'));

			expect(track).toHaveBeenCalledWith('User clicked view API key scopes', { is_own: false });
		});

		it('tracks "User clicked delete API key button" with is_own derived from the revoked key', async () => {
			apiKeysStore.apiKeys = [
				makeKey({
					id: '1',
					label: 'theirs',
					owner: { ...ownerFixture, id: 'someone-else' },
				}),
			];
			apiKeysStore.mineCount = 1;
			apiKeysStore.allCount = 1;
			apiKeysStore.totalMineCount = apiKeysStore.mineCount;
			apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;

			renderComponent(SettingsApiView);

			const { track } = useTelemetry();

			await fireEvent.click(screen.getByTestId('api-key-revoke-action'));
			// The confirm dialog renders via a portal. Take the last "Revoke" button so we
			// click the modal's confirm action rather than the stubbed menu item.
			const revokeButtons = await screen.findAllByRole('button', { name: 'Revoke' });
			await fireEvent.click(revokeButtons[revokeButtons.length - 1]);

			expect(track).toHaveBeenCalledWith('User clicked delete API key button', {
				is_own: false,
			});
		});
	});

	describe('owner filter', () => {
		const ownerSummary = (overrides: Partial<ApiKeyOwnerSummary> = {}): ApiKeyOwnerSummary => ({
			id: 'u1',
			firstName: 'Test',
			lastName: 'User',
			email: 'test@n8n.io',
			keyCount: 1,
			...overrides,
		});

		const setupAllTab = (owners: ApiKeyOwnerSummary[] = [ownerSummary()]) => {
			rbacStore.hasScope.mockImplementation(
				(scope: string | string[]) =>
					scope === 'apiKey:manage' || (Array.isArray(scope) && scope.includes('apiKey:manage')),
			);
			settingsStore.isPublicApiEnabled = true;
			cloudStore.userIsTrialing = false;
			apiKeysStore.apiKeys = [makeKey({ id: '1', label: 'admin-own', owner: ownerFixture })];
			apiKeysStore.mineCount = 1;
			apiKeysStore.allCount = 2;
			apiKeysStore.totalMineCount = apiKeysStore.mineCount;
			apiKeysStore.totalAllCount = apiKeysStore.allCount || 1;
			apiKeysStore.ownership = 'all';
			apiKeysStore.ownerIds = null;
			apiKeysStore.owners = owners;
		};

		it('shows the owner filter when an admin is on the All tab', () => {
			setupAllTab();

			renderComponent(SettingsApiView);

			expect(screen.getByTestId('api-keys-owner-filter')).toBeInTheDocument();
		});

		it('hides the owner filter on the Mine tab', () => {
			setupAllTab();
			apiKeysStore.ownership = 'mine';

			renderComponent(SettingsApiView);

			expect(screen.queryByTestId('api-keys-owner-filter')).toBeNull();
		});

		it('hides the owner filter when the user lacks apiKey:manage', () => {
			setupAllTab();
			rbacStore.hasScope.mockReturnValue(false);

			renderComponent(SettingsApiView);

			expect(screen.queryByTestId('api-keys-owner-filter')).toBeNull();
		});

		it('maps store owners into the filter: model-value is every owner id when ownerIds is null, plus counts and total', () => {
			setupAllTab([
				ownerSummary({ id: 'u1', keyCount: 1 }),
				ownerSummary({ id: 'u2', email: 'other@n8n.io', keyCount: 4 }),
			]);
			apiKeysStore.totalAllCount = 5;

			renderComponent(SettingsApiView);

			const filter = screen.getByTestId('api-keys-owner-filter');
			// ownerIds is null -> selectedOwnerIds maps to every owner id.
			expect(filter.getAttribute('data-model-value')).toBe('u1,u2');
			// ownerKeyCounts maps owner.id -> keyCount.
			expect(filter.getAttribute('data-counts')).toBe('u1:1,u2:4');
			// total-count comes from the unfiltered all-population total.
			expect(filter.getAttribute('data-total-count')).toBe('5');
		});

		it('uses the store ownerIds for model-value when a subset is selected', () => {
			setupAllTab([
				ownerSummary({ id: 'u1', keyCount: 1 }),
				ownerSummary({ id: 'u2', email: 'other@n8n.io', keyCount: 4 }),
			]);
			apiKeysStore.ownerIds = ['u2'];

			renderComponent(SettingsApiView);

			const filter = screen.getByTestId('api-keys-owner-filter');
			expect(filter.getAttribute('data-model-value')).toBe('u2');
		});

		it('calls setOwnerFilter with the selection when the filter emits update:model-value', async () => {
			setupAllTab();
			apiKeysStore.setOwnerFilter.mockResolvedValue();

			renderComponent(SettingsApiView);

			await fireEvent.click(screen.getByTestId('api-keys-owner-filter'));

			expect(apiKeysStore.setOwnerFilter).toHaveBeenCalledWith(['u1']);
		});

		it('shows an error when setOwnerFilter rejects', async () => {
			setupAllTab();
			const toast = useToast();
			apiKeysStore.setOwnerFilter.mockRejectedValue(new Error('boom'));

			renderComponent(SettingsApiView);

			await fireEvent.click(screen.getByTestId('api-keys-owner-filter'));
			await flushPromises();

			expect(apiKeysStore.setOwnerFilter).toHaveBeenCalledWith(['u1']);
			expect(toast.showError).toHaveBeenCalled();
		});
	});
});
