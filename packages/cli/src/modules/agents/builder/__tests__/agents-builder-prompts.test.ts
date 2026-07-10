import { SUB_AGENT_MAX_CHILDREN_MAX, SUB_AGENT_MAX_CHILDREN_MIN } from '@n8n/api-types';

import { getBuilderRuntimeSkills } from '../skills';

describe('agents builder integrations prompt', () => {
	it('does not tell the builder to prefer Slack OAuth credentials for chat integrations', () => {
		const integrationsSkill = getBuilderRuntimeSkills().find(
			(skill) => skill.id === 'agent-builder-integrations',
		);

		expect(integrationsSkill?.instructions).not.toContain('slackOAuth2Api');
		expect(integrationsSkill?.instructions).not.toContain('prefer the OAuth variant');
	});
});

describe('MCP skill availability', () => {
	it('includes the MCP skill', () => {
		const skills = getBuilderRuntimeSkills();
		expect(skills.find((s) => s.id === 'agent-builder-mcp')).toBeDefined();
	});
});

describe('resource locator skill availability', () => {
	it('includes builder guidance for node dynamic selectors', () => {
		const skills = getBuilderRuntimeSkills();
		const skill = skills.find((s) => s.id === 'agent-builder-resource-locators');

		expect(skill).toBeDefined();
		expect(skill?.description).toContain('write_config/patch_config rejects $fromAI');
		expect(skill?.instructions).toContain('Linear `teamId`');
		expect(skill?.instructions).toContain('get_resource_locator_options');
		expect(skill?.instructions).toContain('parameterValue');
	});
});

describe('sub-agent skill availability', () => {
	it('contains the moved sub-agent delegation guidance', () => {
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-sub-agents');

		expect(skill).toBeDefined();
		expect(skill?.instructions).toContain('`delegate_subagent`');
		expect(skill?.instructions).toContain('Call `list_sub_agents`');
		expect(skill?.instructions).toContain('`allowMultiple: true`');
		expect(skill?.instructions).toContain('subAgentId: "inline"');
		expect(skill?.instructions).toContain('`subAgents.maxChildren`');
		expect(skill?.instructions).toContain(
			'{ "agentId": "<returned-agent-id>", "useWhen": "Use for ..." }',
		);
		expect(skill?.instructions).toContain(
			'If it is unclear when a selected saved subagent should be used, ask the user',
		);
		expect(skill?.instructions).toContain('Do not write vague values');
		expect(skill?.instructions).toContain(
			`from ${SUB_AGENT_MAX_CHILDREN_MIN} to ${SUB_AGENT_MAX_CHILDREN_MAX}`,
		);
	});
});
