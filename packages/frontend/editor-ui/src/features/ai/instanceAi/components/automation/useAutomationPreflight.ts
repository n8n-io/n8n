import { computed, ref, watch, type Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import { fetchTransferPreflight } from '@/features/linkedInstances/transfer/transfer.api';
import {
	transferDialogState,
	type TransferDialogState,
} from '@/features/linkedInstances/transfer/transferDialogState';
import type { AutomationCheck } from './automationTargets';

/** The workflow version that a card shows, on the linked instance that the user chose. */
export interface AutomationPreflightRequest {
	linkId: string;
	workflowId: string;
	versionId: string;
}

// The server limits these checks per user, and a chat can show the same card again (after a
// reload or a scroll). One answer per version and link is enough until the user asks again.
const checks = new Map<string, TransferDialogState>();

/** Clears the stored checks. Tests call this between cases. */
export function clearAutomationPreflights() {
	checks.clear();
}

const keyOf = (request: AutomationPreflightRequest | undefined) =>
	request ? `${request.linkId}:${request.workflowId}:${request.versionId}` : '';

/**
 * Checks what the linked instance needs before the workflow goes there. It runs when `request`
 * names a link, and stops when it no longer does. Only the answer of the latest check counts.
 */
export function useAutomationPreflight(request: Ref<AutomationPreflightRequest | undefined>) {
	const rootStore = useRootStore();
	const check = ref<AutomationCheck>('idle');
	let latest = 0;

	async function load(wanted: AutomationPreflightRequest, fresh: boolean) {
		const run = ++latest;
		const key = keyOf(wanted);
		const stored = fresh ? undefined : checks.get(key);
		if (stored) {
			check.value = stored;
			return;
		}
		check.value = 'checking';
		try {
			const preflight = await fetchTransferPreflight(rootStore.restApiContext, wanted.linkId, {
				workflowId: wanted.workflowId,
			});
			const state = transferDialogState(preflight);
			checks.set(key, state);
			if (run === latest) check.value = state;
		} catch {
			if (run === latest) check.value = 'failed';
		}
	}

	const requestKey = computed(() => keyOf(request.value));

	watch(
		requestKey,
		() => {
			const wanted = request.value;
			if (wanted) {
				void load(wanted, false);
				return;
			}
			latest++;
			check.value = 'idle';
		},
		{ immediate: true },
	);

	/** Asks the linked instance again, for example after the user set up a credential there. */
	function recheck() {
		const wanted = request.value;
		if (wanted) void load(wanted, true);
	}

	return { check, recheck };
}
