import chunk from 'lodash/chunk';
import { ref, watch } from 'vue';

import { WORKFLOWS_IN_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

const SKILL_WORKFLOW_TOOL_NAME = /^workflow_([A-Za-z0-9_-]+)$/;
const WORKFLOW_IDS_PER_REQUEST = 50;

const workflowNameById = ref(new Map<string, string>());
const requestedWorkflowIds = new Set<string>();

function skillWorkflowIdOfTool(toolName: string): string | undefined {
	return SKILL_WORKFLOW_TOOL_NAME.exec(toolName)?.[1];
}

export function useSkillWorkflowToolNames(toolNames: () => string[]) {
	const posthogStore = usePostHog();
	const workflowsListStore = useWorkflowsListStore();

	async function fetchBatch(workflowIds: string[]) {
		try {
			return await workflowsListStore.searchWorkflows({
				ids: workflowIds,
				select: ['id', 'name'],
				options: { take: workflowIds.length, includeScopes: false },
			});
		} catch {
			return [];
		}
	}

	async function fetchNames(workflowIds: string[]) {
		for (const workflowId of workflowIds) requestedWorkflowIds.add(workflowId);
		const batches = await Promise.all(chunk(workflowIds, WORKFLOW_IDS_PER_REQUEST).map(fetchBatch));
		workflowNameById.value = new Map([
			...workflowNameById.value,
			...batches.flat().map(({ id, name }): [string, string] => [id, name]),
		]);
	}

	watch(
		() =>
			posthogStore.isVariantEnabled(
				WORKFLOWS_IN_SKILLS_EXPERIMENT.name,
				WORKFLOWS_IN_SKILLS_EXPERIMENT.variant,
			)
				? [...new Set(toolNames().map(skillWorkflowIdOfTool))].filter(
						(workflowId): workflowId is string =>
							workflowId !== undefined && !requestedWorkflowIds.has(workflowId),
					)
				: [],
		(workflowIds) => {
			if (workflowIds.length > 0) void fetchNames(workflowIds);
		},
		{ immediate: true },
	);

	function skillWorkflowName(toolName: string): string | undefined {
		const workflowId = skillWorkflowIdOfTool(toolName);
		return workflowId ? workflowNameById.value.get(workflowId) : undefined;
	}

	return { skillWorkflowName };
}
