import { computed, type ComputedRef } from 'vue';

import { useSettingsStore } from '@n8n/stores/settings.store';

import { canManageInstanceAi, canMessageInstanceAi } from '../instanceAiPermissions';

/**
 * Whether Instance AI can be reached right now: the module is active, enabled,
 * ready for members (or the user can finish admin setup), and the user can
 * message it. This is the canonical gate for surfaces that only navigate to the
 * feature (nav item, command bar, its own routes) — anything that opens a
 * thread wants `useInstanceAiReady` below.
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

/**
 * Whether Instance AI can actually answer a prompt: available *and* set up.
 *
 * `useInstanceAiAvailable` deliberately lets an admin in before setup finishes
 * so they can reach onboarding, which means it is not a safe gate for anything
 * that opens a thread — the turn would be sent to an instance with no model.
 * Entry points that start a conversation (or advertise one to another surface)
 * check this instead.
 */
export function useInstanceAiReady(): ComputedRef<boolean> {
	const settingsStore = useSettingsStore();
	const available = useInstanceAiAvailable();
	return computed(
		() => available.value && settingsStore.moduleSettings['instance-ai']?.setupCompleted === true,
	);
}
