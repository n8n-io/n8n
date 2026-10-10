import type { ProviderCatalog } from '@n8n/agents';

import {
	buildModelRecommendationsSection,
	getModelRecommendationsSection,
	resetModelRecommendationsCacheForTest,
} from '../agents-builder-model-recommendations';
import { buildBuilderPrompt, buildBuilderSessionContext } from '../agents-builder-prompts';
import { getBuilderRuntimeSkills } from '../skills';

const { fetchProviderCatalog } = vi.hoisted(() => ({ fetchProviderCatalog: vi.fn() }));

vi.mock('@n8n/agents/catalog', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents/catalog')>()),
	fetchProviderCatalog,
}));

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

function buildSessionContext(modelRecommendationsSection: string | null) {
	return buildBuilderSessionContext({
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

	it('routes distinct target-agent functions into autonomously managed skills', () => {
		const prompt = buildBuilderPrompt();
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-target-skills');

		expect(prompt).toContain(
			'Keep the target agent instructions lightweight: identity, overall purpose, and rules that apply to every operation',
		);
		expect(prompt).toContain('even when the user never calls it a skill');
		expect(prompt).toContain('create missing skills or update existing ones as part of the build');
		expect(prompt).not.toContain('Infer and create these skills');
		expect(prompt).toContain('creating tickets, reviewing images, and generating reports');
		expect(prompt).not.toContain('create any requested tools, skills, or tasks');

		expect(skill?.description).toContain('designing, creating, or editing target-agent behavior');
		expect(skill?.description).toContain('without calling it a skill');
		expect(skill?.recommendedTools).toEqual(
			expect.arrayContaining(['agent-context', 'update_skill', 'create_skills']),
		);
		expect(skill?.allowedTools).toEqual(
			expect.arrayContaining(['agent-context', 'update_skill', 'create_skills']),
		);
		expect(skill?.instructions).toContain(
			'Call `agent-context({ type: "skills" })` once and compare its metadata with the attached ids',
		);
		expect(skill?.instructions).toContain('preserving its id and existing config reference');
		expect(skill?.instructions).toContain(
			'Only call `create_skills` when no attached skill owns the capability',
		);

		const listIndex = skill?.instructions.indexOf('Call `agent-context({ type: "skills" })`') ?? -1;
		const readIndex =
			skill?.instructions.indexOf('Call `agent-context({ type: "skill", skillId: "<id>" })`') ?? -1;
		const updateIndex = skill?.instructions.indexOf('Call `update_skill`') ?? -1;
		expect(listIndex).toBeGreaterThan(-1);
		expect(readIndex).toBeGreaterThan(listIndex);
		expect(updateIndex).toBeGreaterThan(readIndex);
	});

	it('tells the builder to preserve fallback web search on model switches', () => {
		const prompt = buildBuilderPrompt();

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
		const prompt = buildBuilderPrompt();
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

	it('injects the recommendation section into the session context, not the static prompt', () => {
		const section = buildModelRecommendationsSection(catalog);

		expect(buildSessionContext(section)).toContain('### Recommended LLM Models');
		expect(buildSessionContext(section)).toContain('`openai/gpt-5` GPT-5');
		expect(buildBuilderPrompt()).not.toContain('### Recommended LLM Models');
		expect(buildSessionContext(null)).not.toContain('### Recommended LLM Models');
		expect(buildSessionContext(null)).toContain('do not recommend or name');
	});

	it('does not tell the builder to prefer Slack OAuth credentials for chat integrations', () => {
		const externalServicesSkill = getBuilderRuntimeSkills().find(
			(skill) => skill.id === 'agent-builder-external-services',
		);

		expect(externalServicesSkill?.instructions).not.toContain('slackOAuth2Api');
		expect(externalServicesSkill?.instructions).not.toContain('prefer the OAuth variant');
	});
});

describe('getModelRecommendationsSection', () => {
	beforeEach(() => {
		resetModelRecommendationsCacheForTest();
		fetchProviderCatalog.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('caches a successful catalog fetch', async () => {
		fetchProviderCatalog.mockResolvedValue(catalog);

		const first = await getModelRecommendationsSection();
		const second = await getModelRecommendationsSection();

		expect(first).toContain('### Recommended LLM Models');
		expect(second).toBe(first);
		expect(fetchProviderCatalog).toHaveBeenCalledTimes(1);
	});

	it('waits before it retries a failed fetch, so turns do not each wait on the timeout', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		fetchProviderCatalog.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(catalog);

		expect(await getModelRecommendationsSection()).toBeNull();
		expect(await getModelRecommendationsSection()).toBeNull();
		expect(fetchProviderCatalog).toHaveBeenCalledTimes(1);

		vi.setSystemTime(Date.now() + 10 * 60 * 1000 + 1);

		expect(await getModelRecommendationsSection()).toContain('### Recommended LLM Models');
		expect(fetchProviderCatalog).toHaveBeenCalledTimes(2);
	});
});
