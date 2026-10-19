import { useEventListener } from '@vueuse/core';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

import type { WorkflowArtifactReference } from '../assistantAtMentions.types';

export function useAssistantMentionAvailability(options: {
	enabled: MaybeRefOrGetter<boolean>;
	projectId: MaybeRefOrGetter<string | undefined>;
	artifacts: MaybeRefOrGetter<readonly WorkflowArtifactReference[]>;
}) {
	const workflowsListStore = useWorkflowsListStore();
	const hasSavedWorkflow = ref(false);
	const isLoading = ref(false);
	let requestGeneration = 0;

	const hasArtifacts = computed(() => toValue(options.artifacts).length > 0);
	const isAvailable = computed(
		() => toValue(options.enabled) && (hasArtifacts.value || hasSavedWorkflow.value),
	);

	async function refresh({ reset = false }: { reset?: boolean } = {}): Promise<void> {
		const generation = ++requestGeneration;
		const enabled = toValue(options.enabled);
		const projectId = toValue(options.projectId)?.trim();
		if (!enabled || !projectId) {
			hasSavedWorkflow.value = false;
			isLoading.value = false;
			return;
		}
		if (hasArtifacts.value) {
			hasSavedWorkflow.value = false;
			isLoading.value = false;
			return;
		}
		if (reset) hasSavedWorkflow.value = false;

		isLoading.value = true;
		try {
			const workflows = await workflowsListStore.searchWorkflows({
				projectId,
				isArchived: false,
				select: ['id', 'updatedAt'],
				options: { take: 1, skip: 0, sortBy: 'updatedAt:asc', includeScopes: false },
			});
			if (generation === requestGeneration) hasSavedWorkflow.value = workflows.length > 0;
		} catch {
			if (reset && generation === requestGeneration) hasSavedWorkflow.value = false;
		} finally {
			if (generation === requestGeneration) isLoading.value = false;
		}
	}

	watch(
		[() => toValue(options.enabled), () => toValue(options.projectId), hasArtifacts],
		async () => await refresh({ reset: true }),
		{ immediate: true },
	);
	useEventListener(window, 'focus', async () => await refresh());

	return { isAvailable, isLoading, refresh };
}
