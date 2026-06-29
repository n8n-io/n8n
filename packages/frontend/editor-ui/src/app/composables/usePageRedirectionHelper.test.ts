import { ROLE } from '@n8n/api-types';
import { useSettingsStore } from '@/app/stores/settings.store';
import merge from 'lodash/merge';
import { usePageRedirectionHelper } from './usePageRedirectionHelper';
import { defaultSettings } from '@/__tests__/defaults';
import { useUsersStore } from '@/features/settings/users/users.store';
import { createPinia, setActivePinia } from 'pinia';
import * as cloudPlanApi from '@n8n/rest-api-client/api/cloudPlans';
import { useVersionsStore } from '@/app/stores/versions.store';
import { useTelemetry } from './useTelemetry';

// Instantiates a store that derives the workflow id from the route. These tests run
// without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

let settingsStore: ReturnType<typeof useSettingsStore>;
let usersStore: ReturnType<typeof useUsersStore>;
let versionStore: ReturnType<typeof useVersionsStore>;
let pageRedirectionHelper: ReturnType<typeof usePageRedirectionHelper>;

vi.mock('@/app/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => {
			return {
				track,
			};
		},
	};
});

describe('usePageRedirectionHelper', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	beforeEach(() => {
		setActivePinia(createPinia());
		settingsStore = useSettingsStore();
		usersStore = useUsersStore();
		versionStore = useVersionsStore();

		pageRedirectionHelper = usePageRedirectionHelper();

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
			'production',
			ROLE.Owner,
			'https://n8n.io/pricing?utm_campaign=upgrade-api&source=advanced-permissions',
		],
		[
			'default',
			'development',
			ROLE.Owner,
			'https://n8n.io/pricing?utm_campaign=upgrade-api&source=advanced-permissions',
		],
		[
			'cloud',
			'production',
			ROLE.Owner,
			`https://app.n8n.cloud/login?code=123&returnPath=${encodeURIComponent(
				'/account/change-plan',
			)}&utm_campaign=upgrade-api&source=advanced-permissions`,
		],
		[
			'cloud',
			'production',
			ROLE.Member,
			'https://n8n.io/pricing?utm_campaign=upgrade-api&source=advanced-permissions',
		],
	])(
		'"goToUpgrade" should generate the correct URL for "%s" deployment and "%s" license environment and user role "%s"',
		async (type, environment, role, expectation) => {
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

			settingsStore.setSettings(
				merge({}, defaultSettings, {
					deployment: {
						type,
					},
					license: {
						environment,
					},
				}),
			);

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

			settingsStore.setSettings(
				merge({}, defaultSettings, {
					deployment: { type: 'cloud' },
					license: { environment: 'production' },
				}),
			);

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

			settingsStore.setSettings(
				merge({}, defaultSettings, {
					deployment: { type },
					license: { environment: 'production' },
				}),
			);

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
			'production',
			ROLE.Owner,
			`https://app.n8n.cloud/login?code=123&returnPath=${encodeURIComponent('/dashboard')}`,
		],
		['cloud', 'production', ROLE.Member, 'https://test.app.n8n.cloud'],
	])(
		'"goToDashboard" should generate the correct URL for "%s" deployment and "%s" license environment and user role "%s"',
		async (type, environment, role, expectation) => {
			// Arrange

			usersStore.addUsers([
				{
					id: '1',
					isPending: false,
					role,
				},
			]);

			usersStore.currentUserId = '1';

			settingsStore.setSettings(
				merge({}, defaultSettings, {
					deployment: {
						type,
					},
					license: {
						environment,
					},
				}),
			);

			// Act

			await pageRedirectionHelper.goToDashboard();

			// Assert

			expect(location.href).toBe(expectation);
		},
	);
});
