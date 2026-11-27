import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentSkill } from '@/features/agents/types';
import { useSkillWorkflowMentionNames } from '@/features/agents/composables/useSkillWorkflowMentionNames';

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

	it('asks for at most 50 workflows in one request', async () => {
		const mentions = Array.from({ length: 51 }, (_, index) => `[Old](n8n://workflow/wf${index})`);
		searchWorkflows.mockImplementation(async ({ ids }: { ids: string[] }) =>
			ids.map((id) => ({ id, name: 'New' })),
		);
		const { refreshWorkflowMentionNames } = useSkillWorkflowMentionNames();

		const refreshed = await refreshWorkflowMentionNames({
			...SKILL,
			instructions: mentions.join(' '),
			references: undefined,
		});

		expect(searchWorkflows.mock.calls.map(([{ ids }]) => ids.length)).toEqual([50, 1]);
		expect(refreshed.instructions).not.toContain('[Old]');
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
