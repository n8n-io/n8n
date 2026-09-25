import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { createComponentRenderer } from '@/__tests__/render';
import CommunityPackageManageConfirmModal from './CommunityPackageManageConfirmModal.vue';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY } from '../communityNodes.constants';
import { useCommunityNodesStore } from '../communityNodes.store';
import { fireEvent } from '@testing-library/vue';

const fetchWorkflowsWithNodesIncluded = vi.fn();
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: vi.fn(() => ({
		fetchWorkflowsWithNodesIncluded,
	})),
}));

const renderComponent = createComponentRenderer(CommunityPackageManageConfirmModal, {
	data() {
		return {
			packageName: 'n8n-nodes-hello',
		};
	},
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: {
					[COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY]: { open: true },
				},
			},
			[STORES.COMMUNITY_NODES]: {
				installedPackages: {
					'n8n-nodes-test': {
						packageName: 'n8n-nodes-test',
						installedVersion: '1.0.0',
						updateAvailable: '2.0.0',
						installedNodes: [
							{ name: 'OldNode', type: 'n8n-nodes-test.old' },
							{ name: 'TestNode', type: 'n8n-nodes-test.test' },
						],
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
		useSettingsStore().$patch({
			settings: { ...defaultSettings, communityNodesEnabled: true },
		});
		nodeTypesStore = useNodeTypesStore();
	});

	it('skips stale node types when loading package information', async () => {
		nodeTypesStore.getCommunityNodeAttributes = vi
			.fn()
			.mockImplementation(async (nodeType) =>
				nodeType === 'n8n-nodes-test.test' ? { npmVersion: '2.0.0' } : null,
			);

		renderComponent({
			props: {
				modalName: 'test-modal',
				activePackageName: 'n8n-nodes-test',
				mode: 'update',
			},
		});

		await flushPromises();

		expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenNthCalledWith(
			1,
			'n8n-nodes-test.old',
		);
		expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenNthCalledWith(
			2,
			'n8n-nodes-test.test',
		);
		expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenCalledTimes(2);
	});

	it('uses the exact package version and checksum for a verified-only update', async () => {
		useSettingsStore().$patch({
			settings: {
				...defaultSettings,
				communityNodesEnabled: true,
				unverifiedCommunityNodesEnabled: false,
			},
		});
		const communityNodesStore = useCommunityNodesStore();
		nodeTypesStore.getCommunityNodeAttributes = vi
			.fn()
			.mockImplementation(async (nodeType) =>
				nodeType === 'n8n-nodes-test.test'
					? { npmVersion: '2.0.0', checksum: 'correct-checksum' }
					: null,
			);

		const { getByRole } = renderComponent({
			props: {
				modalName: 'test-modal',
				activePackageName: 'n8n-nodes-test',
				mode: 'update',
			},
		});

		await flushPromises();
		await fireEvent.click(getByRole('button', { name: 'Confirm update' }));

		expect(communityNodesStore.updatePackage).toHaveBeenCalledWith(
			'n8n-nodes-test',
			'2.0.0',
			'correct-checksum',
		);
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

	it('should include table with affected workflows', async () => {
		useSettingsStore().setSettings({ ...defaultSettings, communityNodesEnabled: true });

		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.getCommunityNodeAttributes = vi.fn().mockResolvedValue({ npmVersion: '1.5.0' });

		fetchWorkflowsWithNodesIncluded.mockResolvedValue({
			data: [
				{
					id: 'workflow-1',
					name: 'Test Workflow 1',
					resourceType: 'workflow',
					active: true,
					createdAt: '2023-01-01T00:00:00.000Z',
					updatedAt: '2023-01-01T00:00:00.000Z',
					homeProject: {
						id: 'project-1',
						name: 'Test Project 1',
						icon: { type: 'emoji', value: 'test' },
						type: 'personal',
						createdAt: '2023-01-01T00:00:00.000Z',
						updatedAt: '2023-01-01T00:00:00.000Z',
					},
					isArchived: false,
					readOnly: false,
					scopes: [],
					tags: [],
				},
			],
		});

		const screen = renderComponent({
			props: {
				modalName: 'test-modal',
				activePackageName: 'n8n-nodes-test',
				mode: 'update',
			},
			global: {
				stubs: {
					RouterLink: {
						template: '<a><slot /></a>',
					},
				},
				plugins: [createTestingPinia()],
			},
		});

		await flushPromises();

		const testId = screen.getByTestId('communityPackageManageConfirmModal-warning');
		expect(testId).toBeInTheDocument();
		expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
		expect(screen.getByText('Test Project 1')).toBeInTheDocument();
		expect(screen.getByText('Active')).toBeInTheDocument();
		expect(screen.getByText('Confirm update')).toBeInTheDocument();
		expect(screen.getByText('Cancel')).toBeInTheDocument();
		expect(screen.getByText('Package includes: OldNode, TestNode')).toBeInTheDocument();
	});

	it('should not include table with affected workflows', async () => {
		useSettingsStore().setSettings({ ...defaultSettings, communityNodesEnabled: true });

		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.getCommunityNodeAttributes = vi.fn().mockResolvedValue({ npmVersion: '1.5.0' });

		fetchWorkflowsWithNodesIncluded.mockResolvedValue({
			data: [],
		});

		const screen = renderComponent({
			props: {
				modalName: 'test-modal',
				activePackageName: 'n8n-nodes-test',
				mode: 'update',
			},
		});

		await flushPromises();

		const testId = screen.getByTestId('communityPackageManageConfirmModal-warning');
		expect(testId).toBeInTheDocument();

		expect(screen.getByText('Package includes: OldNode, TestNode')).toBeInTheDocument();

		expect(
			screen.getByText('Nodes from this package are not used in any workflows'),
		).toBeInTheDocument();
	});

	it('should not show warning if it is not defined', async () => {
		useSettingsStore().setSettings({ ...defaultSettings, communityNodesEnabled: true });

		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.getCommunityNodeAttributes = vi.fn().mockResolvedValue({ npmVersion: '1.5.0' });

		fetchWorkflowsWithNodesIncluded.mockResolvedValue({
			data: [],
		});

		// uninstall mode does not have a warning
		const screen = renderComponent({
			props: {
				modalName: 'test-modal',
				activePackageName: 'n8n-nodes-test',
				mode: 'uninstall',
			},
		});

		await flushPromises();

		const testId = screen.queryByTestId('communityPackageManageConfirmModal-warning');
		expect(testId).not.toBeInTheDocument();
	});
});
