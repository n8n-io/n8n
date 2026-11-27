import type { SkillWorkflowMention } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { ref, toValue, type MaybeRefOrGetter } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

export const SKILL_WORKFLOW_MENTION_PAGE_SIZE = 20;

export function useSkillWorkflowMentionSearch(projectId: MaybeRefOrGetter<string | undefined>) {
	const workflowsListStore = useWorkflowsListStore();
	const { invalidate, next } = useLatestFetch();
	const workflows = ref<SkillWorkflowMention[]>([]);
	const query = ref('');
	const isLoading = ref(false);
	const hasMore = ref(false);
	const hasError = ref(false);

	async function loadPage(skip: number) {
		const isLatest = next();
		isLoading.value = true;
		hasError.value = false;
		try {
			const scopeProjectId = toValue(projectId);
			const page = await workflowsListStore.searchWorkflows({
				projectId: scopeProjectId,
				excludePersonalProjectsOfOthers: scopeProjectId ? undefined : true,
				query: query.value || undefined,
				isArchived: false,
				select: ['id', 'name', 'updatedAt'],
				options: {
					skip,
					take: SKILL_WORKFLOW_MENTION_PAGE_SIZE,
					sortBy: 'updatedAt:desc',
					includeScopes: false,
				},
			});
			if (!isLatest()) return;
			const mentions = page.map(({ id, name }) => ({ workflowId: id, name }));
			workflows.value = skip === 0 ? mentions : [...workflows.value, ...mentions];
			hasMore.value = page.length === SKILL_WORKFLOW_MENTION_PAGE_SIZE;
		} catch {
			if (!isLatest()) return;
			hasError.value = true;
			if (skip === 0) hasMore.value = false;
		} finally {
			if (isLatest()) isLoading.value = false;
		}
	}

	function startNewSearch() {
		invalidate();
		workflows.value = [];
		hasMore.value = false;
		hasError.value = false;
		isLoading.value = true;
	}

	async function search(term: string) {
		query.value = term.trim();
		workflows.value = [];
		await loadPage(0);
	}

	async function loadMore() {
		await loadPage(workflows.value.length);
	}

	return { workflows, query, isLoading, hasMore, hasError, startNewSearch, search, loadMore };
}
