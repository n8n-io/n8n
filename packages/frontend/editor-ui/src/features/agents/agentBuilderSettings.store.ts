import type { AgentBuilderAdminSettings, AgentBuilderAdminSettingsResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	getAgentBuilderSettings,
	getAgentBuilderStatus,
	updateAgentBuilderSettings,
} from './composables/useAgentBuilderSettingsApi';

const DEFAULT_SETTINGS: AgentBuilderAdminSettings = { mode: 'default' };

/**
 * Pinia store for the agent builder admin settings page and the build-UI
 * gating empty state.
 *
 * Holds only what the dedicated `/agent-builder` endpoints return — the
 * cross-cutting context (deployment type, available credentials, credential
 * display name) is read from the existing `useSettingsStore` and
 * `useCredentialsStore` to avoid duplicated state.
 */
export const useAgentBuilderSettingsStore = defineStore('agentBuilderSettings', () => {
	const rootStore = useRootStore();

	const isLoading = ref(false);
	const isSaving = ref(false);
	const settings = ref<AgentBuilderAdminSettings | null>(null);
	const isConfigured = ref<boolean>(false);
	const draft = ref<AgentBuilderAdminSettings | null>(null);

	const effectiveSettings = computed<AgentBuilderAdminSettings>(
		() => draft.value ?? settings.value ?? DEFAULT_SETTINGS,
	);

	const mode = computed(() => effectiveSettings.value.mode);
	const isDirty = computed(() => {
		if (!draft.value || !settings.value) return false;
		return JSON.stringify(draft.value) !== JSON.stringify(settings.value);
	});

	function applyResponse(response: AgentBuilderAdminSettingsResponse) {
		settings.value = response.settings;
		isConfigured.value = response.isConfigured;
		draft.value = null;
	}

	async function fetch(): Promise<void> {
		isLoading.value = true;
		try {
			const response = await getAgentBuilderSettings(rootStore.restApiContext);
			applyResponse(response);
		} finally {
			isLoading.value = false;
		}
	}

	async function fetchStatus(): Promise<void> {
		const status = await getAgentBuilderStatus(rootStore.restApiContext);
		isConfigured.value = status.isConfigured;
	}

	function setMode(next: AgentBuilderAdminSettings['mode']): void {
		const base = settings.value ?? DEFAULT_SETTINGS;
		if (next === 'default') {
			draft.value = { mode: 'default' };
			return;
		}
		// mode === 'custom' — preserve any existing custom selection so switching
		// from default → custom doesn't immediately invalidate the picker.
		const previousCustom = base.mode === 'custom' ? base : null;
		draft.value = {
			mode: 'custom',
			provider: previousCustom?.provider ?? '',
			credentialId: previousCustom?.credentialId ?? '',
			modelName: previousCustom?.modelName ?? '',
		};
	}

	function setCustomSelection(selection: {
		provider: string;
		credentialId: string;
		modelName: string;
	}): void {
		draft.value = {
			mode: 'custom',
			provider: selection.provider,
			credentialId: selection.credentialId,
			modelName: selection.modelName,
		};
	}

	async function save(): Promise<void> {
		if (!draft.value) return;
		isSaving.value = true;
		try {
			const response = await updateAgentBuilderSettings(rootStore.restApiContext, draft.value);
			applyResponse(response);
		} finally {
			isSaving.value = false;
		}
	}

	function discardDraft(): void {
		draft.value = null;
	}

	return {
		isLoading,
		isSaving,
		settings,
		isConfigured,
		draft,
		effectiveSettings,
		mode,
		isDirty,
		fetch,
		fetchStatus,
		setMode,
		setCustomSelection,
		save,
		discardDraft,
	};
});
