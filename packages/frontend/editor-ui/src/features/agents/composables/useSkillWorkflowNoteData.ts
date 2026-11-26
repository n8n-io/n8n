import chunk from 'lodash/chunk';
import { ref, watch, type Ref } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { SkillWorkflowNoteData } from '@/features/agents/utils/skillWorkflowNotes';

const MAX_IDS_PER_REQUEST = 50;

export function useSkillWorkflowNoteData(workflowIds: Ref<string[]>, enabled: Ref<boolean>) {
	const workflowsListStore = useWorkflowsListStore();
	const noteData = ref(new Map<string, SkillWorkflowNoteData | null>());
	let latestRequest = 0;

	async function loadPage(page: string[]): Promise<Array<[string, SkillWorkflowNoteData | null]>> {
		try {
			const workflows = await workflowsListStore.searchWorkflows({
				ids: page,
				select: [
					'id',
					'nodes',
					'activeVersionId',
					'settings',
					'isArchived',
					'ownedBy',
					'updatedAt',
				],
				options: { take: page.length, includeScopes: false },
			});
			const found = new Map(workflows.map((workflow) => [workflow.id, workflow]));
			return page.map((id) => [id, found.get(id) ?? null]);
		} catch {
			return [];
		}
	}

	async function load(ids: string[]) {
		const request = ++latestRequest;
		if (ids.length === 0) {
			noteData.value = new Map();
			return;
		}
		const pages = await Promise.all(chunk(ids, MAX_IDS_PER_REQUEST).map(loadPage));
		if (request !== latestRequest) return;
		noteData.value = new Map(pages.flat());
	}

	watch(
		() => (enabled.value ? [...workflowIds.value].sort().join(',') : ''),
		async (key) => await load(key ? key.split(',') : []),
		{ immediate: true },
	);

	return { noteData };
}
