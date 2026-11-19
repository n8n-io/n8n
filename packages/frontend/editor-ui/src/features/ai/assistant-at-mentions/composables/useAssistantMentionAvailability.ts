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
		// Each check runs on its own, so a failed workflow request cannot hide the agents.
		const [workflows, agents] = await Promise.allSettled([
			hasWorkflow(projectId),
			hasAgent(projectId),
		]);
		if (generation !== requestGeneration) return;
		const found = [workflows, agents].some(
			(result) => result.status === 'fulfilled' && result.value,
		);
		const failed = [workflows, agents].some((result) => result.status === 'rejected');
		// When a check failed and the other found nothing, keep the last known value.
		if (found || !failed || reset) hasSavedResource.value = found;
		isLoading.value = false;
	}

	async function hasWorkflow(projectId: string): Promise<boolean> {
		const workflows = await workflowsListStore.searchWorkflows({
			projectId,
			isArchived: false,
			select: ['id', 'updatedAt'],
			options: { take: 1, skip: 0, sortBy: 'updatedAt:asc', includeScopes: false },
		});
		return workflows.length > 0;
	}

	watch(
		[() => toValue(options.enabled), () => toValue(options.projectId), hasArtifacts],
		async () => await refresh({ reset: true }),
		{ immediate: true },
	);
	useEventListener(window, 'focus', async () => await refresh());

	return { isAvailable, isLoading, refresh };
}
