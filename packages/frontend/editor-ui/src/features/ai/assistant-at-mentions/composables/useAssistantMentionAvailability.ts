import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useEventListener } from '@vueuse/core';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { listAgentsPage } from '@/features/agents/composables/useAgentApi';

import type { WorkflowArtifactReference } from '../assistantAtMentions.types';

export function useAssistantMentionAvailability(options: {
	enabled: MaybeRefOrGetter<boolean>;
	projectId: MaybeRefOrGetter<string | undefined>;
	artifacts: MaybeRefOrGetter<readonly WorkflowArtifactReference[]>;
}) {
	const workflowsListStore = useWorkflowsListStore();
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	/** The project has a saved workflow, or an agent when agents are on. */
	const hasSavedResource = ref(false);
	const isLoading = ref(false);
	let requestGeneration = 0;

	const hasArtifacts = computed(() => toValue(options.artifacts).length > 0);
	const isAvailable = computed(
		() => toValue(options.enabled) && (hasArtifacts.value || hasSavedResource.value),
	);

	async function hasAgent(projectId: string): Promise<boolean> {
		if (!settingsStore.isAgentsEnabled) return false;
		const { count } = await listAgentsPage(rootStore.restApiContext, projectId, { limit: 1 });
		return count > 0;
	}

	async function refresh({ reset = false }: { reset?: boolean } = {}): Promise<void> {
		const generation = ++requestGeneration;
		const enabled = toValue(options.enabled);
		const projectId = toValue(options.projectId)?.trim();
		if (!enabled || !projectId) {
			hasSavedResource.value = false;
			isLoading.value = false;
			return;
		}
		if (hasArtifacts.value) {
			hasSavedResource.value = false;
			isLoading.value = false;
			return;
		}
		if (reset) hasSavedResource.value = false;

		isLoading.value = true;
		try {
			const workflows = await workflowsListStore.searchWorkflows({
				projectId,
				isArchived: false,
				select: ['id', 'updatedAt'],
				options: { take: 1, skip: 0, sortBy: 'updatedAt:asc', includeScopes: false },
			});
			const hasResource = workflows.length > 0 || (await hasAgent(projectId));
			if (generation === requestGeneration) hasSavedResource.value = hasResource;
		} catch {
			if (reset && generation === requestGeneration) hasSavedResource.value = false;
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
