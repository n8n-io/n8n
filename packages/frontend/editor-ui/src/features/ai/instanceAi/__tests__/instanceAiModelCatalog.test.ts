import type { InstanceAiModelCatalogResponse } from '@n8n/api-types';

import { INSTANCE_AI_RECOMMENDED_MODELS } from '../instanceAiConnection.constants';
import { getInstanceAiModelOptions } from '../instanceAiModelCatalog';

const catalog: InstanceAiModelCatalogResponse['models'] = {
	anthropic: [
		{ id: 'claude-opus-5', name: 'Claude Opus 5' },
		{ id: 'claude-zeta', name: 'Claude Zeta' },
		{ id: 'claude-alpha', name: 'Claude Alpha' },
	],
	openai: [],
	openrouter: [],
};

describe('getInstanceAiModelOptions', () => {
	it('uses curated recommendations immediately without a catalog', () => {
		const options = getInstanceAiModelOptions('anthropic', null, '');

		expect(options.map(({ id }) => id)).toEqual(INSTANCE_AI_RECOMMENDED_MODELS.anthropic);
		expect(options.map(({ recommended }) => recommended)).toEqual([true, false]);
	});

	it('enriches and de-duplicates recommendations before sorted dynamic models', () => {
		const options = getInstanceAiModelOptions('anthropic', catalog, '');

		expect(options).toEqual([
			{ id: 'claude-opus-5', name: 'Claude Opus 5', recommended: true },
			{ id: 'claude-sonnet-5', name: 'claude-sonnet-5', recommended: false },
			{ id: 'claude-alpha', name: 'Claude Alpha', recommended: false },
			{ id: 'claude-zeta', name: 'Claude Zeta', recommended: false },
		]);
	});

	it('keeps an unknown saved model selectable', () => {
		const options = getInstanceAiModelOptions('openai', catalog, 'retired-model');

		expect(options.map(({ id }) => id)).toEqual([
			...INSTANCE_AI_RECOMMENDED_MODELS.openai,
			'retired-model',
		]);
	});

	it('does not provide catalog options for custom endpoints', () => {
		expect(getInstanceAiModelOptions('custom', catalog, 'custom-model')).toEqual([]);
	});
});
