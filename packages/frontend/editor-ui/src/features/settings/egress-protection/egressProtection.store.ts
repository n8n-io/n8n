import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	EgressCalibrationResponse,
	EgressPolicyStateResponse,
	EgressProtectionModeDto,
	UpdateEgressPolicyDto,
} from '@n8n/api-types';
import {
	clearEgressCalibration,
	getEgressCalibration,
	getEgressPolicy,
	updateEgressPolicy,
} from '@n8n/rest-api-client/api/egress-protection';
import { EGRESS_PROTECTION_STORE } from './egressProtection.constants';

/** The admin-editable slice of the policy: mode plus the editable lists. */
export type EgressPolicyDraft = {
	mode: EgressProtectionModeDto;
	blockedIpRanges: string[];
	allowedIpRanges: string[];
	allowedHostnames: string[];
	blockedHostnames: string[];
};

/** The editable list fields, used by the auto-save mutation actions. */
export type EgressListField =
	| 'blockedIpRanges'
	| 'allowedIpRanges'
	| 'allowedHostnames'
	| 'blockedHostnames';

/** Auto-save lifecycle, surfaced as a subtle status indicator (no Save button). */
export type EgressSaveState = 'idle' | 'saving' | 'saved' | 'error';

function draftFromState(state: EgressPolicyStateResponse): EgressPolicyDraft {
	return {
		mode: state.mode,
		blockedIpRanges: [...state.blockedIpRanges],
		allowedIpRanges: [...state.allowedIpRanges],
		allowedHostnames: [...state.allowedHostnames],
		blockedHostnames: [...state.blockedHostnames],
	};
}

export const useEgressProtectionStore = defineStore(EGRESS_PROTECTION_STORE, () => {
	const rootStore = useRootStore();

	const policy = ref<EgressPolicyStateResponse | null>(null);
	const calibration = ref<EgressCalibrationResponse | null>(null);

	// The live, edited model. Every mutation persists immediately (auto-save), so
	// there is no separate "saved" snapshot or dirty state to track.
	const draft = ref<EgressPolicyDraft | null>(null);

	const loading = ref(true);
	const saveState = ref<EgressSaveState>('idle');
	const calibrationLoading = ref(false);

	const editable = computed(() => policy.value?.editable ?? false);

	function applyPolicy(state: EgressPolicyStateResponse): void {
		policy.value = state;
		draft.value = draftFromState(state);
	}

	async function fetchPolicy(): Promise<void> {
		loading.value = true;
		try {
			applyPolicy(await getEgressPolicy(rootStore.restApiContext));
		} finally {
			loading.value = false;
		}
	}

	/** Persist the current draft. The server response is the new source of truth. */
	async function persist(): Promise<void> {
		if (!draft.value) return;
		saveState.value = 'saving';
		// The settings row is the source of truth, so we persist the full policy
		// (mode plus every list) on each change.
		const payload: UpdateEgressPolicyDto = {
			mode: draft.value.mode,
			blockedIpRanges: draft.value.blockedIpRanges,
			allowedIpRanges: draft.value.allowedIpRanges,
			allowedHostnames: draft.value.allowedHostnames,
			blockedHostnames: draft.value.blockedHostnames,
		};
		try {
			applyPolicy(await updateEgressPolicy(rootStore.restApiContext, payload));
			saveState.value = 'saved';
		} catch (error) {
			saveState.value = 'error';
			throw error;
		}
	}

	/** Change the mode and persist, rolling back the optimistic change on failure. */
	async function updateMode(mode: EgressProtectionModeDto): Promise<void> {
		if (!draft.value || draft.value.mode === mode) return;
		const previous = draft.value.mode;
		draft.value.mode = mode;
		try {
			await persist();
		} catch (error) {
			if (draft.value) draft.value.mode = previous;
			throw error;
		}
	}

	/** Add a list entry and persist, rolling back the optimistic add on failure. */
	async function addEntry(field: EgressListField, value: string): Promise<void> {
		const trimmed = value.trim();
		if (!trimmed || !draft.value || draft.value[field].includes(trimmed)) return;
		draft.value[field].push(trimmed);
		try {
			await persist();
		} catch (error) {
			const index = draft.value?.[field].indexOf(trimmed) ?? -1;
			if (index >= 0) draft.value?.[field].splice(index, 1);
			throw error;
		}
	}

	/** Remove a list entry and persist, restoring it on failure. */
	async function removeEntry(field: EgressListField, index: number): Promise<void> {
		if (!draft.value) return;
		const [removed] = draft.value[field].splice(index, 1);
		try {
			await persist();
		} catch (error) {
			if (draft.value && removed !== undefined) draft.value[field].splice(index, 0, removed);
			throw error;
		}
	}

	async function fetchCalibration(): Promise<void> {
		calibrationLoading.value = true;
		try {
			calibration.value = await getEgressCalibration(rootStore.restApiContext);
		} finally {
			calibrationLoading.value = false;
		}
	}

	async function clearCalibration(): Promise<void> {
		await clearEgressCalibration(rootStore.restApiContext);
		calibration.value = calibration.value ? { ...calibration.value, destinations: [] } : null;
	}

	return {
		policy,
		calibration,
		draft,
		loading,
		saveState,
		calibrationLoading,
		editable,
		fetchPolicy,
		updateMode,
		addEntry,
		removeEntry,
		fetchCalibration,
		clearCalibration,
	};
});
