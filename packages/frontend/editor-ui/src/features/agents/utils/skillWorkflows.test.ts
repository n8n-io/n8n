import { describe, expect, it } from 'vitest';

import type { AgentJsonToolRef, AgentSkill } from '@/features/agents/types';
import { findDirectlyAttachedMentions, findSkillWorkflows } from './skillWorkflows';

function skill(name: string, instructions: string, references: string[] = []): AgentSkill {
	return {
		name,
		description: `${name} description`,
		instructions,
		references: references.map((content, index) => ({ path: `ref-${index}.md`, content })),
	};
}

function workflowTool(workflowId: string, enabled?: boolean): AgentJsonToolRef {
	return {
		type: 'workflow',
		workflow: `Workflow ${workflowId}`,
		workflowId,
		...(enabled === undefined ? {} : { enabled }),
	};
}

describe('findSkillWorkflows', () => {
	it('lists each workflow that a skill mentions in its instructions and references', () => {
		const skills = [
			{
				id: 'skill-1',
				skill: skill('Weekly ops', 'Run [Report](n8n://workflow/wf1).', [
					'Then [Notify](n8n://workflow/wf2).',
				]),
			},
		];

		expect(findSkillWorkflows(skills, [])).toEqual([
			{ workflowId: 'wf1', name: 'Report', skillId: 'skill-1', skillName: 'Weekly ops' },
			{ workflowId: 'wf2', name: 'Notify', skillId: 'skill-1', skillName: 'Weekly ops' },
		]);
	});

	it('gives two skills that mention the same workflow one entry, from the first skill', () => {
		const skills = [
			{ id: 'skill-1', skill: skill('First', '[Report](n8n://workflow/wf1)') },
			{ id: 'skill-2', skill: skill('Second', '[Weekly report](n8n://workflow/wf1)') },
		];

		expect(findSkillWorkflows(skills, [])).toEqual([
			{ workflowId: 'wf1', name: 'Report', skillId: 'skill-1', skillName: 'First' },
		]);
	});

	it('leaves out a workflow that is attached directly, also when the direct tool is deactivated', () => {
		const skills = [
			{
				id: 'skill-1',
				skill: skill('Skill', '[One](n8n://workflow/wf1) [Two](n8n://workflow/wf2)'),
			},
		];

		expect(findSkillWorkflows(skills, [workflowTool('wf1', false)])).toEqual([
			expect.objectContaining({ workflowId: 'wf2' }),
		]);
	});

	it('leaves out a workflow that a name-only direct tool attaches by its current name', () => {
		const skills = [
			{
				id: 'skill-1',
				skill: skill('Skill', '[Old name](n8n://workflow/wf1) [Two](n8n://workflow/wf2)'),
			},
		];
		const nameOnlyTool: AgentJsonToolRef = { type: 'workflow', workflow: 'Get code' };
		const workflowName = (workflowId: string) => (workflowId === 'wf1' ? 'Get code' : undefined);

		expect(findSkillWorkflows(skills, [nameOnlyTool])).toHaveLength(2);
		expect(findSkillWorkflows(skills, [nameOnlyTool], workflowName)).toEqual([
			expect.objectContaining({ workflowId: 'wf2' }),
		]);
	});

	it('skips skill text that is not a string', () => {
		const malformed = {
			name: 'Malformed',
			description: 'Stored in node parameters',
			references: 'not a list',
		} as unknown as AgentSkill;
		const badReference = {
			...skill('Bad reference', '[One](n8n://workflow/wf1)'),
			references: [{ path: 'references/a.md' }],
		} as unknown as AgentSkill;

		expect(
			findSkillWorkflows(
				[
					{ id: 'malformed', skill: malformed },
					{ id: 'bad-reference', skill: badReference },
				],
				[],
			),
		).toEqual([expect.objectContaining({ workflowId: 'wf1', skillId: 'bad-reference' })]);
	});
});

describe('findDirectlyAttachedMentions', () => {
	it('lists the mentions of a skill that are attached directly', () => {
		const weeklyOps = skill('Weekly ops', '[One](n8n://workflow/wf1) [Two](n8n://workflow/wf2)');

		expect(findDirectlyAttachedMentions(weeklyOps, [workflowTool('wf2')])).toEqual([
			{ workflowId: 'wf2', name: 'Two' },
		]);
	});
});
