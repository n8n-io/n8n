import { computed, ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useSettingsStore } from '@/stores/settings.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { debouncedRef } from '@vueuse/core';

export function useNodeViewVersionSwitcher() {
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const telemetry = useTelemetry();

	const isNewUser = computed(() => workflowsStore.activeWorkflows.length === 0);

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

	const isNodeViewDiscoveryTooltipVisibleRaw = computed(
		() =>
			nodeViewVersion.value !== '2' &&
			!(
				isNewUser.value ||
				nodeViewSwitcherDropdownOpened.value ||
				nodeViewSwitcherDiscovered.value
			),
	);

	const isNodeViewDiscoveryTooltipVisible = debouncedRef(
		isNodeViewDiscoveryTooltipVisibleRaw,
		3000,
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
