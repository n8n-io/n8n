import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useSettingsStore } from '@/stores/settings.store';

export function useNodeViewVersionSwitcher() {
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();
	const telemetry = useTelemetry();
	const settingsStore = useSettingsStore();

	const isNewUser = computed(() => workflowsStore.activeWorkflows.length === 0);

	const defaultVersion = settingsStore.isCanvasV2Enabled ? '2' : '1';
	const nodeViewVersion = useLocalStorage('NodeView.version', defaultVersion);
	const nodeViewVersionMigrated = useLocalStorage('NodeView.migrated.release', false);

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

		if (!nodeViewVersionMigrated.value) {
			nodeViewVersionMigrated.value = true;
		}

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
