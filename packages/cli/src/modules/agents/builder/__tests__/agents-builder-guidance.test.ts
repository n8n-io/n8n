import { buildBuilderSessionContext } from '../agent-builder-session-context';
import { getBuilderRuntimeSkills } from '../skills';

describe('builder guidance', () => {
	it('puts the Preview link into the session context', async () => {
		const context = await buildBuilderSessionContext('project-1', 'agent-1');

		expect(context).toContain('[Preview](/projects/project-1/agents/agent-1');
		expect(context).not.toContain('Recommended LLM Models');
	});

	it('routes separate target-agent jobs into skills and keeps a single job in instructions', () => {
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-target-skills');

		expect(skill?.description).toContain('two or more separate jobs');
		expect(skill?.description).toContain('not for an agent with one job');
		expect(skill?.recommendedTools).toEqual(
			expect.arrayContaining([
				'agent-context',
				'agent_builder_update_skill',
				'agent_builder_create_skills',
			]),
		);
		expect(skill?.allowedTools).toEqual(
			expect.arrayContaining([
				'agent-context',
				'agent_builder_update_skill',
				'agent_builder_create_skills',
			]),
		);
		expect(skill?.instructions).toContain(
			'Call `agent-context({ type: "skills" })` once and compare its metadata with the attached ids',
		);
		expect(skill?.instructions).toContain('preserving its id and existing config reference');
		expect(skill?.instructions).toContain(
			'Only call `agent_builder_create_skills` when no attached skill owns the capability',
		);

		const listIndex = skill?.instructions.indexOf('Call `agent-context({ type: "skills" })`') ?? -1;
		const readIndex =
			skill?.instructions.indexOf('Call `agent-context({ type: "skill", skillId: "<id>" })`') ?? -1;
		const updateIndex = skill?.instructions.indexOf('Call `agent_builder_update_skill`') ?? -1;
		expect(listIndex).toBeGreaterThan(-1);
		expect(readIndex).toBeGreaterThan(listIndex);
		expect(updateIndex).toBeGreaterThan(readIndex);
	});

	it('tells the builder to preserve fallback web search on model-only changes', () => {
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-config');

		expect(skill?.instructions).toContain(
			'Model-only changes must preserve existing Brave or SearXNG `config.webSearch`.',
		);
		expect(skill?.instructions).toContain('#### Config Schema Reference');
	});

	it('defers custom tool builder guidance to the agent-builder-custom-tools skill', () => {
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-custom-tools');

		expect(skill).toBeDefined();
		expect(skill?.instructions).toContain("import { Tool } from '@n8n/agents';");
		expect(skill?.instructions).toContain("export default new Tool('tool_name')");
		expect(skill?.instructions).toContain('Custom handlers run in a V8 isolate');
		expect(skill?.instructions).toContain('No network, filesystem, process, Buffer, fetch, timers');
		expect(skill?.instructions).toContain('ctx.suspend(payload)');
		expect(skill?.instructions).toContain(
			'Execution is capped at 5 seconds and about 32 MB memory',
		);
	});

	it('does not tell the builder to prefer Slack OAuth credentials for chat integrations', () => {
		const externalServicesSkill = getBuilderRuntimeSkills().find(
			(skill) => skill.id === 'agent-builder-external-services',
		);

		expect(externalServicesSkill?.instructions).not.toContain('slackOAuth2Api');
		expect(externalServicesSkill?.instructions).not.toContain('prefer the OAuth variant');
	});
});
