import { computed, reactive } from 'vue';
import type { ExperienceMode } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import {
	createExperienceModeSaver,
	resolveExperienceMode,
	type ExperienceModeSaver,
} from './experienceMode';

// The sidebar, Settings and the command bar share one save queue for each user.
// The key is the user ID, because a new sign-in does not reload the page.
const pendingModes = reactive(new Map<string, ExperienceMode>());
const savers = new Map<string, ExperienceModeSaver>();

/** Clears the shared state. Tests call this between cases. */
export function resetExperienceModeState() {
	pendingModes.clear();
	savers.clear();
}

function saverFor(userKey: string): ExperienceModeSaver {
	const saver =
		savers.get(userKey) ??
		createExperienceModeSaver((mode) => {
			if (mode) pendingModes.set(userKey, mode);
			else pendingModes.delete(userKey);
		});
	savers.set(userKey, saver);
	return saver;
}

/** The Simple or Power interface of the current user. With the flag off, it is always Power. */
export function useExperienceMode() {
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const toast = useToast();
	const i18n = useI18n();

	const userKey = () => usersStore.currentUserId ?? '';
	const experience = computed(() => settingsStore.moduleSettings['instance-ai']?.experience);
	const isEnabled = computed(() => experience.value?.enabled === true);
	const savedMode = computed(() =>
		resolveExperienceMode({
			enabled: isEnabled.value,
			saved: usersStore.currentUser?.settings?.experienceMode,
			defaultMode: experience.value?.defaultMode,
		}),
	);
	// A queued or running save shows the wanted mode at once. Each save response
	// replaces the stored settings, so the store alone would show an older mode.
	const mode = computed(() => (isEnabled.value && pendingModes.get(userKey())) || savedMode.value);
	const isSimple = computed(() => mode.value === 'simple');

	async function save(next: ExperienceMode) {
		try {
			await usersStore.updateUserSettings({ experienceMode: next });
		} catch (error) {
			toast.showError(error, i18n.baseText('experienceMode.saveError'));
			throw error;
		}
	}

	/** Resolves to true when the server saved `next` and no later change replaced it. */
	async function setMode(next: ExperienceMode, options: { announce?: boolean } = {}) {
		if (!isEnabled.value) return false;
		if (next === mode.value && !pendingModes.has(userKey())) return true;
		const saved = await saverFor(userKey()).request(next, save);
		if (saved && options.announce) {
			const title = i18n.baseText(`experienceMode.switched.${next}`);
			toast.showMessage({ type: 'success', title });
		}
		return saved;
	}

	return { isEnabled, mode, isSimple, setMode };
}
