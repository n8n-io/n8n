import { computed, type ComputedRef } from 'vue';

import { useSettingsStore } from '@/app/stores/settings.store';

import { canMessageInstanceAi } from '../instanceAiPermissions';

/**
 * Whether Instance AI can be used right now: the module is active, an admin
 * hasn't disabled it, and the current user has permission to message it. This
 * is the canonical gate for Instance AI entry points (nav item, command bar,
 * editor/credential hand-offs) — use it instead of re-deriving the three checks.
 */
export function useInstanceAiAvailable(): ComputedRef<boolean> {
	const settingsStore = useSettingsStore();
	return computed(
		() =>
			settingsStore.isModuleActive('instance-ai') &&
			settingsStore.moduleSettings['instance-ai']?.enabled !== false &&
			canMessageInstanceAi(),
	);
}
