import { AGENT_MODEL_PROVIDERS } from '@n8n/api-types';

import { filterOfferedAgentModelProviders } from '../model-catalog';

describe('filterOfferedAgentModelProviders', () => {
	it('keeps only providers offered by the agents UI', () => {
		const catalog = {
			openai: { id: 'openai', name: 'OpenAI', models: {} },
			groq: { id: 'groq', name: 'Groq', models: {} },
			'google-vertex': {
				id: 'google-vertex',
				name: 'Google Vertex AI',
				models: {
					'gemini-2.5-pro': { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', toolCall: false },
				},
			},
			unsupported: { id: 'unsupported', name: 'Unsupported', models: {} },
			'another-provider': { id: 'another-provider', name: 'Another', models: {} },
		};

		const filtered = filterOfferedAgentModelProviders(catalog);

		expect(filtered).toEqual({
			openai: catalog.openai,
			groq: catalog.groq,
			'google-vertex': catalog['google-vertex'],
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
});
