import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import CommunityPackageManageConfirmModal from './CommunityPackageManageConfirmModal.vue';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import type { PublicInstalledPackage } from 'n8n-workflow';
import { cleanupAppModals, createAppModals } from '@/__tests__/utils';
import { useSettingsStore } from '@/stores/settings.store';
import { defaultSettings } from '@/__tests__/defaults';
import { defaultNodeDescriptions, mockNodeTypeDescription } from '@/__tests__/mocks';

const renderComponent = createComponentRenderer(CommunityPackageManageConfirmModal);

const flushPromises = async () => await new Promise(setImmediate);

describe('CommunityPackageManageConfirmModal', () => {
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let communityNodeStore: ReturnType<typeof useCommunityNodesStore>;

	beforeEach(() => {
		createAppModals();

		const pinia = createPinia();
		setActivePinia(pinia);

		nodeTypesStore = useNodeTypesStore();

		nodeTypesStore.setNodeTypes([
			...defaultNodeDescriptions,
			mockNodeTypeDescription({
				name: 'n8n-nodes-test.test',
			}),
		]);

		communityNodeStore = useCommunityNodesStore();
		communityNodeStore.setInstalledPackages([
			{
				packageName: 'n8n-nodes-test',
				installedVersion: '1.0.0',
				updateAvailable: '2.0.0',
			} as PublicInstalledPackage,
		]);

		useSettingsStore().setSettings(defaultSettings);
	});

	afterEach(() => {
		cleanupAppModals();
		vi.clearAllMocks();
	});

	it('should call nodeTypesStore methods and update latestVerifiedVersion on mount', async () => {
		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.getCommunityNodeAttributes = vi.fn().mockResolvedValue({ npmVersion: '2.0.0' });

		renderComponent({
			props: {
				modalName: 'test-modal',
				activePackageName: 'n8n-nodes-test',
				mode: 'update',
			},
		});

		await flushPromises();

		expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalled();
		expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenCalledWith('n8n-nodes-test.test');
	});
});
