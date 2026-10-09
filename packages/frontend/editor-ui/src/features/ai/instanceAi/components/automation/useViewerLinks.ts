import { computed, watch } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { LINKED_INSTANCES_MODULE_ID } from '@/features/linkedInstances/linkedInstances.constants';
import { useLinkedInstancesStore } from '@/features/linkedInstances/linkedInstances.store';
import type { ViewerLink } from './automationViewerLinks';

/**
 * The viewer's own links, to name the linked places of an automation card. It reads the list
 * each time `wanted` turns true while the linked-instances module is on, so that a card shows a
 * link that the user added or renamed. Reads that overlap share one request.
 */
export function useViewerLinks(wanted: () => boolean) {
	const settingsStore = useSettingsStore();
	const store = useLinkedInstancesStore();
	const isActive = computed(() => settingsStore.isModuleActive(LINKED_INSTANCES_MODULE_ID));

	watch(
		() => wanted() && isActive.value,
		(load) => {
			if (load) void store.fetchInstances();
		},
		{ immediate: true },
	);

	return computed<readonly ViewerLink[]>(() => (isActive.value ? store.instances : []));
}
