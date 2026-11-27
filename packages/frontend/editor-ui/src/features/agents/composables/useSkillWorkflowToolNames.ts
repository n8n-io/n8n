import chunk from 'lodash/chunk';
import { ref, watch, type Ref } from 'vue';

import { WORKFLOWS_IN_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

const SKILL_WORKFLOW_TOOL_NAME = /^workflow_([A-Za-z0-9_-]+)$/;
const WORKFLOW_IDS_PER_REQUEST = 50;

type WorkflowNameCache = {
	names: Ref<Map<string, string>>;
	requested: Set<string>;
};

const chatWorkflowNames: WorkflowNameCache = { names: ref(new Map()), requested: new Set() };

function skillWorkflowIdOfTool(toolName: string): string | undefined {
	return SKILL_WORKFLOW_TOOL_NAME.exec(toolName)?.[1];
}

function useWorkflowNameLookup(workflowIds: () => string[], cache: WorkflowNameCache) {
	const posthogStore = usePostHog();
	const workflowsListStore = useWorkflowsListStore();

	async function fetchBatch(ids: string[]) {
		try {
			return await workflowsListStore.searchWorkflows({
				ids,
				select: ['id', 'name'],
				options: { take: ids.length, includeScopes: false },
			});
		} catch {
			for (const id of ids) cache.requested.delete(id);
			return [];
		}
	}

	async function fetchNames(ids: string[]) {
		for (const id of ids) cache.requested.add(id);
		const batches = await Promise.all(chunk(ids, WORKFLOW_IDS_PER_REQUEST).map(fetchBatch));
		cache.names.value = new Map([
			...cache.names.value,
			...batches.flat().map(({ id, name }): [string, string] => [id, name]),
		]);
	}

	watch(
		() =>
			posthogStore.isVariantEnabled(
				WORKFLOWS_IN_SKILLS_EXPERIMENT.name,
				WORKFLOWS_IN_SKILLS_EXPERIMENT.variant,
			)
				? [...new Set(workflowIds())].filter((id) => !cache.requested.has(id))
				: [],
		(ids) => {
			if (ids.length > 0) void fetchNames(ids);
		},
		{ immediate: true },
	);

	return (workflowId: string) => cache.names.value.get(workflowId);
}

export function useSkillWorkflowNames(workflowIds: () => string[]) {
	const workflowName = useWorkflowNameLookup(workflowIds, {
		names: ref(new Map()),
		requested: new Set(),
	});
	return { workflowName };
}

export function useSkillWorkflowToolNames(toolNames: () => string[]) {
	const workflowName = useWorkflowNameLookup(
		() =>
			toolNames()
				.map(skillWorkflowIdOfTool)
				.filter((id): id is string => id !== undefined),
		chatWorkflowNames,
	);

	function skillWorkflowName(toolName: string): string | undefined {
		const workflowId = skillWorkflowIdOfTool(toolName);
		return workflowId ? workflowName(workflowId) : undefined;
	}

	return { skillWorkflowName };
}
