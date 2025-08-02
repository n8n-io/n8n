import { useUsersStore } from '@/stores/users.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { state, initializeAuthenticatedFeatures, initializeCore } from '@/init';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings.store';
import { useVersionsStore } from '@/stores/versions.store';
import { AxiosError } from 'axios';
import merge from 'lodash/merge';
import { mockedStore, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { useSSOStore } from '@/stores/sso.store';
import { UserManagementAuthenticationMethod } from '@/Interface';
import type { IUser } from '@/Interface';
import { EnterpriseEditionFeature } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import type { Cloud } from '@n8n/rest-api-client';

const showMessage = vi.fn();
const showToast = vi.fn();

vi.mock('@/composables/useToast', () => ({
	useToast: () => ({ showMessage, showToast }),
}));

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn().mockReturnValue({
		initialize: vi.fn(),
		registerLoginHook: vi.fn(),
		registerLogoutHook: vi.fn(),
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(),
}));

describe('Init', () => {
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let cloudPlanStore: ReturnType<typeof mockedStore<typeof useCloudPlanStore>>;
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;
	let usersStore: ReturnType<typeof useUsersStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let versionsStore: ReturnType<typeof useVersionsStore>;
	let ssoStore: ReturnType<typeof useSSOStore>;
	let uiStore: ReturnType<typeof useUIStore>;

	beforeEach(() => {
		setActivePinia(
			createTestingPinia({
				initialState: {
					[STORES.SETTINGS]: merge({}, SETTINGS_STORE_DEFAULT_STATE),
				},
			}),
		);

		settingsStore = useSettingsStore();
		cloudPlanStore = mockedStore(useCloudPlanStore);
		sourceControlStore = useSourceControlStore();
		nodeTypesStore = useNodeTypesStore();
		usersStore = useUsersStore();
		versionsStore = useVersionsStore();
		versionsStore = useVersionsStore();
		ssoStore = useSSOStore();
		uiStore = useUIStore();
	});

	describe('initializeCore()', () => {
		beforeEach(() => {
			state.initialized = false;
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should initialize core features only once', async () => {
			const usersStoreSpy = vi.spyOn(usersStore, 'initialize');
			const settingsStoreSpy = vi.spyOn(settingsStore, 'initialize');

			await initializeCore();

			expect(settingsStoreSpy).toHaveBeenCalled();
			expect(usersStoreSpy).toHaveBeenCalled();

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

		it('should initialize uiStore with banners based on settings', async () => {
			settingsStore.isEnterpriseFeatureEnabled.showNonProdBanner = true;
			settingsStore.settings.banners = { dismissed: [] };
			settingsStore.settings.versionCli = '1.2.3';

			await initializeCore();

			expect(uiStore.initialize).toHaveBeenCalledWith({
				banners: ['NON_PRODUCTION_LICENSE', 'V1'],
			});
		});
	});

	describe('initializeAuthenticatedFeatures()', () => {
		beforeEach(() => {
			vi.spyOn(settingsStore, 'isCloudDeployment', 'get').mockReturnValue(true);
			vi.spyOn(settingsStore, 'isTemplatesEnabled', 'get').mockReturnValue(true);
			vi.spyOn(sourceControlStore, 'isEnterpriseSourceControlEnabled', 'get').mockReturnValue(true);
			vi.mocked(useRootStore).mockReturnValue({ defaultLocale: 'es' } as ReturnType<
				typeof useRootStore
			>);
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should not init authenticated features if user is not logged in', async () => {
			const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize');
			const sourceControlSpy = vi.spyOn(sourceControlStore, 'getPreferences');
			const nodeTranslationSpy = vi.spyOn(nodeTypesStore, 'getNodeTranslationHeaders');
			const versionsSpy = vi.spyOn(versionsStore, 'checkForNewVersions');
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as ReturnType<
				typeof useUsersStore
			>);

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
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: { id: '123' } } as ReturnType<
				typeof useUsersStore
			>);

			await initializeAuthenticatedFeatures(false);

			expect(cloudStoreSpy).toHaveBeenCalled();
			expect(sourceControlSpy).toHaveBeenCalled();
			expect(nodeTranslationSpy).toHaveBeenCalled();
			expect(versionsSpy).toHaveBeenCalled();

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
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: { id: '123' } } as ReturnType<
				typeof useUsersStore
			>);

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
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: { id: '123' } } as ReturnType<
				typeof useUsersStore
			>);

			await initializeAuthenticatedFeatures(false);

			expect(cloudStoreSpy).toHaveBeenCalled();
			expect(sourceControlSpy).toHaveBeenCalled();
			expect(nodeTranslationSpy).toHaveBeenCalled();
			expect(versionsSpy).toHaveBeenCalled();
		}, 5000);

		it('should handle source control initialization error', async () => {
			vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValue();
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: { id: '123' } } as ReturnType<
				typeof useUsersStore
			>);
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
				expect(uiStore.pushBannerToStack).toHaveBeenCalledWith('TRIAL_OVER');
			});

			it('should push TRIAL banner if trial is active', async () => {
				settingsStore.settings.deployment.type = 'cloud';
				usersStore.usersById = { '123': { id: '123', email: '' } as IUser };
				usersStore.currentUserId = '123';

				cloudPlanStore.userIsTrialing = true;
				cloudPlanStore.trialExpired = false;

				const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize').mockResolvedValueOnce();

				await initializeAuthenticatedFeatures(false);

				expect(cloudStoreSpy).toHaveBeenCalled();
				expect(uiStore.pushBannerToStack).toHaveBeenCalledWith('TRIAL');
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
				expect(uiStore.pushBannerToStack).toHaveBeenCalledWith('EMAIL_CONFIRMATION');
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
				expect(uiStore.pushBannerToStack).not.toHaveBeenCalledWith('EMAIL_CONFIRMATION');
			});
		});
	});
});
