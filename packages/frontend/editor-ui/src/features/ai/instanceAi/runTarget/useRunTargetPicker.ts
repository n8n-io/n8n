import { computed, ref, watch } from 'vue';
import type { LinkedInstanceSummary, RunTarget } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';

import { fetchLinkedInstances } from '@/features/linkedInstances/linkedInstances.api';
import { LINKED_INSTANCES_MODULE_ID } from '@/features/linkedInstances/linkedInstances.constants';

import { useExperienceMode } from '../experience/useExperienceMode';

/**
 * The run target of a new chat. The picker shows in Power mode only, and only when the
 * linked-instances module is on. Simple mode always runs here.
 */
export function useRunTargetPicker() {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const { isSimple } = useExperienceMode();

	const showRunTargetPicker = computed(
		() => !isSimple.value && settingsStore.isModuleActive(LINKED_INSTANCES_MODULE_ID) === true,
	);
	const runTarget = ref<RunTarget>({ kind: 'local' });
	const links = ref<LinkedInstanceSummary[]>([]);

	async function loadLinks() {
		try {
			links.value = await fetchLinkedInstances(rootStore.restApiContext);
		} catch {
			// Without the list, the picker offers this computer only. The chat still starts.
			links.value = [];
		}
	}

	watch(
		showRunTargetPicker,
		(show) => {
			if (show) void loadLinks();
		},
		{ immediate: true },
	);

	// A link that the list no longer holds cannot take the chat, so the choice goes back here.
	watch(links, (list) => {
		const chosen = runTarget.value;
		if (chosen.kind === 'linked' && !list.some(({ id }) => id === chosen.instanceId)) {
			runTarget.value = { kind: 'local' };
		}
	});

	// The target a new chat starts with. Simple mode and a closed picker start the chat here.
	const chosenRunTarget = computed<RunTarget | undefined>(() =>
		showRunTargetPicker.value ? runTarget.value : undefined,
	);

	return { showRunTargetPicker, runTarget, links, chosenRunTarget };
}
