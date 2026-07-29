import { onBeforeUnmount, onMounted, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { WorkflowPublicationStatus } from '@n8n/api-types';
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import type { PublicationLifecycle } from '@/app/stores/workflowDocument/useWorkflowDocumentPublicationStatus';

/** Tunable: delay before re-checking the status API while still publishing. */
export const PUBLICATION_STATUS_POLL_INTERVAL_MS = 8000;

// Exhaustively typed so a new API status value is a compile error rather than a
// silent 'idle' fallthrough. Keep the ?? 'idle' below as defensive runtime fallback.
const API_TO_LIFECYCLE: Record<WorkflowPublicationStatus['status'], PublicationLifecycle> = {
	in_progress: 'publishing',
	published: 'published',
	partial: 'partial',
	failed: 'failed',
	not_published: 'idle',
};

export function useWorkflowPublicationStatusSync(documentId: MaybeRefOrGetter<WorkflowDocumentId>) {
	const settingsStore = useSettingsStore();
	const workflowsStore = useWorkflowsStore();
	const { onDocumentVisible } = useDocumentVisibility();
	let timer: ReturnType<typeof setTimeout> | undefined;
	// Set on teardown so an in-flight fetch that resolves after unmount can't
	// re-arm the poll — otherwise it would leak background polling + store writes.
	let disposed = false;

	function armPoll() {
		if (disposed) return;
		clearTimeout(timer);
		timer = setTimeout(() => void refetch(), PUBLICATION_STATUS_POLL_INTERVAL_MS);
	}

	async function refetch() {
		if (disposed || !settingsStore.isWorkflowPublicationServiceEnabled) return;

		// Resolve the store from the current documentId on every call so a
		// workflow switch is immediately reflected without remounting.
		const workflowDocumentStore = useWorkflowDocumentStore(toValue(documentId));
		const workflowId = workflowDocumentStore.workflowId;
		if (!workflowId) return;

		// Cancel any pending poll before awaiting so an overlapping call can't re-arm a stale timer.
		clearTimeout(timer);

		try {
			const result = await workflowsStore.fetchPublicationStatus(workflowId);
			// The component may have been torn down while awaiting; don't touch
			// state or re-arm the poll after disposal.
			if (disposed) return;
			workflowDocumentStore.setPublicationStatus({
				status: API_TO_LIFECYCLE[result.status] ?? 'idle',
				failures: result.triggers
					.filter((t) => t.status === 'failed')
					.map((t) => ({
						nodeId: t.nodeId,
						// The status API returns only the stable nodeId; resolve the current
						// display name from the live workflow (falls back to the id).
						nodeName: workflowDocumentStore.getNodeById(t.nodeId)?.name ?? t.nodeId,
						errorMessage: t.errorMessage ?? '',
					}))
					.sort((a, b) => a.nodeName.localeCompare(b.nodeName)),
			});

			if (result.status === 'in_progress') armPoll();
		} catch {
			// A transient failure must not permanently freeze the spinner: keep polling
			// while we still believe a publication is in progress (unless torn down).
			if (!disposed && workflowDocumentStore.publicationStatus === 'publishing') armPoll();
		}
	}

	// Re-sync whenever the document switches (component is not keyed per workflow).
	watch(
		() => toValue(documentId),
		() => void refetch(),
	);

	// Back every "publishing" state with an authoritative poll so a state clobbered
	// before its confirming push (multi-main race) self-heals within one interval.
	watch(
		() => useWorkflowDocumentStore(toValue(documentId)).publicationStatus,
		(status) => {
			if (status === 'publishing') armPoll();
		},
	);

	onMounted(() => void refetch());
	onDocumentVisible(() => void refetch());
	onBeforeUnmount(() => {
		disposed = true;
		clearTimeout(timer);
	});

	return { refetch };
}
