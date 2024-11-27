import { useNodeViewVersionSwitcher } from './useNodeViewVersionSwitcher';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@/constants';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { useNDVStore } from '@/stores/ndv.store';

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: vi.fn(),
	}),
}));

describe('useNodeViewVersionSwitcher', () => {
	const initialState = {
		[STORES.WORKFLOWS]: {},
		[STORES.NDV]: {},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		const pinia = createTestingPinia({ initialState });
		setActivePinia(pinia);
	});

	describe('isNewUser', () => {
		test('should return true when there are no active workflows', () => {
			const { isNewUser } = useNodeViewVersionSwitcher();
			expect(isNewUser.value).toBe(true);
		});

		test('should return false when there are active workflows', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.activeWorkflows = ['1'];

			const { isNewUser } = useNodeViewVersionSwitcher();
			expect(isNewUser.value).toBe(false);
		});
	});

	describe('nodeViewVersion', () => {
		test('should initialize with default version "2"', () => {
			const { nodeViewVersion } = useNodeViewVersionSwitcher();
			expect(nodeViewVersion.value).toBe('2');
		});
	});

	describe('isNodeViewDiscoveryTooltipVisible', () => {
		test('should be visible under correct conditions', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.activeWorkflows = ['1'];

			const ndvStore = mockedStore(useNDVStore);
			ndvStore.activeNodeName = null;

			const { isNodeViewDiscoveryTooltipVisible } = useNodeViewVersionSwitcher();
			expect(isNodeViewDiscoveryTooltipVisible.value).toBe(true);
		});

		test('should not be visible for new users', () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.activeWorkflows = [];

			const { isNodeViewDiscoveryTooltipVisible } = useNodeViewVersionSwitcher();
			expect(isNodeViewDiscoveryTooltipVisible.value).toBe(false);
		});

		test('should not be visible when node is selected', () => {
			const ndvStore = mockedStore(useNDVStore);
			ndvStore.activeNodeName = 'test-node';

			const { isNodeViewDiscoveryTooltipVisible } = useNodeViewVersionSwitcher();
			expect(isNodeViewDiscoveryTooltipVisible.value).toBe(false);
		});
	});

	describe('switchNodeViewVersion', () => {
		test('should switch from version 2 to 1 and back', () => {
			const { nodeViewVersion, switchNodeViewVersion } = useNodeViewVersionSwitcher();

			switchNodeViewVersion();

			expect(nodeViewVersion.value).toBe('1');

			switchNodeViewVersion();

			expect(nodeViewVersion.value).toBe('2');
		});
	});

	describe('migrateToNewNodeViewVersion', () => {
		test('should not migrate if already migrated', () => {
			const { nodeViewVersion, nodeViewVersionMigrated, migrateToNewNodeViewVersion } =
				useNodeViewVersionSwitcher();
			nodeViewVersionMigrated.value = true;

			migrateToNewNodeViewVersion();

			expect(nodeViewVersion.value).toBe('2');
		});

		test('should not migrate if already on version 2', () => {
			const { nodeViewVersion, migrateToNewNodeViewVersion } = useNodeViewVersionSwitcher();
			nodeViewVersion.value = '2';

			migrateToNewNodeViewVersion();

			expect(nodeViewVersion.value).not.toBe('1');
		});

		test('should migrate to version 2 if not migrated and on version 1', () => {
			const { nodeViewVersion, nodeViewVersionMigrated, migrateToNewNodeViewVersion } =
				useNodeViewVersionSwitcher();
			nodeViewVersion.value = '1';
			nodeViewVersionMigrated.value = false;

			migrateToNewNodeViewVersion();

			expect(nodeViewVersion.value).toBe('2');
			expect(nodeViewVersionMigrated.value).toBe(true);
		});
	});

	describe('setNodeViewSwitcherDropdownOpened', () => {
		test('should set discovered when dropdown is closed', () => {
			const { setNodeViewSwitcherDropdownOpened, nodeViewSwitcherDiscovered } =
				useNodeViewVersionSwitcher();

			setNodeViewSwitcherDropdownOpened(false);

			expect(nodeViewSwitcherDiscovered.value).toBe(true);
			nodeViewSwitcherDiscovered.value = false;
		});

		test('should not set discovered when dropdown is opened', () => {
			const { setNodeViewSwitcherDropdownOpened, nodeViewSwitcherDiscovered } =
				useNodeViewVersionSwitcher();

			setNodeViewSwitcherDropdownOpened(true);

			expect(nodeViewSwitcherDiscovered.value).toBe(false);
		});
	});

	describe('setNodeViewSwitcherDiscovered', () => {
		test('should set nodeViewSwitcherDiscovered to true', () => {
			const { setNodeViewSwitcherDiscovered, nodeViewSwitcherDiscovered } =
				useNodeViewVersionSwitcher();

			setNodeViewSwitcherDiscovered();

			expect(nodeViewSwitcherDiscovered.value).toBe(true);
		});
	});
});
