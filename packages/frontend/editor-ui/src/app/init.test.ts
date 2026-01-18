import { mockedStore, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { EnterpriseEditionFeature } from '@/app/constants';
import { initializeAuthenticatedFeatures, initializeCore, state } from '@/app/init';
import { UserManagementAuthenticationMethod } from '@/Interface';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useVersionsStore } from '@/app/stores/versions.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import type { Cloud, CurrentUserResponse } from '@n8n/rest-api-client';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createTestingPinia } from '@pinia/testing';
import { AxiosError } from 'axios';
import merge from 'lodash/merge';
import { setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import { telemetry } from '@/app/plugins/telemetry';
import { usePostHog } from './stores/posthog.store';

const showMessage = vi.fn();
const showToast = vi.fn();

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showMessage, showToast }),
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: vi.fn().mockReturnValue({
		initialize: vi.fn(),
		registerLoginHook: vi.fn(),
		registerLogoutHook: vi.fn(),
		setUserQuota: vi.fn(),
	}),
}));

describe('Init', () => {
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let cloudPlanStore: ReturnType<typeof mockedStore<typeof useCloudPlanStore>>;
	let sourceControlStore: ReturnType<typeof mockedStore<typeof useSourceControlStore>>;
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let versionsStore: ReturnType<typeof mockedStore<typeof useVersionsStore>>;
	let ssoStore: ReturnType<typeof mockedStore<typeof useSSOStore>>;
	let rootStore: ReturnType<typeof mockedStore<typeof useRootStore>>;
	let bannersStore: ReturnType<typeof mockedStore<typeof useBannersStore>>;
	let posthogStore: ReturnType<typeof mockedStore<typeof usePostHog>>;

	beforeEach(() => {
		setActivePinia(
			createTestingPinia({
				initialState: {
					[STORES.SETTINGS]: merge({}, SETTINGS_STORE_DEFAULT_STATE),
				},
			}),
		);

		settingsStore = mockedStore(useSettingsStore);
		cloudPlanStore = mockedStore(useCloudPlanStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);
		usersStore = mockedStore(useUsersStore);
		versionsStore = mockedStore(useVersionsStore);
		versionsStore = mockedStore(useVersionsStore);
		ssoStore = mockedStore(useSSOStore);
		rootStore = mockedStore(useRootStore);
		bannersStore = mockedStore(useBannersStore);
		posthogStore = mockedStore(usePostHog);
	});

	describe('initializeCore()', () => {
		beforeEach(() => {
			state.initialized = false;
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should initialize core features only once', async () => {
			const settingsStoreSpy = vi.spyOn(settingsStore, 'initialize');

			await initializeCore();

			expect(settingsStoreSpy).toHaveBeenCalled();
			await initializeCore();

			expect(settingsStoreSpy).toHaveBeenCalledTimes(1);
		});

		it('should throw an error if settings initialization fails', async () => {
			const error = new Error('Settings initialization failed');

			vi.spyOn(settingsStore, 'initialize').mockImplementation(() => {
				throw error;
			});

			await initializeCore();

			expect(showToast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Error connecting to n8n',
					type: 'error',
				}),
			);
		});

		it('should initialize authentication hooks', async () => {
			const registerLoginHookSpy = vi.spyOn(usersStore, 'registerLoginHook');
			const registerLogoutHookSpy = vi.spyOn(usersStore, 'registerLogoutHook');

			await initializeCore();

			expect(registerLoginHookSpy).toHaveBeenCalled();
			expect(registerLogoutHookSpy).toHaveBeenCalled();
		});

		it('should correctly identify the user for telemetry', async () => {
			const telemetryIdentifySpy = vi.spyOn(telemetry, 'identify');
			usersStore.registerLoginHook.mockImplementation(async (hook) => {
				await hook(mock<CurrentUserResponse>({ id: 'userId' }));
			});
			rootStore.instanceId = 'testInstanceId';
			rootStore.versionCli = '1.102.0';

			await initializeCore();

			expect(telemetryIdentifySpy).toHaveBeenCalledWith('testInstanceId', 'userId', '1.102.0');
		});

		it('should initialize ssoStore with settings SSO configuration', async () => {
			const saml = { loginEnabled: true, loginLabel: '' };
			const ldap = { loginEnabled: false, loginLabel: '' };
			const oidc = { loginEnabled: false, loginUrl: '', callbackUrl: '' };

			settingsStore.userManagement.authenticationMethod = UserManagementAuthenticationMethod.Saml;
			settingsStore.settings.sso = { saml, ldap, oidc };
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Saml] = true;

			await initializeCore();

			expect(ssoStore.initialize).toHaveBeenCalledWith({
				authenticationMethod: UserManagementAuthenticationMethod.Saml,
				config: { saml, ldap, oidc },
				features: {
					saml: true,
					ldap: false,
					oidc: false,
				},
			});
		});
	});

	describe('initializeAuthenticatedFeatures()', () => {
		beforeEach(() => {
			settingsStore.isCloudDeployment = true;
			settingsStore.isTemplatesEnabled = true;
			sourceControlStore.isEnterpriseSourceControlEnabled = true;
			rootStore.defaultLocale = 'es';
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should not init authenticated features if user is not logged in', async () => {
			const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize');
			const sourceControlSpy = vi.spyOn(sourceControlStore, 'getPreferences');
			const nodeTranslationSpy = vi.spyOn(nodeTypesStore, 'getNodeTranslationHeaders');
			const versionsSpy = vi.spyOn(versionsStore, 'checkForNewVersions');
			usersStore.currentUser = null;

			await initializeAuthenticatedFeatures(false);
			expect(cloudStoreSpy).not.toHaveBeenCalled();
			expect(sourceControlSpy).not.toHaveBeenCalled();
			expect(nodeTranslationSpy).not.toHaveBeenCalled();
			expect(versionsSpy).not.toHaveBeenCalled();
		});

		it('should init authenticated features only once if user is logged in', async () => {
			const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValue();
			const sourceControlSpy = vi.spyOn(sourceControlStore, 'getPreferences');
			const nodeTranslationSpy = vi.spyOn(nodeTypesStore, 'getNodeTranslationHeaders');
			const versionsSpy = vi.spyOn(versionsStore, 'checkForNewVersions');
			usersStore.currentUser = mock<IUser>({ id: '123', globalScopes: ['*'] });

			await initializeAuthenticatedFeatures(false);

			expect(cloudStoreSpy).toHaveBeenCalled();
			expect(sourceControlSpy).toHaveBeenCalled();
			expect(nodeTranslationSpy).toHaveBeenCalled();
			expect(versionsSpy).toHaveBeenCalled();
			expect(usersStore.setUserQuota).toHaveBeenCalled();

			await initializeAuthenticatedFeatures();

			expect(cloudStoreSpy).toHaveBeenCalledTimes(1);
		});

		it('should handle cloud plan initialization error', async () => {
			const cloudStoreSpy = vi
				.spyOn(cloudPlanStore, 'initialize')
				.mockRejectedValue(new AxiosError('Something went wrong', '404'));
			const sourceControlSpy = vi.spyOn(sourceControlStore, 'getPreferences');
			const nodeTranslationSpy = vi.spyOn(nodeTypesStore, 'getNodeTranslationHeaders');
			const versionsSpy = vi.spyOn(versionsStore, 'checkForNewVersions');
			usersStore.currentUser = mock<IUser>({ id: '123', globalScopes: ['*'] });

			await initializeAuthenticatedFeatures(false);

			expect(cloudStoreSpy).toHaveBeenCalled();
			expect(sourceControlSpy).toHaveBeenCalled();
			expect(nodeTranslationSpy).toHaveBeenCalled();
			expect(versionsSpy).toHaveBeenCalled();
		});

		it('should initialize even if cloud requests get stuck', async () => {
			const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize').mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10000));
			});
			const sourceControlSpy = vi.spyOn(sourceControlStore, 'getPreferences');
			const nodeTranslationSpy = vi.spyOn(nodeTypesStore, 'getNodeTranslationHeaders');
			const versionsSpy = vi.spyOn(versionsStore, 'checkForNewVersions');
			usersStore.currentUser = mock<IUser>({ id: '123', globalScopes: ['*'] });

			await initializeAuthenticatedFeatures(false);

			expect(cloudStoreSpy).toHaveBeenCalled();
			expect(sourceControlSpy).toHaveBeenCalled();
			expect(nodeTranslationSpy).toHaveBeenCalled();
			expect(versionsSpy).toHaveBeenCalled();
		}, 5000);

		it('should handle source control initialization error', async () => {
			vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValue();
			usersStore.currentUser = mock<IUser>({ id: '123', globalScopes: ['*'] });
			vi.spyOn(sourceControlStore, 'getPreferences').mockRejectedValueOnce(
				new AxiosError('Something went wrong', '404'),
			);
			const consoleSpy = vi.spyOn(window.console, 'error');
			await initializeAuthenticatedFeatures(false);
			expect(showMessage).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to initialize source control store',
				expect.anything(),
			);
		});

		it('should push banners based on settings', async () => {
			settingsStore.isEnterpriseFeatureEnabled.showNonProdBanner = true;
			settingsStore.settings.banners = { dismissed: [] };
			settingsStore.settings.versionCli = '1.2.3';
			settingsStore.isCloudDeployment = false;
			usersStore.currentUser = mock<IUser>({ id: '123', globalScopes: ['*'] });

			const pushBannerSpy = vi.spyOn(bannersStore, 'pushBannerToStack');

			await initializeAuthenticatedFeatures(false);

			expect(pushBannerSpy).toHaveBeenCalledWith('NON_PRODUCTION_LICENSE');
			expect(pushBannerSpy).toHaveBeenCalledWith('V1');
		});

		describe('cloudPlanStore', () => {
			it('should initialize cloudPlanStore correctly', async () => {
				settingsStore.settings.deployment.type = 'cloud';
				usersStore.usersById = { '123': { id: '123', email: '' } as IUser };
				usersStore.currentUserId = '123';

				const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValueOnce();

				await initializeAuthenticatedFeatures(false);

				expect(cloudStoreSpy).toHaveBeenCalled();
			});

			it('should push TRIAL_OVER banner if trial is expired', async () => {
				settingsStore.settings.deployment.type = 'cloud';
				usersStore.usersById = { '123': { id: '123', email: '' } as IUser };
				usersStore.currentUserId = '123';

				cloudPlanStore.userIsTrialing = true;
				cloudPlanStore.trialExpired = true;

				const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValueOnce();

				await initializeAuthenticatedFeatures(false);

				expect(cloudStoreSpy).toHaveBeenCalled();
				expect(bannersStore.pushBannerToStack).toHaveBeenCalledWith('TRIAL_OVER');
			});

			it('should push TRIAL banner if trial is active and does not have feature flag set', async () => {
				settingsStore.settings.deployment.type = 'cloud';
				usersStore.usersById = { '123': { id: '123', email: '' } as IUser };
				usersStore.currentUserId = '123';

				cloudPlanStore.userIsTrialing = true;
				cloudPlanStore.trialExpired = false;

				const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValueOnce();

				await initializeAuthenticatedFeatures(false);

				expect(cloudStoreSpy).toHaveBeenCalled();
				expect(bannersStore.pushBannerToStack).toHaveBeenCalledWith('TRIAL');
			});

			it('should push TRIAL banner if trial is active and has feature flag control', async () => {
				settingsStore.settings.deployment.type = 'cloud';
				usersStore.usersById = { '123': { id: '123', email: '' } as IUser };
				usersStore.currentUserId = '123';

				cloudPlanStore.userIsTrialing = true;
				cloudPlanStore.trialExpired = false;

				const posthogStoreSpy = vi.spyOn(posthogStore, 'getVariant').mockReturnValueOnce('control');
				const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValueOnce();

				await initializeAuthenticatedFeatures(false);

				expect(posthogStoreSpy).toHaveBeenCalled();
				expect(cloudStoreSpy).toHaveBeenCalled();
				expect(bannersStore.pushBannerToStack).toHaveBeenCalledWith('TRIAL');
			});

			it('should not push TRIAL banner if trial is active and has feature flag variant', async () => {
				settingsStore.settings.deployment.type = 'cloud';
				usersStore.usersById = { '123': { id: '123', email: '' } as IUser };
				usersStore.currentUserId = '123';

				cloudPlanStore.userIsTrialing = true;
				cloudPlanStore.trialExpired = false;

				const posthogStoreSpy = vi.spyOn(posthogStore, 'getVariant').mockReturnValueOnce('variant');
				const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValueOnce();

				await initializeAuthenticatedFeatures(false);

				expect(posthogStoreSpy).toHaveBeenCalled();
				expect(cloudStoreSpy).toHaveBeenCalled();
				expect(bannersStore.pushBannerToStack).not.toHaveBeenCalledWith('TRIAL');
			});

			it('should push EMAIL_CONFIRMATION banner if user cloud info is not confirmed', async () => {
				settingsStore.settings.deployment.type = 'cloud';
				usersStore.usersById = { '123': { id: '123', email: '' } as IUser };
				usersStore.currentUserId = '123';

				cloudPlanStore.userIsTrialing = false;
				cloudPlanStore.currentUserCloudInfo = { confirmed: false } as Cloud.UserAccount;

				const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValueOnce();

				await initializeAuthenticatedFeatures(false);

				expect(cloudStoreSpy).toHaveBeenCalled();
				expect(bannersStore.pushBannerToStack).toHaveBeenCalledWith('EMAIL_CONFIRMATION');
			});

			it('should not push EMAIL_CONFIRMATION banner if user cloud account does not exist', async () => {
				settingsStore.settings.deployment.type = 'cloud';
				usersStore.usersById = { '123': { id: '123', email: '' } as IUser };
				usersStore.currentUserId = '123';

				cloudPlanStore.userIsTrialing = false;
				cloudPlanStore.currentUserCloudInfo = null;

				const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValueOnce();

				await initializeAuthenticatedFeatures(false);

				expect(cloudStoreSpy).toHaveBeenCalled();
				expect(bannersStore.pushBannerToStack).not.toHaveBeenCalledWith('EMAIL_CONFIRMATION');
			});
		});
	});
});
