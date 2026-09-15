import type { FrontendSettings } from '@n8n/api-types';
import { ROLE } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import * as cloudPlanApi from '@n8n/rest-api-client/api/cloudPlans';
import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';

import { useCloudPlanStore } from '../cloudPlan.store';
import {
	clearDefaultUpgradeRedirectGuard,
	setDefaultUpgradeRedirectGuard,
} from '../registries/upgradeRedirectGuard';
import { useSettingsStore } from '../settings.store';
import { useUsersStore } from '../users.store';
import { useVersionsStore } from '../versions.store';
import type { UpgradeRedirectGuard } from './useBasePageRedirectionHelper';
import { useBasePageRedirectionHelper } from './useBasePageRedirectionHelper';

let settingsStore: ReturnType<typeof useSettingsStore>;
let usersStore: ReturnType<typeof useUsersStore>;
let versionStore: ReturnType<typeof useVersionsStore>;
let pageRedirectionHelper: ReturnType<typeof useBasePageRedirectionHelper>;

vi.mock('@n8n/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => {
			return {
				track,
			};
		},
	};
});

/** Only `deployment.type` steers this composable; the rest of the settings object is stubbed. */
const settingsFor = (type: string) =>
	mock<FrontendSettings>({
		deployment: { type },
	});

describe('useBasePageRedirectionHelper', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	beforeEach(() => {
		setActivePinia(createPinia());
		settingsStore = useSettingsStore();
		usersStore = useUsersStore();
		versionStore = useVersionsStore();

		pageRedirectionHelper = useBasePageRedirectionHelper({
			guard: vi.fn<UpgradeRedirectGuard>().mockResolvedValue(true),
		});

		vi.spyOn(cloudPlanApi, 'getAdminPanelLoginCode').mockResolvedValue({
			code: '123',
		});

		const url = 'https://test.app.n8n.cloud';

		Object.defineProperty(window, 'location', {
			value: {
				href: url,
			},
			writable: true,
		});

		versionStore.initialize({
			enabled: true,
			endpoint: '',
			infoUrl:
				'https://docs.n8n.io/release-notes/#n8n1652?utm_source=n8n_app&utm_medium=instance_upgrade_releases',
			whatsNewEnabled: true,
			whatsNewEndpoint: '',
		});
	});

	test.each([
		[
			'default',
			ROLE.Owner,
			'https://n8n.io/pricing?utm_campaign=upgrade-api&source=advanced-permissions',
		],
		[
			'cloud',
			ROLE.Owner,
			`https://app.n8n.cloud/login?code=123&returnPath=${encodeURIComponent(
				'/account/change-plan',
			)}&utm_campaign=upgrade-api&source=advanced-permissions`,
		],
		[
			'cloud',
			ROLE.Member,
			'https://n8n.io/pricing?utm_campaign=upgrade-api&source=advanced-permissions',
		],
	])(
		'"goToUpgrade" should generate the correct URL for "%s" deployment and user role "%s"',
		async (type, role, expectation) => {
			// Arrange

			usersStore.addUsers([
				{
					id: '1',
					isPending: false,
					role,
				},
			]);

			usersStore.currentUserId = '1';

			const telemetry = useTelemetry();

			settingsStore.setSettings(settingsFor(type));

			// Act

			await pageRedirectionHelper.goToUpgrade('advanced-permissions', 'upgrade-api', 'redirect');

			// Assert

			expect(telemetry.track).toHaveBeenCalledWith(
				'User clicked upgrade CTA',
				expect.objectContaining({
					source: 'advanced-permissions',
					isTrial: false,
					deploymentType: type,
					trialDaysLeft: expect.any(Number),
					executionsLeft: expect.any(Number),
					workflowsLeft: expect.any(Number),
				}),
			);

			expect(location.href).toBe(expectation);
		},
	);

	describe('goToVersions', () => {
		test('redirects in the same tab for cloud instance owners', async () => {
			usersStore.addUsers([{ id: '1', isPending: false, role: ROLE.Owner }]);
			usersStore.currentUserId = '1';

			settingsStore.setSettings(settingsFor('cloud'));

			const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);

			await pageRedirectionHelper.goToVersions();

			expect(location.href).toBe(
				`https://app.n8n.cloud/login?code=123&returnPath=${encodeURIComponent('/manage')}`,
			);
			expect(windowOpenSpy).not.toHaveBeenCalled();
		});

		test.each([
			['cloud', ROLE.Member],
			['default', ROLE.Owner],
			['default', ROLE.Member],
		])('opens the docs URL in a new tab for "%s" deployment with role "%s"', async (type, role) => {
			usersStore.addUsers([{ id: '1', isPending: false, role }]);
			usersStore.currentUserId = '1';

			settingsStore.setSettings(settingsFor(type));

			const initialHref = location.href;
			const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);

			await pageRedirectionHelper.goToVersions();

			expect(windowOpenSpy).toHaveBeenCalledWith(
				'https://docs.n8n.io/release-notes/#n8n1652?utm_source=n8n_app&utm_medium=instance_upgrade_releases',
				'_blank',
				'noopener',
			);
			expect(location.href).toBe(initialHref);
		});
	});

	test.each([
		[
			'cloud',
			ROLE.Owner,
			`https://app.n8n.cloud/login?code=123&returnPath=${encodeURIComponent('/dashboard')}`,
		],
		['cloud', ROLE.Member, 'https://test.app.n8n.cloud'],
	])(
		'"goToDashboard" should generate the correct URL for "%s" deployment and user role "%s"',
		async (type, role, expectation) => {
			// Arrange

			usersStore.addUsers([
				{
					id: '1',
					isPending: false,
					role,
				},
			]);

			usersStore.currentUserId = '1';

			settingsStore.setSettings(settingsFor(type));

			// Act

			await pageRedirectionHelper.goToDashboard();

			// Assert

			expect(location.href).toBe(expectation);
		},
	);

	describe('goToUpgrade with an injected guard', () => {
		beforeEach(() => {
			usersStore.addUsers([{ id: '1', isPending: false, role: ROLE.Owner }]);
			usersStore.currentUserId = '1';

			settingsStore.setSettings(settingsFor('cloud'));
		});

		test('aborts the redirect and skips telemetry when the guard resolves false', async () => {
			const telemetry = useTelemetry();
			const initialHref = location.href;
			const helper = useBasePageRedirectionHelper({
				guard: vi.fn<UpgradeRedirectGuard>().mockResolvedValue(false),
			});

			await helper.goToUpgrade('advanced-permissions', 'upgrade-api', 'redirect');

			expect(location.href).toBe(initialHref);
			expect(telemetry.track).not.toHaveBeenCalled();
		});

		test('proceeds with the redirect when the guard resolves true', async () => {
			const telemetry = useTelemetry();
			const helper = useBasePageRedirectionHelper({
				guard: vi.fn<UpgradeRedirectGuard>().mockResolvedValue(true),
			});

			await helper.goToUpgrade('advanced-permissions', 'upgrade-api', 'redirect');

			expect(telemetry.track).toHaveBeenCalledWith(
				'User clicked upgrade CTA',
				expect.objectContaining({ source: 'advanced-permissions' }),
			);
			expect(location.href).toBe(
				`https://app.n8n.cloud/login?code=123&returnPath=${encodeURIComponent(
					'/account/change-plan',
				)}&utm_campaign=upgrade-api&source=advanced-permissions`,
			);
		});
	});

	// A module package cannot pass the shell's guard, so it omits the argument and
	// gets whatever the shell registered. Nothing registered means fail-open.
	describe('goToUpgrade with no guard argument', () => {
		beforeEach(() => {
			usersStore.addUsers([{ id: '1', isPending: false, role: ROLE.Owner }]);
			usersStore.currentUserId = '1';

			settingsStore.setSettings(settingsFor('cloud'));
			clearDefaultUpgradeRedirectGuard();
		});

		afterEach(() => {
			clearDefaultUpgradeRedirectGuard();
		});

		test('consults the registered default guard and aborts when it resolves false', async () => {
			const telemetry = useTelemetry();
			const initialHref = location.href;
			const guard = vi.fn<UpgradeRedirectGuard>().mockResolvedValue(false);
			setDefaultUpgradeRedirectGuard(guard);

			await useBasePageRedirectionHelper().goToUpgrade(
				'advanced-permissions',
				'upgrade-api',
				'redirect',
			);

			expect(guard).toHaveBeenCalledTimes(1);
			expect(location.href).toBe(initialHref);
			expect(telemetry.track).not.toHaveBeenCalled();
		});

		test('consults the registered default guard and proceeds when it resolves true', async () => {
			const guard = vi.fn<UpgradeRedirectGuard>().mockResolvedValue(true);
			setDefaultUpgradeRedirectGuard(guard);

			await useBasePageRedirectionHelper().goToUpgrade(
				'advanced-permissions',
				'upgrade-api',
				'redirect',
			);

			expect(guard).toHaveBeenCalledTimes(1);
			expect(location.href).toContain('utm_campaign=upgrade-api');
		});

		test('proceeds when no guard is registered at all', async () => {
			await useBasePageRedirectionHelper().goToUpgrade(
				'advanced-permissions',
				'upgrade-api',
				'redirect',
			);

			expect(location.href).toContain('utm_campaign=upgrade-api');
		});

		test('prefers an explicitly passed guard over the registered default', async () => {
			const registered = vi.fn<UpgradeRedirectGuard>().mockResolvedValue(true);
			const passed = vi.fn<UpgradeRedirectGuard>().mockResolvedValue(false);
			setDefaultUpgradeRedirectGuard(registered);

			await useBasePageRedirectionHelper({ guard: passed }).goToUpgrade(
				'advanced-permissions',
				'upgrade-api',
				'redirect',
			);

			expect(passed).toHaveBeenCalledTimes(1);
			expect(registered).not.toHaveBeenCalled();
		});
	});

	describe('goToCloudDashboard', () => {
		const reservedTab = { close: vi.fn(), location: { href: '' }, opener: {} as Window | null };
		const CONNECT_PATH = '/manage/connect';
		const connectLoginUrl = `https://app.n8n.cloud/login?code=123&returnPath=${encodeURIComponent(CONNECT_PATH)}`;

		beforeEach(() => {
			reservedTab.location.href = '';
			reservedTab.opener = {} as Window;
			reservedTab.close.mockClear();
		});

		function asCloudOwner() {
			usersStore.addUsers([{ id: '1', isPending: false, role: ROLE.Owner }]);
			usersStore.currentUserId = '1';
			settingsStore.setSettings(settingsFor('cloud'));
		}

		test('returns false for members without navigating', async () => {
			usersStore.addUsers([{ id: '1', isPending: false, role: ROLE.Member }]);
			usersStore.currentUserId = '1';
			settingsStore.setSettings(settingsFor('cloud'));
			const initialHref = location.href;

			const didNavigate = await pageRedirectionHelper.goToCloudDashboard({
				redirectionPath: CONNECT_PATH,
			});

			expect(didNavigate).toBe(false);
			expect(location.href).toBe(initialHref);
		});

		test('redirects in the same tab by default', async () => {
			asCloudOwner();

			const didNavigate = await pageRedirectionHelper.goToCloudDashboard({
				redirectionPath: CONNECT_PATH,
			});

			expect(didNavigate).toBe(true);
			expect(location.href).toBe(connectLoginUrl);
		});

		test('reserves a new tab, severs opener, then navigates', async () => {
			asCloudOwner();
			const windowOpenSpy = vi
				.spyOn(window, 'open')
				.mockReturnValue(reservedTab as unknown as Window);
			const initialHref = location.href;

			const didNavigate = await pageRedirectionHelper.goToCloudDashboard({
				redirectionPath: CONNECT_PATH,
				mode: 'open',
			});

			expect(didNavigate).toBe(true);
			expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
			expect(reservedTab.opener).toBeNull();
			expect(reservedTab.location.href).toBe(connectLoginUrl);
			expect(location.href).toBe(initialHref);
		});

		test('falls back to the current tab when the popup is blocked', async () => {
			asCloudOwner();
			vi.spyOn(window, 'open').mockReturnValue(null);

			const didNavigate = await pageRedirectionHelper.goToCloudDashboard({
				redirectionPath: CONNECT_PATH,
				mode: 'open',
			});

			expect(didNavigate).toBe(true);
			expect(location.href).toBe(connectLoginUrl);
		});

		test('closes the reserved tab and rethrows when auto-login fails', async () => {
			asCloudOwner();
			vi.spyOn(window, 'open').mockReturnValue(reservedTab as unknown as Window);
			const autoLoginSpy = vi
				.spyOn(useCloudPlanStore(), 'generateCloudDashboardAutoLoginLink')
				.mockRejectedValue(new Error('no auto-login code'));
			const initialHref = location.href;

			try {
				await expect(
					pageRedirectionHelper.goToCloudDashboard({
						redirectionPath: CONNECT_PATH,
						mode: 'open',
					}),
				).rejects.toThrow('no auto-login code');

				expect(reservedTab.close).toHaveBeenCalled();
				expect(location.href).toBe(initialHref);
			} finally {
				autoLoginSpy.mockRestore();
			}
		});
	});
});
