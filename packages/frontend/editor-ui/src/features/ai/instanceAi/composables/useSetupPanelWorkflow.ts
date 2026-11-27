import { computed, type Ref } from 'vue';

import type InstanceAiSetupPanel from '@/features/ai/instanceAi/components/setupPanel/InstanceAiSetupPanel.vue';

import type { ArtifactThread } from '@/features/ai/instanceAi/artifactThread';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';

/**
 * The workflow that the setup panel above the composer shows: the workflow of
 * the active preview tab, else the latest workflow of the thread. Early setup
 * announcements can come before the first workflow artifact.
 */
export function useSetupPanelWorkflow(
	thread: Pick<ArtifactThread, 'producedArtifacts' | 'latestSetupWorkflowId'>,
	preview: { activeTabId: Ref<string | undefined>; activeWorkflowId: Ref<string | null> },
	panel: Readonly<Ref<InstanceType<typeof InstanceAiSetupPanel> | null>>,
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

	/** The panel's state for `User sent builder message`, while it shows this workflow. */
	function readChatTelemetryContext() {
		const context = panel.value?.getChatTelemetryContext();
		return context?.workflow_id === workflowId.value ? context : undefined;
	}

	return { workflowId, projectId, readChatTelemetryContext };
}
