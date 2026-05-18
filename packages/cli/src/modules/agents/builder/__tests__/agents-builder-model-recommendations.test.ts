import type { ProviderCatalog } from '@n8n/agents';

import { buildBuilderPrompt } from '../agents-builder-prompts';
import { buildModelRecommendationsSection } from '../agents-builder-model-recommendations';

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
		configJson: '(no config yet)',
		configHash: null,
		configUpdatedAt: null,
		toolList: '(none)',
		modelRecommendationsSection,
	});
}

describe('builder model recommendations', () => {
	it('formats the latest tool-capable model ids from the provider catalog', () => {
		const section = buildModelRecommendationsSection(catalog);

		expect(section).toContain('## Recommended LLM models');
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

	it('injects the recommendation section only when catalog recommendations are available', () => {
		const section = buildModelRecommendationsSection(catalog);

		expect(buildPrompt(section)).toContain('## Recommended LLM models');
		expect(buildPrompt(null)).not.toContain('## Recommended LLM models');
		expect(buildPrompt(null)).toContain('do not recommend or name');
	});
});
