import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { createComponentRenderer } from '@/__tests__/render';
import CommunityPackageManageConfirmModal from './CommunityPackageManageConfirmModal.vue';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { useSettingsStore } from '@/stores/settings.store';
import { defaultSettings } from '@/__tests__/defaults';
import { mockNodeTypeDescription } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY } from '@/constants';

const fetchWorkflowsWithNodesIncluded = vi.fn();
vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
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
						installedNodes: [{ name: 'TestNode' }],
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
		nodeTypesStore = useNodeTypesStore();
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
					'router-link': {
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
		expect(screen.getByText('Package includes: TestNode')).toBeInTheDocument();
	});

	it('should notinclude table with affected workflows', async () => {
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

		expect(screen.getByText('Package includes: TestNode')).toBeInTheDocument();

		expect(
			screen.getByText('Nodes from this package are not used in any workflows'),
		).toBeInTheDocument();
	});
});
