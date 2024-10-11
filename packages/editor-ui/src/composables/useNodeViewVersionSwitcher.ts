import { useLocalStorage } from '@vueuse/core';
import { useSettingsStore } from '@/stores/settings.store';
import { computed, ref } from 'vue';

export function useNodeViewVersionSwitcher() {
	const settingsStore = useSettingsStore();

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

	function toggleNodeViewVersion() {
		if (nodeViewVersion.value === '1') {
			nodeViewVersion.value = '2';
		} else {
			nodeViewVersion.value = '1';
		}
	}

	return {
		nodeViewVersion,
		nodeViewSwitcherDiscovered,
		isNodeViewDiscoveryTooltipVisible,
		setNodeViewSwitcherDropdownOpened,
		setNodeViewSwitcherDiscovered,
		toggleNodeViewVersion,
	};
}
