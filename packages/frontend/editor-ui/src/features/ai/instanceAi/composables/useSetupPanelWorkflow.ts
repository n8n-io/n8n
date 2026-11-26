import { computed, type Ref } from 'vue';

import type { ArtifactThread } from '@/features/ai/instanceAi/artifactThread';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';

/**
 * The workflow that the setup panel above the composer shows: the workflow of
 * the active preview tab, else the latest workflow of the thread. Early setup
 * announcements can come before the first workflow artifact.
 */
export function useSetupPanelWorkflow(
	thread: Pick<ArtifactThread, 'producedArtifacts' | 'latestSetupWorkflowId'>,
	preview: {
		activeTabId: Readonly<Ref<string | undefined>>;
		activeWorkflowId: Readonly<Ref<string | null | undefined>>;
	},
) {
	const settingsStore = useInstanceAiSettingsStore();

	const workflowId = computed(() => {
		if (!settingsStore.isInstanceAiSetupPanelEnabled) return undefined;
		if (preview.activeTabId.value) return preview.activeWorkflowId.value ?? undefined;
		let latest: string | undefined;
		for (const entry of thread.producedArtifacts.values()) {
			if (entry.type === 'workflow') latest = entry.id;
		}
		return latest ?? thread.latestSetupWorkflowId;
	});

	const projectId = computed(() =>
		workflowId.value ? thread.producedArtifacts.get(workflowId.value)?.projectId : undefined,
	);

	return { workflowId, projectId };
}
