import type { FrontendSettings } from '@n8n/api-types';
import { ROLE } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import * as cloudPlanApi from '@n8n/rest-api-client/api/cloudPlans';
import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';

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
});
