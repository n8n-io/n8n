import type { ModelInfo } from '@n8n/agents';
import { AGENT_MODEL_PROVIDERS } from '@n8n/api-types';

import { filterOfferedAgentModelProviders } from '../model-catalog';

describe('filterOfferedAgentModelProviders', () => {
	it('keeps only providers offered by the agents UI', () => {
		const catalog = {
			openai: { id: 'openai', name: 'OpenAI', models: {} },
			groq: { id: 'groq', name: 'Groq', models: {} },
			unsupported: { id: 'unsupported', name: 'Unsupported', models: {} },
			'another-provider': { id: 'another-provider', name: 'Another', models: {} },
		};

		const filtered = filterOfferedAgentModelProviders(catalog);

		expect(filtered).toEqual({
			openai: catalog.openai,
			groq: catalog.groq,
		});
	});

	it('preserves the shared provider order', () => {
		const catalog = Object.fromEntries(
			[...AGENT_MODEL_PROVIDERS]
				.reverse()
				.map((provider) => [provider, { id: provider, name: provider, models: {} }]),
		);

		expect(Object.keys(filterOfferedAgentModelProviders(catalog))).toEqual(AGENT_MODEL_PROVIDERS);
	});

	it('offers only versioned Gemini 3+ models with text output and tools on Vertex', () => {
		const model: ModelInfo = {
			id: 'gemini-3-flash-preview',
			name: 'Gemini',
			toolCall: true,
			modalities: { output: ['text'] },
		};
		const models: ModelInfo[] = [
			model,
			{ ...model, id: 'gemini-3.1-pro-preview' },
			{ ...model, id: 'gemini-4-pro' },
			{ ...model, id: 'gemini-2.5-pro' },
			{ ...model, id: 'gemini-flash-latest' },
			{ ...model, id: 'claude-sonnet-4' },
			{ ...model, id: 'gemini-3-old', status: 'deprecated' },
			{ ...model, id: 'gemini-3-image', modalities: { output: ['image'] } },
			{ ...model, id: 'gemini-3-no-tools', toolCall: false },
		];
		const allModels = Object.fromEntries(models.map((model) => [model.id, model]));
		const catalog = {
			'google-vertex': { id: 'google-vertex', name: 'Google Vertex AI', models: allModels },
			google: { id: 'google', name: 'Google', models: allModels },
		};
		const filtered = filterOfferedAgentModelProviders(catalog);
		expect(Object.keys(filtered['google-vertex'].models)).toEqual([
			'gemini-3-flash-preview',
			'gemini-3.1-pro-preview',
			'gemini-4-pro',
		]);
		expect(filtered.google.models).toEqual(allModels);
	});
});
