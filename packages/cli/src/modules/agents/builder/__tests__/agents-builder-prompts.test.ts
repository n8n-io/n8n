import { getBuilderSkillRoutingSection } from '../agents-builder-prompts';
import { getBuilderRuntimeSkills } from '../skills';

describe('agents builder integrations prompt', () => {
	it('does not tell the builder to prefer Slack OAuth credentials for chat integrations', () => {
		const integrationsSkill = getBuilderRuntimeSkills({ modelRecommendationsSection: null }).find(
			(skill) => skill.id === 'agent-builder-integrations',
		);

		expect(integrationsSkill?.instructions).not.toContain('slackOAuth2Api');
		expect(integrationsSkill?.instructions).not.toContain('prefer the OAuth variant');
	});
});

describe('MCP skill gating', () => {
	it('does not include the MCP skill when the "mcp" module is disabled', () => {
		const skills = getBuilderRuntimeSkills({
			modelRecommendationsSection: null,
			enabledModules: [],
		});
		expect(skills.find((s) => s.id === 'agent-builder-mcp')).toBeUndefined();
	});

	it('includes the MCP skill when the "mcp" module is enabled', () => {
		const skills = getBuilderRuntimeSkills({
			modelRecommendationsSection: null,
			enabledModules: ['mcp'],
		});
		expect(skills.find((s) => s.id === 'agent-builder-mcp')).toBeDefined();
	});

	it('omits the MCP skill from the routing section when the module is disabled', () => {
		const section = getBuilderSkillRoutingSection([]);
		expect(section).not.toContain('agent-builder-mcp');
	});

	it('lists the MCP skill in the routing section when the module is enabled', () => {
		const section = getBuilderSkillRoutingSection(['mcp']);
		expect(section).toContain('agent-builder-mcp');
	});
});
