import { buildBuilderPrompt } from '../agents-builder-prompts';
import { getBuilderRuntimeSkills } from '../skills';

function buildPrompt(overrides: { modelRecommendationsSection?: string | null } = {}) {
	return buildBuilderPrompt({
		configJson: '(no config yet)',
		configHash: null,
		configUpdatedAt: null,
		toolList: '(none)',
		agentPreviewPath: '/projects/project-1/agents/agent-1/preview',
		modelRecommendationsSection: overrides.modelRecommendationsSection ?? null,
	});
}

describe('agents builder integrations prompt', () => {
	it('does not tell the builder to prefer Slack OAuth credentials for chat integrations', () => {
		const integrationsSkill = getBuilderRuntimeSkills({ modelRecommendationsSection: null }).find(
			(skill) => skill.id === 'agent-builder-integrations',
		);

		expect(integrationsSkill?.instructions).not.toContain('slackOAuth2Api');
		expect(integrationsSkill?.instructions).not.toContain('prefer the OAuth variant');
	});
});

describe('agents builder prompt guardrails', () => {
	it('keeps always-on interaction, expression, and workflow guidance in the main prompt', () => {
		const prompt = buildPrompt({
			modelRecommendationsSection: '## Recommended LLM models\n\n- OpenAI: `openai/gpt-5` GPT-5',
		});

		expect(prompt).toContain('## Recommended LLM models');
		expect(prompt).toContain('Never call two interactive tools in parallel');
		expect(prompt).toContain('$fromAI');
		expect(prompt).toContain('$now.toISO()');
		expect(prompt).toContain('$today');
		expect(prompt).toContain('## Workflow');
		expect(prompt).toContain('Before every `write_config` or `patch_config`, call `read_config`');
		expect(prompt).toContain('## Example flows');
	});
});
