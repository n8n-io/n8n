import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import CommunityPackageCard from './CommunityPackageCard.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { PublicInstalledNode, PublicInstalledPackage } from 'n8n-workflow';

const communityPackage: PublicInstalledPackage = {
	packageName: 'n8n-nodes-test',
	installedVersion: '1.0.0',
	installedNodes: [{ name: 'TestNode' } as PublicInstalledNode],
	createdAt: new Date(0),
	updatedAt: new Date(0),
};

const renderComponent = createComponentRenderer(CommunityPackageCard, {
	global: {
		stubs: {
			N8nActionToggle: {
				props: ['actions'],
				template:
					'<div data-test-id="action-toggle-stub">' +
					'<span v-for="action in actions" :key="action.value" :data-action-value="action.value">{{ action.label }}</span>' +
					'</div>',
			},
		},
	},
});

const flushPromises = async () => await new Promise(setImmediate);

const setupPinia = (settings: Record<string, unknown> = {}) => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: { settings },
		},
	});
	setActivePinia(pinia);
};

describe('CommunityPackageCard', () => {
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;

	beforeEach(() => {
		setupPinia();
		nodeTypesStore = useNodeTypesStore();
	});

	it('should call nodeTypesStore methods and update latestVerifiedVersion when packageName changes', async () => {
		Object.defineProperty(nodeTypesStore, 'visibleNodeTypes', {
			get: () => [{ name: 'n8n-nodes-test' }],
		});
		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.getCommunityNodeAttributes = vi.fn().mockResolvedValue({ npmVersion: '2.0.0' });

		renderComponent({
			props: {
				communityPackage,
			},
		});

		await flushPromises();

		expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalled();
		expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenCalledWith('n8n-nodes-test');
	});

	describe('uninstall action visibility', () => {
		it('shows the uninstall action when packages are not managed by env', () => {
			setupPinia({ communityNodesManagedByEnv: false });

			const { getByText } = renderComponent({
				props: { communityPackage },
			});

			expect(getByText('Uninstall package')).toBeInTheDocument();
		});

		it('hides the uninstall action when packages are managed by env', () => {
			setupPinia({ communityNodesManagedByEnv: true });

			const { queryByText } = renderComponent({
				props: { communityPackage },
			});

			expect(queryByText('Uninstall package')).not.toBeInTheDocument();
		});
	});
});
