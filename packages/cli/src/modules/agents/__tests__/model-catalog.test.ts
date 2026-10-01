import { AGENT_MODEL_PROVIDERS } from '@n8n/api-types';

import { filterOfferedAgentModelProviders } from '../model-catalog';

describe('filterOfferedAgentModelProviders', () => {
	it('keeps only providers offered by the agents UI', () => {
		const catalog = {
			openai: { id: 'openai' },
			groq: { id: 'groq' },
			unsupported: { id: 'unsupported' },
			'another-provider': { id: 'another-provider' },
		};

		const filtered = filterOfferedAgentModelProviders(catalog);

		expect(filtered).toEqual({
			openai: { id: 'openai' },
			groq: { id: 'groq' },
		});
	});

	it('preserves the shared provider order', () => {
		const catalog = Object.fromEntries(
			[...AGENT_MODEL_PROVIDERS].reverse().map((provider) => [provider, { id: provider }]),
		);

		expect(Object.keys(filterOfferedAgentModelProviders(catalog))).toEqual(AGENT_MODEL_PROVIDERS);
	});
});
