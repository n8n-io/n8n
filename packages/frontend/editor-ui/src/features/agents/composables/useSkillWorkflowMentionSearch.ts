import type { SkillWorkflowMention } from '@n8n/api-types';
import { ref, toValue, type MaybeRefOrGetter } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

export const SKILL_WORKFLOW_MENTION_PAGE_SIZE = 20;

export function useSkillWorkflowMentionSearch(projectId: MaybeRefOrGetter<string | undefined>) {
	const workflowsListStore = useWorkflowsListStore();
	const workflows = ref<SkillWorkflowMention[]>([]);
	const isLoading = ref(false);
	const hasMore = ref(false);
	const hasError = ref(false);
	let currentQuery = '';
	let latestRequest = 0;

	async function loadPage(skip: number) {
		const request = ++latestRequest;
		isLoading.value = true;
		hasError.value = false;
		try {
			const page = await workflowsListStore.searchWorkflows({
				projectId: toValue(projectId),
				query: currentQuery || undefined,
				isArchived: false,
				select: ['id', 'name'],
				options: {
					skip,
					take: SKILL_WORKFLOW_MENTION_PAGE_SIZE,
					sortBy: 'updatedAt:desc',
					includeScopes: false,
				},
			});
			if (request !== latestRequest) return;
			const mentions = page.map(({ id, name }) => ({ workflowId: id, name }));
			workflows.value = skip === 0 ? mentions : [...workflows.value, ...mentions];
			hasMore.value = page.length === SKILL_WORKFLOW_MENTION_PAGE_SIZE;
		} catch {
			if (request !== latestRequest) return;
			hasError.value = true;
			hasMore.value = false;
		} finally {
			if (request === latestRequest) isLoading.value = false;
		}
	}

	async function search(query: string) {
		currentQuery = query.trim();
		workflows.value = [];
		await loadPage(0);
	}

	async function loadMore() {
		await loadPage(workflows.value.length);
	}

	return { workflows, isLoading, hasMore, hasError, search, loadMore };
}
