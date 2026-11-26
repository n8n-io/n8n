import type { AgentJsonConfig, AgentJsonToolConfig, AgentSkill } from '@n8n/api-types';

import { findSkillWorkflowTools, withSkillWorkflowTools } from '../skill-workflow-tools';

function skill(name: string, instructions: string, references: string[] = []): AgentSkill {
	return {
		name,
		description: `${name} description`,
		instructions,
		references: references.map((content, index) => ({ path: `ref-${index}.md`, content })),
	};
}

function config(skillIds: string[], tools: AgentJsonToolConfig[] = []): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'anthropic/claude-sonnet-5-5',
		instructions: 'Be helpful',
		tools,
		skills: skillIds.map((id) => ({ type: 'skill', id })),
	};
}

describe('withSkillWorkflowTools', () => {
	it('adds one workflow tool for each workflow that a skill mentions', () => {
		const skills = {
			'skill-1': skill('Lucky code', 'Call [Get code](n8n://workflow/wf1) and reply.'),
		};

		const result = withSkillWorkflowTools(config(['skill-1']), skills);

		expect(result.tools).toEqual([
			{
				type: 'workflow',
				workflowId: 'wf1',
				workflow: 'Get code',
				name: 'workflow_wf1',
				description:
					'Run the workflow "Get code" that the skill "Lucky code" mentions. Workflow ID: wf1.',
			},
		]);
	});

	it('reads mentions in the references of a skill', () => {
		const skills = {
			'skill-1': skill('Skill', 'See the reference.', ['Then call [Report](n8n://workflow/wf2).']),
		};

		const result = withSkillWorkflowTools(config(['skill-1']), skills);

		expect(result.tools?.map((tool) => tool.type === 'workflow' && tool.workflowId)).toEqual([
			'wf2',
		]);
	});

	it('gives two skills that mention the same workflow one tool', () => {
		const skills = {
			'skill-1': skill('First', '[Get code](n8n://workflow/wf1)'),
			'skill-2': skill('Second', '[Code](n8n://workflow/wf1) and [Other](n8n://workflow/wf2)'),
		};

		const result = withSkillWorkflowTools(config(['skill-1', 'skill-2']), skills);

		expect(result.tools).toEqual([
			expect.objectContaining({ workflowId: 'wf1', name: 'workflow_wf1', workflow: 'Get code' }),
			expect.objectContaining({ workflowId: 'wf2', name: 'workflow_wf2', workflow: 'Other' }),
		]);
	});

	it('keeps the direct tool of a mentioned workflow and adds the workflow ID to its description', () => {
		const direct: AgentJsonToolConfig = {
			type: 'workflow',
			workflowId: 'wf1',
			workflow: 'Get code',
			name: 'fetch_code',
			description: 'Fetch the code.',
			requireApproval: true,
		};
		const skills = { 'skill-1': skill('Skill', '[Get code](n8n://workflow/wf1)') };

		const result = withSkillWorkflowTools(config(['skill-1'], [direct]), skills);

		expect(result.tools).toEqual([{ ...direct, description: 'Fetch the code. Workflow ID: wf1.' }]);
	});

	it('adds the workflow ID to the default description of a direct tool', () => {
		const direct: AgentJsonToolConfig = {
			type: 'workflow',
			workflowId: 'wf1',
			workflow: 'Get code',
		};
		const skills = { 'skill-1': skill('Skill', '[Get code](n8n://workflow/wf1)') };

		const result = withSkillWorkflowTools(config(['skill-1'], [direct]), skills);

		expect(result.tools).toEqual([
			{ ...direct, description: 'Execute the "Get code" workflow. Workflow ID: wf1.' },
		]);
	});

	it('matches a legacy direct tool by its resolved workflow ID', () => {
		const direct: AgentJsonToolConfig = { type: 'workflow', workflow: 'Get code' };
		const skills = { 'skill-1': skill('Skill', '[Get code](n8n://workflow/wf1)') };

		const result = withSkillWorkflowTools(
			config(['skill-1'], [direct]),
			skills,
			new Map([['Get code', { id: 'wf1' }]]),
		);

		expect(result.tools).toEqual([
			{ ...direct, description: 'Execute the "Get code" workflow. Workflow ID: wf1.' },
		]);
	});

	it('uses the workflow ID as the name when the link text is empty', () => {
		const skills = { 'skill-1': skill('Skill', '[](n8n://workflow/wf1)') };

		const [tool] = withSkillWorkflowTools(config(['skill-1']), skills).tools ?? [];

		expect(tool).toEqual(expect.objectContaining({ workflow: 'wf1', name: 'workflow_wf1' }));
	});

	it('leaves out a skill workflow tool when a configured tool already has its name', () => {
		const direct: AgentJsonToolConfig = {
			type: 'workflow',
			workflowId: 'wf9',
			workflow: 'Other',
			name: 'workflow_B123',
		};
		const skills = { 'skill-1': skill('Skill', '[Get code](n8n://workflow/B123)') };

		const result = withSkillWorkflowTools(config(['skill-1'], [direct]), skills);

		expect(result.tools).toEqual([direct]);
		expect(findSkillWorkflowTools(config(['skill-1'], [direct]), skills)).toEqual([]);
	});

	it('leaves out a skill workflow tool when a custom tool has its name', () => {
		const custom: AgentJsonToolConfig = { type: 'custom', id: 'workflow_B123' };
		const skills = { 'skill-1': skill('Skill', '[Get code](n8n://workflow/B123)') };

		const result = withSkillWorkflowTools(config(['skill-1'], [custom]), skills);

		expect(result.tools).toEqual([custom]);
	});

	it('ignores skills that are not attached or have no body', () => {
		const skills = { 'skill-2': skill('Other', '[Get code](n8n://workflow/wf1)') };
		const input = config(['skill-1']);

		expect(withSkillWorkflowTools(input, skills)).toBe(input);
	});

	it('returns the same config when no skill mentions a workflow', () => {
		const input = config(['skill-1']);

		expect(withSkillWorkflowTools(input, { 'skill-1': skill('Skill', 'No links.') })).toBe(input);
	});
});

describe('findSkillWorkflowTools', () => {
	it('returns the skill of the first mention and leaves out directly attached workflows', () => {
		const direct: AgentJsonToolConfig = {
			type: 'workflow',
			workflowId: 'wf1',
			workflow: 'Get code',
		};
		const skills = {
			'skill-1': skill('First', '[Get code](n8n://workflow/wf1) [Report](n8n://workflow/wf2)'),
			'skill-2': skill('Second', '[Report](n8n://workflow/wf2)'),
		};

		const result = findSkillWorkflowTools(config(['skill-1', 'skill-2'], [direct]), skills);

		expect(result).toEqual([
			{ skillId: 'skill-1', tool: expect.objectContaining({ workflowId: 'wf2' }) },
		]);
	});
});
