import { AgentJsonConfigSchema } from '@n8n/api-types';

import { buildBuilderPrompt, getSchemaReferenceSection } from '../builder/agents-builder-prompts';
import { getBuilderRuntimeSkills } from '../builder/skills';

const baseConfig = {
	name: 'Test Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Be helpful',
};

function buildPrompt() {
	return buildBuilderPrompt({
		configJson: '(no config yet)',
		configHash: null,
		configUpdatedAt: null,
		toolList: '(none)',
		agentPreviewPath: '/projects/project-1/agents/agent-1/preview',
		modelRecommendationsSection: '## Recommended LLM models\n- `openai/gpt-5` GPT-5',
	});
}

function getRuntimeSkill(skillId: string, modelRecommendationsSection: string | null = null) {
	const skill = getBuilderRuntimeSkills({ modelRecommendationsSection }).find(
		(candidate) => candidate.id === skillId,
	);
	if (!skill) throw new Error(`Expected builder runtime skill ${skillId}`);
	return skill;
}

describe('agents builder prompt', () => {
	it('defines the target agent separately from the builder agent', () => {
		const prompt = buildPrompt();

		expect(prompt).toContain('The target agent is the AI agent you are configuring for the user.');
		expect(prompt).toContain('You are the builder agent, not the target agent.');
	});

	it('keeps detailed builder capabilities out of the base prompt', () => {
		const prompt = buildPrompt();

		expect(prompt).toContain('load_skill');
		expect(prompt).toContain('{ "skillId": "<id>" }');
		expect(prompt).toContain('read_config');
		expect(prompt).toContain('write_config');
		expect(prompt).toContain('patch_config');
		expect(prompt).not.toContain('## Tool types');
		expect(prompt).not.toContain('## Example flows');
		expect(prompt).not.toContain('## Config schema reference');
		expect(prompt).not.toContain('## Recommended LLM models');
		expect(prompt).not.toContain('Custom tools run inside a V8 isolate sandbox');
		expect(prompt).not.toContain('Episodic Memory stores source-backed memories');
	});

	it('defines unique internal runtime skills for detailed builder guidance', () => {
		const skills = getBuilderRuntimeSkills({ modelRecommendationsSection: null });
		const skillIds = skills.map((skill) => skill.id);

		expect(new Set(skillIds).size).toBe(skillIds.length);
		expect(skillIds).toEqual([
			'agent-builder-config-mutation',
			'agent-builder-llm-selection',
			'agent-builder-tools',
			'agent-builder-memory',
			'agent-builder-integrations',
			'agent-builder-target-skills',
			'agent-builder-research',
		]);
	});

	it('moves schema and config mutation guidance into the config skill', () => {
		const configSkill = getRuntimeSkill('agent-builder-config-mutation');

		expect(configSkill.instructions).toContain('Config schema reference');
		expect(configSkill.instructions).toContain('read_config');
		expect(configSkill.instructions).toContain('baseConfigHash');
		expect(configSkill.instructions).toContain('RFC 6902');
		expect(configSkill.instructions).toContain('episodicMemory');
		expect(getSchemaReferenceSection()).toContain('episodicMemory');
		expect(buildPrompt()).not.toContain(getSchemaReferenceSection());
	});

	it('only documents memory storage values accepted by the JSON config schema', () => {
		const memorySkill = getRuntimeSkill('agent-builder-memory');

		expect(
			AgentJsonConfigSchema.safeParse({
				...baseConfig,
				memory: { enabled: true, storage: 'n8n' },
			}).success,
		).toBe(true);

		for (const storage of ['sqlite', 'postgres']) {
			expect(
				AgentJsonConfigSchema.safeParse({
					...baseConfig,
					memory: { enabled: true, storage },
				}).success,
			).toBe(false);
			expect(memorySkill.instructions).not.toContain(`| ${storage}`);
		}
		expect(memorySkill.instructions).not.toContain('connection.path');
		expect(memorySkill.instructions).not.toContain('connection.credential');
	});

	it('describes observation-log memory', () => {
		const memorySkill = getRuntimeSkill('agent-builder-memory');

		expect(memorySkill.instructions).toContain('observation log');
		expect(memorySkill.instructions).toContain('renderTokenBudget');
	});

	it('describes episodic memory credential selection', () => {
		const memorySkill = getRuntimeSkill('agent-builder-memory');

		expect(memorySkill.instructions).toContain('Episodic Memory');
		expect(memorySkill.instructions).toContain('memory.episodicMemory');
		expect(memorySkill.instructions).toContain('ask_credential');
		expect(memorySkill.instructions).toContain('openAiApi');
		expect(memorySkill.instructions).toContain('runtime handles memory extraction and indexing');
		expect(memorySkill.instructions).toContain('Use recalled prior context');
	});
});
