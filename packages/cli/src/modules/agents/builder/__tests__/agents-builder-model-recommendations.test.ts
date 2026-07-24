import type { ProviderCatalog } from '@n8n/agents';

import { buildModelRecommendationsSection } from '../agents-builder-model-recommendations';
import { buildBuilderPrompt } from '../agents-builder-prompts';
import { getBuilderRuntimeSkills } from '../skills';

const catalog: ProviderCatalog = {
	anthropic: {
		id: 'anthropic',
		name: 'Anthropic',
		models: {
			'claude-3-haiku': {
				id: 'claude-3-haiku',
				name: 'Claude 3 Haiku',
				releaseDate: '2024-03-07',
				reasoning: false,
				toolCall: true,
			},
			'claude-sonnet-4-6': {
				id: 'claude-sonnet-4-6',
				name: 'Claude Sonnet 4.6',
				releaseDate: '2026-02-11',
				reasoning: true,
				toolCall: true,
				limits: { context: 200_000 },
			},
			'claude-opus-4-7': {
				id: 'claude-opus-4-7',
				name: 'Claude Opus 4.7',
				releaseDate: '2026-04-20',
				reasoning: true,
				toolCall: true,
				limits: { context: 200_000 },
			},
		},
	},
	openai: {
		id: 'openai',
		name: 'OpenAI',
		models: {
			'text-embedding-3-large': {
				id: 'text-embedding-3-large',
				name: 'Text Embedding 3 Large',
				releaseDate: '2026-05-01',
				reasoning: false,
				toolCall: false,
			},
			'gpt-4.1': {
				id: 'gpt-4.1',
				name: 'GPT-4.1',
				releaseDate: '2025-04-14',
				reasoning: false,
				toolCall: true,
			},
			'gpt-5': {
				id: 'gpt-5',
				name: 'GPT-5',
				releaseDate: '2025-08-07',
				reasoning: true,
				toolCall: true,
			},
		},
	},
	google: {
		id: 'google',
		name: 'Google',
		models: {
			'gemini-2.0-flash': {
				id: 'gemini-2.0-flash',
				name: 'Gemini 2.0 Flash',
				releaseDate: '2025-02-05',
				reasoning: false,
				toolCall: true,
			},
			'gemini-2.5-pro': {
				id: 'gemini-2.5-pro',
				name: 'Gemini 2.5 Pro',
				releaseDate: '2025-06-17',
				reasoning: true,
				toolCall: true,
			},
		},
	},
};

function buildPrompt(modelRecommendationsSection: string | null) {
	return buildBuilderPrompt({
		agentPreviewPath: '/projects/project-1/agents/agent-1/preview',
		modelRecommendationsSection,
	});
}

