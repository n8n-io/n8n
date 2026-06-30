import { onBeforeUnmount, onMounted } from 'vue';
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

const API_TO_LIFECYCLE: Record<string, PublicationLifecycle> = {
	in_progress: 'publishing',
	published: 'published',
	partial: 'partial',
	failed: 'failed',
	not_published: 'idle',
};

export function useWorkflowPublicationStatusSync(documentId: WorkflowDocumentId) {
	const settingsStore = useSettingsStore();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);
	const { onDocumentVisible } = useDocumentVisibility();
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function refetch() {
		if (!settingsStore.isWorkflowPublicationServiceEnabled) return;
		const workflowId = workflowDocumentStore.workflowId;
		if (!workflowId) return;

		// Cancel any pending poll before awaiting so an overlapping call can't re-arm a stale timer.
		clearTimeout(timer);

		const result = await workflowsStore.fetchPublicationStatus(workflowId);
		workflowDocumentStore.setPublicationStatus({
			status: API_TO_LIFECYCLE[result.status] ?? 'idle',
			failures: result.triggers
				.filter((t) => t.status === 'failed')
				.map((t) => ({
					nodeId: t.nodeId,
					nodeName: t.nodeName,
					errorMessage: t.errorMessage ?? '',
				}))
				.sort((a, b) => a.nodeName.localeCompare(b.nodeName)),
		});

		if (result.status === 'in_progress') {
			timer = setTimeout(() => void refetch(), PUBLICATION_STATUS_POLL_INTERVAL_MS);
		}
	}

	onMounted(() => void refetch());
	onDocumentVisible(() => void refetch());
	onBeforeUnmount(() => clearTimeout(timer));

	return { refetch };
}
