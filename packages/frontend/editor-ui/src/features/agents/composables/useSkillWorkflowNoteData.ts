import { ref, watch, type Ref } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { SkillWorkflowNoteData } from '../utils/skillWorkflowNotes';

export function useSkillWorkflowNoteData(workflowIds: Ref<string[]>, enabled: Ref<boolean>) {
	const workflowsListStore = useWorkflowsListStore();
	const noteData = ref(new Map<string, SkillWorkflowNoteData>());
	let latestRequest = 0;

	async function load(ids: string[]) {
		const request = ++latestRequest;
		if (ids.length === 0) {
			noteData.value = new Map();
			return;
		}
		try {
			const workflows = await workflowsListStore.searchWorkflows({
				ids,
				select: ['id', 'nodes', 'activeVersionId', 'settings'],
				options: { take: ids.length, includeScopes: false },
			});
			if (request !== latestRequest) return;
			noteData.value = new Map(workflows.map((workflow) => [workflow.id, workflow]));
		} catch {
			if (request === latestRequest) noteData.value = new Map();
		}
	}

	watch(
		() => (enabled.value ? [...workflowIds.value].sort().join(',') : ''),
		async (key) => await load(key ? key.split(',') : []),
		{ immediate: true },
	);

	return { noteData };
}
