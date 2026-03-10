import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { fetchSettings, updateSettings, fetchModelCredentials } from './instanceAi.settings.api';
import type {
	InstanceAiSettingsResponse,
	InstanceAiSettingsUpdateRequest,
	InstanceAiModelCredential,
	InstanceAiPermissions,
	InstanceAiPermissionMode,
} from '@n8n/api-types';

export const useInstanceAiSettingsStore = defineStore('instanceAiSettings', () => {
	const rootStore = useRootStore();
	const toast = useToast();

	const isLoading = ref(false);
	const isSaving = ref(false);
	const settings = ref<InstanceAiSettingsResponse | null>(null);
	const credentials = ref<InstanceAiModelCredential[]>([]);
	const draft = reactive<InstanceAiSettingsUpdateRequest>({});

	const isDirty = computed(() => {
		if (!settings.value) return false;
		return Object.keys(draft).length > 0;
	});

	async function fetch(): Promise<void> {
		isLoading.value = true;
		try {
			const [s, c] = await Promise.all([
				fetchSettings(rootStore.restApiContext),
				fetchModelCredentials(rootStore.restApiContext),
			]);
			settings.value = s;
			credentials.value = c;
			clearDraft();
		} catch {
			toast.showError(new Error('Failed to load settings'), 'Settings error');
		} finally {
			isLoading.value = false;
		}
	}

	async function save(): Promise<void> {
		isSaving.value = true;
		try {
			settings.value = await updateSettings(rootStore.restApiContext, draft);
			clearDraft();
			toast.showMessage({ title: 'Settings saved', type: 'success' });
		} catch {
			toast.showError(new Error('Failed to save settings'), 'Settings error');
		} finally {
			isSaving.value = false;
		}
	}

	function setField<K extends keyof InstanceAiSettingsUpdateRequest>(
		key: K,
		value: InstanceAiSettingsUpdateRequest[K],
	): void {
		draft[key] = value;
	}

	function clearDraft(): void {
		for (const key of Object.keys(draft)) {
			delete (draft as Record<string, unknown>)[key];
		}
	}

	function setPermission(key: keyof InstanceAiPermissions, value: InstanceAiPermissionMode): void {
		const existing = draft.permissions ?? {};
		draft.permissions = { ...existing, [key]: value };
	}

	function getPermission(key: keyof InstanceAiPermissions): InstanceAiPermissionMode {
		const draftVal = draft.permissions?.[key];
		if (draftVal !== undefined) return draftVal;
		return settings.value?.permissions?.[key] ?? 'require_approval';
	}

	function reset(): void {
		clearDraft();
	}

	return {
		settings,
		credentials,
		draft,
		isLoading,
		isSaving,
		isDirty,
		fetch,
		save,
		setField,
		setPermission,
		getPermission,
		reset,
	};
});
