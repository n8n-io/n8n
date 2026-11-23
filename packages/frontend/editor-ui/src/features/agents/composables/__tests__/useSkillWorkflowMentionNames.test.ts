import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentSkill } from '../../types';
import { useSkillWorkflowMentionNames } from '../useSkillWorkflowMentionNames';

const searchWorkflows = vi.hoisted(() => vi.fn());
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ searchWorkflows }),
}));

const SKILL: AgentSkill = {
	name: 'Report',
	description: 'Send the report',
	instructions: 'Run [Old report](n8n://workflow/wf1) and [Archive](n8n://workflow/wf2).',
	references: [{ path: 'references/steps.md', content: 'Then [Old report](n8n://workflow/wf1).' }],
};

describe('useSkillWorkflowMentionNames', () => {
	beforeEach(() => {
		searchWorkflows.mockReset();
	});

	it('shows the current workflow names in the instructions and references', async () => {
		searchWorkflows.mockResolvedValue([
			{ id: 'wf1', name: 'Weekly report' },
			{ id: 'wf2', name: 'Archive' },
		]);
		const { refreshWorkflowMentionNames } = useSkillWorkflowMentionNames();

		const refreshed = await refreshWorkflowMentionNames(SKILL);

		expect(searchWorkflows).toHaveBeenCalledWith({
			ids: ['wf1', 'wf2'],
			select: ['id', 'name'],
			options: { take: 2, includeScopes: false },
		});
		expect(refreshed).toEqual({
			...SKILL,
			instructions: 'Run [Weekly report](n8n://workflow/wf1) and [Archive](n8n://workflow/wf2).',
			references: [
				{ path: 'references/steps.md', content: 'Then [Weekly report](n8n://workflow/wf1).' },
			],
		});
	});

	it('returns the same skill when no name changed', async () => {
		searchWorkflows.mockResolvedValue([
			{ id: 'wf1', name: 'Old report' },
			{ id: 'wf2', name: 'Archive' },
		]);
		const { refreshWorkflowMentionNames } = useSkillWorkflowMentionNames();

		expect(await refreshWorkflowMentionNames(SKILL)).toBe(SKILL);
	});

	it('keeps the skill when the names cannot load', async () => {
		searchWorkflows.mockRejectedValue(new Error('offline'));
		const { refreshWorkflowMentionNames } = useSkillWorkflowMentionNames();

		expect(await refreshWorkflowMentionNames(SKILL)).toBe(SKILL);
	});

	it('does not call the server for a skill without mentions', async () => {
		const skill = { ...SKILL, instructions: 'No mentions', references: undefined };
		const { refreshWorkflowMentionNames } = useSkillWorkflowMentionNames();

		expect(await refreshWorkflowMentionNames(skill)).toBe(skill);
		expect(searchWorkflows).not.toHaveBeenCalled();
	});
});
