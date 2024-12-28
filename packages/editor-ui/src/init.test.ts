import { useUsersStore } from '@/stores/users.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@/stores/root.store';
import { initializeAuthenticatedFeatures, initializeCore } from '@/init';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings.store';
import { useVersionsStore } from '@/stores/versions.store';
import { AxiosError } from 'axios';

const showMessage = vi.fn();

vi.mock('@/composables/useToast', () => ({
	useToast: () => ({ showMessage }),
}));

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn().mockReturnValue({ initialize: vi.fn() }),
}));

vi.mock('@/stores/root.store', () => ({
	useRootStore: vi.fn(),
}));

describe('Init', () => {
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;
	let usersStore: ReturnType<typeof useUsersStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let versionsStore: ReturnType<typeof useVersionsStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		settingsStore = useSettingsStore();
		cloudPlanStore = useCloudPlanStore();
		sourceControlStore = useSourceControlStore();
		nodeTypesStore = useNodeTypesStore();
		usersStore = useUsersStore();
		versionsStore = useVersionsStore();
		versionsStore = useVersionsStore();
	});

	describe('initializeCore()', () => {
		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should initialize core features only once', async () => {
			const usersStoreSpy = vi.spyOn(usersStore, 'initialize');
			const settingsStoreSpy = vi.spyOn(settingsStore, 'initialize');
			const versionsSpy = vi.spyOn(versionsStore, 'checkForNewVersions');

			await initializeCore();

			expect(settingsStoreSpy).toHaveBeenCalled();
			expect(usersStoreSpy).toHaveBeenCalled();
			expect(versionsSpy).toHaveBeenCalled();

			await initializeCore();

			expect(settingsStoreSpy).toHaveBeenCalledTimes(1);
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
			const templatesTestSpy = vi.spyOn(settingsStore, 'testTemplatesEndpoint');
			const sourceControlSpy = vi.spyOn(sourceControlStore, 'getPreferences');
			const nodeTranslationSpy = vi.spyOn(nodeTypesStore, 'getNodeTranslationHeaders');
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as ReturnType<
				typeof useUsersStore
			>);

			await initializeAuthenticatedFeatures();
			expect(cloudStoreSpy).not.toHaveBeenCalled();
			expect(templatesTestSpy).not.toHaveBeenCalled();
			expect(sourceControlSpy).not.toHaveBeenCalled();
			expect(nodeTranslationSpy).not.toHaveBeenCalled();
		});

		it('should init authenticated features only once if user is logged in', async () => {
			const cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize');
			const templatesTestSpy = vi.spyOn(settingsStore, 'testTemplatesEndpoint');
			const sourceControlSpy = vi.spyOn(sourceControlStore, 'getPreferences');
			const nodeTranslationSpy = vi.spyOn(nodeTypesStore, 'getNodeTranslationHeaders');
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: { id: '123' } } as ReturnType<
				typeof useUsersStore
			>);

			await initializeAuthenticatedFeatures();

			expect(cloudStoreSpy).toHaveBeenCalled();
			expect(templatesTestSpy).toHaveBeenCalled();
			expect(sourceControlSpy).toHaveBeenCalled();
			expect(nodeTranslationSpy).toHaveBeenCalled();

			await initializeAuthenticatedFeatures();

			expect(cloudStoreSpy).toHaveBeenCalledTimes(1);
		});

		it('should handle source control initialization error', async () => {
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
	});
});