describe('builder model recommendations', () => {
	it('formats the latest tool-capable model ids from the provider catalog', () => {
		const section = buildModelRecommendationsSection(catalog);

		expect(section).toContain('### Recommended LLM Models');
		expect(section).toContain('newest release_date first');
		expect(section).toMatch(
			/`anthropic\/claude-opus-4-7` Claude Opus 4\.7 .*`anthropic\/claude-sonnet-4-6` Claude Sonnet 4\.6/,
		);
		expect(section).toContain('released 2026-04-20');
		expect(section).toContain('`anthropic/claude-sonnet-4-6` Claude Sonnet 4.6');
		expect(section).toContain('`openai/gpt-5` GPT-5');
		expect(section).toContain('`google/gemini-2.5-pro` Gemini 2.5 Pro');
		expect(section).not.toContain('text-embedding-3-large');
	});

	it('injects always-needed builder guidance into the base builder prompt', () => {
		const prompt = buildPrompt(null);

		expect(prompt).toContain('## Config Mutation Guidance');
		expect(prompt).toContain('## LLM Selection Guidance');
		expect(prompt).toContain('## Memory Guidance');
		expect(prompt).toContain('## Tool Guidance');
		expect(prompt).toContain('## Interactive tools');
		expect(prompt).toContain('## Config Freshness');
		expect(prompt).toContain('## Workflow');
		expect(prompt).toContain('## Example flows');
		expect(prompt).toContain('## Response Style');
		expect(prompt).not.toContain('## Builder runtime skills');
		expect(prompt).toContain('agent-builder-external-services');
		expect(prompt).toContain('agent-builder-memory');
		expect(prompt).toContain('agent-builder-custom-tools');
		expect(prompt).not.toContain('agent-builder-config-mutation');
		expect(prompt).not.toContain('agent-builder-llm-selection');

		const externalServicesSkill = getBuilderRuntimeSkills().find(
			(s) => s.id === 'agent-builder-external-services',
		);
		expect(externalServicesSkill?.instructions).toContain('agent-builder-resource-locators');
	});

	it('routes subagent delegation to the sub-agent builder skill', () => {
		const prompt = buildPrompt(null);
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-sub-agents');

		expect(prompt).not.toContain('`delegate_subagent`');
		expect(prompt).not.toContain('Use `list_sub_agents` to discover published same-project agents');
		expect(skill).toBeDefined();
		expect(skill?.instructions).toContain('`delegate_subagent`');
	});

	it('tells the builder to preserve fallback web search on model switches', () => {
		const prompt = buildPrompt(null);

		expect(prompt).toContain(
			'When changing models, preserve existing Brave or SearXNG\n  `config.webSearch` unchanged',
		);
		expect(prompt).toContain(
			'Only OpenAI and Anthropic models support native web search. Use native web\n  search by default for those providers only',
		);
		expect(prompt).toContain('For every provider other than OpenAI or Anthropic');
		expect(prompt).toContain(
			'Model-only changes must preserve existing Brave or SearXNG `config.webSearch`.',
		);
	});

	it('defers custom tool builder guidance to the agent-builder-custom-tools skill', () => {
		const prompt = buildPrompt(null);
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-custom-tools');

		expect(prompt).not.toContain("import { Tool } from '@n8n/agents';");
		expect(prompt).not.toContain('Custom handlers run in a V8 isolate');
		expect(prompt).toContain('agent-builder-custom-tools');

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

	it('injects the recommendation section only into the LLM selection prompt', () => {
		const section = buildModelRecommendationsSection(catalog);

		expect(buildPrompt(section)).toContain('### Recommended LLM Models');
		expect(buildPrompt(section)).toContain('`openai/gpt-5` GPT-5');
		expect(buildPrompt(null)).not.toContain('### Recommended LLM Models');
		expect(buildPrompt(null)).toContain('do not recommend or name');
	});

	it('keeps always-on interaction and workflow guidance in the main prompt, deferring expressions to a skill', () => {
		const prompt = buildPrompt('### Recommended LLM Models\n\n- OpenAI: `openai/gpt-5` GPT-5');
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-external-services');

		expect(prompt).toContain('### Recommended LLM Models');
		expect(prompt).toContain('Never call two interactive tools in parallel');
		expect(prompt).not.toContain('$now.toISO()');
		expect(prompt).not.toContain('$today');
		expect(prompt).toContain('## Workflow');
		expect(prompt).toContain(
			'Always call `read_config` first whenever a request touches the config',
		);
		expect(prompt).toContain('## Example flows');

		expect(skill).toBeDefined();
		expect(skill?.instructions).toContain('$fromAI');
		expect(skill?.instructions).toContain('$now.toISO()');
		expect(skill?.instructions).toContain('$today');
		expect(skill?.instructions).toContain('sendAndWait');
		expect(skill?.instructions).toContain('dispatchAndWait');
		expect(skill?.instructions).toContain('requireApproval: true');
	});

	it('registers only optional builder runtime skills', () => {
		const skills = getBuilderRuntimeSkills();
		const skillsById = new Map(skills.map((skill) => [skill.id, skill]));

		expect(skills.map((skill) => skill.id)).toEqual([
			'agent-builder-custom-tools',
			'agent-builder-external-services',
			'agent-builder-memory',
			'agent-builder-resource-locators',
			'agent-builder-sub-agents',
			'agent-builder-target-skills',
			'agent-builder-target-tasks',
		]);
		expect(skillsById.has('agent-builder-research')).toBe(false);

		const externalServices = skillsById.get('agent-builder-external-services');
		expect(externalServices?.description).toContain(
			'chat integration/trigger versus an MCP, node, or workflow tool',
		);
		expect(externalServices?.instructions).toContain('Integration vs Callable Tool Decision');
		expect(externalServices?.instructions).toContain('Linear callable tools');

		const resourceLocators = skillsById.get('agent-builder-resource-locators');
		expect(resourceLocators?.description).toContain('stable dynamic selector fields');
		expect(resourceLocators?.instructions).toContain('Linear `teamId`');
		expect(resourceLocators?.instructions).toContain('Do not use `$fromAI`');
	});

	it('does not tell the builder to prefer Slack OAuth credentials for chat integrations', () => {
		const externalServicesSkill = getBuilderRuntimeSkills().find(
			(skill) => skill.id === 'agent-builder-external-services',
		);

		expect(externalServicesSkill?.instructions).not.toContain('slackOAuth2Api');
		expect(externalServicesSkill?.instructions).not.toContain('prefer the OAuth variant');
	});
});
