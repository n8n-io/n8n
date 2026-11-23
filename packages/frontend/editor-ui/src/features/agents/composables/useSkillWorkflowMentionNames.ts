import { parseSkillWorkflowMentions, renameSkillWorkflowMentions } from '@n8n/api-types';
import isEqual from 'lodash/isEqual';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { AgentSkill } from '../types';

function mentionedWorkflowIds(skill: AgentSkill): string[] {
	const texts = [skill.instructions, ...(skill.references ?? []).map(({ content }) => content)];
	const ids = texts.flatMap((text) =>
		parseSkillWorkflowMentions(text).map(({ workflowId }) => workflowId),
	);
	return [...new Set(ids)];
}

export function useSkillWorkflowMentionNames() {
	const workflowsListStore = useWorkflowsListStore();

	async function fetchNames(workflowIds: string[]): Promise<Map<string, string> | undefined> {
		try {
			const workflows = await workflowsListStore.searchWorkflows({
				ids: workflowIds,
				select: ['id', 'name'],
				options: { take: workflowIds.length, includeScopes: false },
			});
			return new Map(workflows.map(({ id, name }) => [id, name]));
		} catch {
			return undefined;
		}
	}

	async function refreshWorkflowMentionNames(skill: AgentSkill): Promise<AgentSkill> {
		const workflowIds = mentionedWorkflowIds(skill);
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
