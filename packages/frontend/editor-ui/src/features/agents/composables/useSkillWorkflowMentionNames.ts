import { parseAgentSkillWorkflowMentions, renameSkillWorkflowMentions } from '@n8n/api-types';
import chunk from 'lodash/chunk';
import isEqual from 'lodash/isEqual';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { AgentSkill } from '@/features/agents/types';

const WORKFLOW_IDS_PER_REQUEST = 50;

export function useSkillWorkflowMentionNames() {
	const workflowsListStore = useWorkflowsListStore();

	async function fetchNames(workflowIds: string[]): Promise<Map<string, string> | undefined> {
		try {
			const batches = await Promise.all(
				chunk(workflowIds, WORKFLOW_IDS_PER_REQUEST).map(
					async (ids) =>
						await workflowsListStore.searchWorkflows({
							ids,
							select: ['id', 'name'],
							options: { take: ids.length, includeScopes: false },
						}),
				),
			);
			return new Map(batches.flat().map(({ id, name }) => [id, name]));
		} catch {
			return undefined;
		}
	}

	async function refreshWorkflowMentionNames(skill: AgentSkill): Promise<AgentSkill> {
		const workflowIds = parseAgentSkillWorkflowMentions(skill).map(({ workflowId }) => workflowId);
		if (workflowIds.length === 0) return skill;

		const namesByWorkflowId = await fetchNames(workflowIds);
		if (!namesByWorkflowId) return skill;

		const renamed: AgentSkill = {
			...skill,
			instructions: renameSkillWorkflowMentions(skill.instructions, namesByWorkflowId),
			...(skill.references
				? {
						references: skill.references.map((reference) => ({
							...reference,
							content: renameSkillWorkflowMentions(reference.content, namesByWorkflowId),
						})),
					}
				: {}),
		};
		return isEqual(renamed, skill) ? skill : renamed;
	}

	return { refreshWorkflowMentionNames };
}
