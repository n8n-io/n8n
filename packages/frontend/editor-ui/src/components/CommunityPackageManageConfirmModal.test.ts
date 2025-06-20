import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { createComponentRenderer } from '@/__tests__/render';
import CommunityPackageManageConfirmModal from './CommunityPackageManageConfirmModal.vue';
import { cleanupAppModals, createAppModals, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { useSettingsStore } from '@/stores/settings.store';
import { defaultSettings } from '@/__tests__/defaults';
import { mockNodeTypeDescription } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY } from '@/constants';

const renderComponent = createComponentRenderer(CommunityPackageManageConfirmModal, {
	data() {
		return {
			packageName: 'n8n-nodes-hello',
		};
	},
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalsById: {
					[COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY]: { open: true },
				},
			},
			[STORES.COMMUNITY_NODES]: {
				installedPackages: {
					'n8n-nodes-test': {
						packageName: 'n8n-nodes-test',
						installedVersion: '1.0.0',
						updateAvailable: '2.0.0',
					},
				},
			},
			[STORES.NODE_TYPES]: {
				nodeTypes: {
					['n8n-nodes-test.test']: {
						1: mockNodeTypeDescription({
							name: 'n8n-nodes-test.test',
						}),
					},
				},
			},
			[STORES.SETTINGS]: {
				...SETTINGS_STORE_DEFAULT_STATE,
				settings: {
					...SETTINGS_STORE_DEFAULT_STATE.settings,
					communityNodesEnabled: true,
				},
			},
		},
	}),
});

const flushPromises = async () => await new Promise(setImmediate);

describe('CommunityPackageManageConfirmModal', () => {
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;

	beforeEach(() => {
		createAppModals();

		nodeTypesStore = useNodeTypesStore();
	});

	afterEach(() => {
		cleanupAppModals();
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

	it('should call nodeTypesStore methods and update latestVerifiedVersion on mount', async () => {
		useSettingsStore().setSettings({ ...defaultSettings, communityNodesEnabled: true });

		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.getCommunityNodeAttributes = vi.fn().mockResolvedValue({ npmVersion: '1.5.0' });

		const { getByTestId } = renderComponent({
			props: {
				modalName: 'test-modal',
				activePackageName: 'n8n-nodes-test',
				mode: 'update',
			},
		});

		await flushPromises();

		const testId = getByTestId('communityPackageManageConfirmModal-warning');
		expect(testId).toBeInTheDocument();
	});
});
