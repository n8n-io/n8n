import type { InstanceAiAppPreviewDiagnostic } from '@n8n/api-types';
import { computed, ref } from 'vue';

/** Matches the server-side cap on `app-preview-diagnostics` items. */
export const APP_PREVIEW_DIAGNOSTICS_MAX = 50;

const dedupKey = (item: InstanceAiAppPreviewDiagnostic) =>
	[item.kind, item.message, item.file ?? '', item.line ?? ''].join('\u0000');

/**
 * Errors the live app preview reported since the user's last message. Newest
 * 50 win; a repeat of the same error at the same place is dropped.
 */
export function useAppPreviewDiagnostics() {
	const items = ref<InstanceAiAppPreviewDiagnostic[]>([]);

	const count = computed(() => items.value.length);

	function add(item: InstanceAiAppPreviewDiagnostic) {
		const key = dedupKey(item);
		if (items.value.some((existing) => dedupKey(existing) === key)) return;
		items.value = [...items.value, item].slice(-APP_PREVIEW_DIAGNOSTICS_MAX);
	}

	function takeAll(): InstanceAiAppPreviewDiagnostic[] {
		const taken = items.value;
		items.value = [];
		return taken;
	}

	function clear() {
		items.value = [];
	}

	return { count, add, takeAll, clear };
}

export type AppPreviewDiagnostics = ReturnType<typeof useAppPreviewDiagnostics>;
