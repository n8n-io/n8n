import {
	useDocumentTitle as useDocumentTitleBase,
	type WorkflowTitleStatus,
} from '@n8n/composables/useDocumentTitle';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { onScopeDispose, ref, type Ref } from 'vue';

export type { WorkflowTitleStatus };

// Hosts that embed a workflow canvas but name the tab after something else
// (Instance AI names it after the conversation, not the previewed workflow)
// claim the title while mounted, which turns `setDocumentTitle` into a no-op —
// the workflow-flavoured setter the canvas and its execution handlers call.
// Counted, not a boolean: a transient remount claims from the new instance
// before the outgoing one disposes.
const titleClaims = ref(0);

export function claimDocumentTitle() {
	titleClaims.value++;
	onScopeDispose(() => titleClaims.value--);
}

export function useDocumentTitle(windowRef?: Ref<Window | undefined>) {
	const settingsStore = useSettingsStore();
	const { releaseChannel } = settingsStore.settings;
	const base = useDocumentTitleBase({ releaseChannel, windowRef });

	return {
		...base,
		setDocumentTitle: (workflowName: string, status: WorkflowTitleStatus) => {
			if (titleClaims.value > 0) return;
			base.setDocumentTitle(workflowName, status);
		},
	};
}
