import { computed } from 'vue';
import { useLocalStorage, debouncedRef } from '@vueuse/core';
import { useSettingsStore } from '@/stores/settings.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';

export function useNodeViewVersionSwitcher() {
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const telemetry = useTelemetry();

	const isNewUser = computed(() => workflowsStore.activeWorkflows.length === 0);
	const isNewUserDebounced = debouncedRef(isNewUser, 3000);

	const nodeViewVersion = useLocalStorage(
		'NodeView.version',
		settingsStore.isCanvasV2Enabled ? '2' : '1',
	);

	function setNodeViewSwitcherDropdownOpened(visible: boolean) {
		if (!visible) {
			setNodeViewSwitcherDiscovered();
		}
	}

	const nodeViewSwitcherDiscovered = useLocalStorage('NodeView.switcher.discovered', false);
	function setNodeViewSwitcherDiscovered() {
		nodeViewSwitcherDiscovered.value = true;
	}

	const isNodeViewDiscoveryTooltipVisible = computed(
		() =>
			!ndvStore.activeNodeName &&
			nodeViewVersion.value !== '2' &&
			!(isNewUserDebounced.value || nodeViewSwitcherDiscovered.value),
	);

	function switchNodeViewVersion() {
		const toVersion = nodeViewVersion.value === '1' ? '2' : '1';

		telemetry.track('User switched canvas version', {
			to_version: toVersion,
		});

		nodeViewVersion.value = toVersion;
	}

	return {
		nodeViewVersion,
		nodeViewSwitcherDiscovered,
		isNodeViewDiscoveryTooltipVisible,
		setNodeViewSwitcherDropdownOpened,
		setNodeViewSwitcherDiscovered,
		switchNodeViewVersion,
	};
}
