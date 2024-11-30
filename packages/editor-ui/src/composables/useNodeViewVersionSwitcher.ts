import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';

export function useNodeViewVersionSwitcher() {
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();
	const telemetry = useTelemetry();

	const isNewUser = computed(() => workflowsStore.activeWorkflows.length === 0);

	const nodeViewVersion = useLocalStorage('NodeView.version', '2');
	const nodeViewVersionMigrated = useLocalStorage('NodeView.migrated', false);

	function setNodeViewSwitcherDropdownOpened(visible: boolean) {
		if (!visible) {
			setNodeViewSwitcherDiscovered();
		}
	}

	const nodeViewSwitcherDiscovered = useLocalStorage('NodeView.switcher.discovered.beta', false);
	function setNodeViewSwitcherDiscovered() {
		nodeViewSwitcherDiscovered.value = true;
	}

	const isNodeViewDiscoveryTooltipVisible = computed(
		() =>
			!isNewUser.value &&
			!ndvStore.activeNodeName &&
			nodeViewVersion.value === '2' &&
			!nodeViewSwitcherDiscovered.value,
	);

	function switchNodeViewVersion() {
		const toVersion = nodeViewVersion.value === '2' ? '1' : '2';

		telemetry.track('User switched canvas version', {
			to_version: toVersion,
		});

		nodeViewVersion.value = toVersion;
	}

	function migrateToNewNodeViewVersion() {
		if (nodeViewVersionMigrated.value || nodeViewVersion.value === '2') {
			return;
		}

		switchNodeViewVersion();
		nodeViewVersionMigrated.value = true;
	}

	return {
		isNewUser,
		nodeViewVersion,
		nodeViewVersionMigrated,
		nodeViewSwitcherDiscovered,
		isNodeViewDiscoveryTooltipVisible,
		setNodeViewSwitcherDropdownOpened,
		setNodeViewSwitcherDiscovered,
		switchNodeViewVersion,
		migrateToNewNodeViewVersion,
	};
}
