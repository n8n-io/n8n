import { useUsersStore } from '@/stores/users.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { initializeAuthenticatedFeatures } from '@/init';
import type { SpyInstance } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings.store';

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

vi.mock('@/stores/n8nRoot.store', () => ({
	useRootStore: vi.fn(),
}));

describe('Init', () => {
	describe('Authenticated Features', () => {
		let settingsStore: ReturnType<typeof useSettingsStore>;
		let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;
		let sourceControlStore: ReturnType<typeof useSourceControlStore>;
		let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
		let cloudStoreSpy: SpyInstance<[], Promise<void>>;
		let templatesTestSpy: SpyInstance<[], Promise<void>>;
		let sourceControlSpy: SpyInstance<[], Promise<void>>;
		let nodeTranslationSpy: SpyInstance<[], Promise<void>>;

		beforeAll(() => {
			setActivePinia(createTestingPinia());
			settingsStore = useSettingsStore();
			cloudPlanStore = useCloudPlanStore();
			sourceControlStore = useSourceControlStore();
			nodeTypesStore = useNodeTypesStore();
			vi.spyOn(settingsStore, 'isCloudDeployment', 'get').mockReturnValue(true);
			vi.spyOn(settingsStore, 'isTemplatesEnabled', 'get').mockReturnValue(true);
			vi.spyOn(sourceControlStore, 'isEnterpriseSourceControlEnabled', 'get').mockReturnValue(true);
			vi.mocked(useRootStore).mockReturnValue({ defaultLocale: 'es' } as ReturnType<
				typeof useRootStore
			>);
			vi.mock('@/hooks/register', () => ({
				initializeCloudHooks: vi.fn(),
			}));
			cloudStoreSpy = vi.spyOn(cloudPlanStore, 'initialize');
			templatesTestSpy = vi.spyOn(settingsStore, 'testTemplatesEndpoint');
			sourceControlSpy = vi.spyOn(sourceControlStore, 'getPreferences');
			nodeTranslationSpy = vi.spyOn(nodeTypesStore, 'getNodeTranslationHeaders');
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should not init authenticated features if user is not logged in', async () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as ReturnType<
				typeof useUsersStore
			>);
			await initializeAuthenticatedFeatures();
			expect(cloudStoreSpy).not.toHaveBeenCalled();
			expect(templatesTestSpy).not.toHaveBeenCalled();
			expect(sourceControlSpy).not.toHaveBeenCalled();
			expect(nodeTranslationSpy).not.toHaveBeenCalled();
		});
		it('should init authenticated features if user is not logged in', async () => {
			vi.mocked(useUsersStore).mockReturnValue({ currentUser: { id: '123' } } as ReturnType<
				typeof useUsersStore
			>);
			await initializeAuthenticatedFeatures();
			expect(cloudStoreSpy).toHaveBeenCalled();
			expect(templatesTestSpy).toHaveBeenCalled();
			expect(sourceControlSpy).toHaveBeenCalled();
			expect(nodeTranslationSpy).toHaveBeenCalled();
		});
	});
});
