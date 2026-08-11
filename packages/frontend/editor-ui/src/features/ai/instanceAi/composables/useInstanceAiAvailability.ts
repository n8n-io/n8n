import { computed, type ComputedRef } from 'vue';

import { useSettingsStore } from '@n8n/stores/settings.store';

import { canManageInstanceAi, canMessageInstanceAi } from '../instanceAiPermissions';

/**
 * Whether Instance AI can be used right now: the module is active, enabled,
 * ready for members (or the user can finish admin setup), and the user can
 * message it. This is the canonical gate for Instance AI entry points.
 */
export function useInstanceAiAvailable(): ComputedRef<boolean> {
	const settingsStore = useSettingsStore();
	return computed(
		() =>
			settingsStore.isModuleActive('instance-ai') &&
			settingsStore.moduleSettings['instance-ai']?.enabled !== false &&
			(settingsStore.moduleSettings['instance-ai']?.setupCompleted === true ||
				canManageInstanceAi()) &&
			canMessageInstanceAi(),
	);
}
