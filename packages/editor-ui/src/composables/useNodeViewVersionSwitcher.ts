import { computed, ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useSettingsStore } from '@/stores/settings.store';
import { useTelemetry } from '@/composables/useTelemetry';

export function useNodeViewVersionSwitcher() {
	const settingsStore = useSettingsStore();
	const telemetry = useTelemetry();

	const nodeViewVersion = useLocalStorage(
		'NodeView.version',
		settingsStore.deploymentType === 'n8n-internal' ? '2' : '1',
	);

	const nodeViewSwitcherDropdownOpened = ref(false);
	function setNodeViewSwitcherDropdownOpened() {
		nodeViewSwitcherDropdownOpened.value = true;
	}

	const nodeViewSwitcherDiscovered = useLocalStorage('NodeView.switcher.discovered', false);
	function setNodeViewSwitcherDiscovered() {
		nodeViewSwitcherDiscovered.value = true;
	}

	const isNodeViewDiscoveryTooltipVisible = computed(
		() =>
			nodeViewVersion.value !== '2' &&
			!(nodeViewSwitcherDropdownOpened.value || nodeViewSwitcherDiscovered.value),
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
