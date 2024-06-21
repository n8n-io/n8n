import type { ITag, IWorkflowDb } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useTagsStore } from '@/stores/tags.store';
import { useUIStore } from '@/stores/ui.store';

export function useWorkflowInitState() {
	const workflowsStore = useWorkflowsStore();
	const tagsStore = useTagsStore();
	const uiStore = useUIStore();

	async function run(workflowData: IWorkflowDb): Promise<void> {
		workflowsStore.addWorkflow(workflowData);
		workflowsStore.setActive(workflowData.active || false);
		workflowsStore.setWorkflowId(workflowData.id);
		workflowsStore.setWorkflowName({
			newName: workflowData.name,
			setStateDirty: uiStore.stateIsDirty,
		});
		workflowsStore.setWorkflowSettings(workflowData.settings ?? {});
		workflowsStore.setWorkflowPinData(workflowData.pinData ?? {});
		workflowsStore.setWorkflowVersionId(workflowData.versionId);
		workflowsStore.setWorkflowMetadata(workflowData.meta);

		const tags = (workflowData.tags ?? []) as ITag[];
		const tagIds = tags.map((tag) => tag.id);
		workflowsStore.setWorkflowTagIds(tagIds || []);
		tagsStore.upsertTags(tags);
	}

	return {
		run,
	};
}
