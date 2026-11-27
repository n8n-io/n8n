import { buildBuilderSessionContext } from '../agent-builder-session-context';
import { getBuilderRuntimeSkills } from '../skills';

describe('builder guidance', () => {
	it('puts the Preview link into the session context', () => {
		const context = buildBuilderSessionContext('project-1', 'agent-1');

		expect(context).toContain('[Preview](/projects/project-1/agents/agent-1');
		expect(context).not.toContain('Recommended LLM Models');
	});

	it('gives the target-skills skill the tools it needs to list, read, and change skills', () => {
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-target-skills');
		const skillTools = [
			'agent-context',
			'skills',
			'agent_builder_update_skill',
			'agent_builder_create_skills',
		];

		expect(skill?.recommendedToolGroups).toEqual(['agents']);
		expect(skill?.allowedTools).toEqual(expect.arrayContaining(skillTools));
		expect(skill?.description).toContain('attaching an existing skill without edits');
		expect(skill?.instructions).toContain('attachableToAgentId');
		expect(skill?.instructions).toContain('every existing ref from the latest config');
	});

	it('tells the config skill to search attachable skills before creating new ones', () => {
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-config');

		expect(skill?.instructions).toContain('attachableToAgentId');
		expect(skill?.instructions).toContain('every existing ref from the latest');
		expect(skill?.instructions).toContain('replaces the stored list');
	});

	it('tells the builder to preserve fallback web search on model-only changes', () => {
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-config');

		expect(skill?.instructions).toContain(
			'Model-only changes must preserve existing Brave or SearXNG `config.webSearch`.',
		);
	});

	it('provides the agent-builder-custom-tools skill', () => {
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-custom-tools');

		expect(skill?.instructions).toBeTruthy();
	});
});
