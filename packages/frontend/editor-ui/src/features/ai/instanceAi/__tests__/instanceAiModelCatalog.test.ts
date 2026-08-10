import type { InstanceAiModelCatalogResponse } from '@n8n/api-types';

import { INSTANCE_AI_RECOMMENDED_MODELS } from '../instanceAiConnection.constants';
import { getInstanceAiModelOptions } from '../instanceAiModelCatalog';

const catalog: InstanceAiModelCatalogResponse['models'] = {
	anthropic: [
		{ id: 'claude-opus-5', name: 'Claude Opus 5' },
		{ id: 'claude-zeta', name: 'Claude Zeta', releaseDate: '2026-05-01' },
		{ id: 'claude-beta', name: 'Claude Beta', releaseDate: '2026-03-01' },
		{ id: 'claude-delta', name: 'Claude Delta', releaseDate: '2026-03-01' },
		{ id: 'claude-alpha', name: 'Claude Alpha' },
		{ id: 'claude-invalid', name: 'Claude Invalid', releaseDate: 'unknown' },
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

	it('enriches and de-duplicates recommendations before newest dynamic models', () => {
		const options = getInstanceAiModelOptions('anthropic', catalog, '');

		expect(options).toEqual([
			{ id: 'claude-opus-5', name: 'Claude Opus 5', recommended: true },
			{ id: 'claude-sonnet-5', name: 'claude-sonnet-5', recommended: false },
			{ id: 'claude-zeta', name: 'Claude Zeta', recommended: false },
			{ id: 'claude-beta', name: 'Claude Beta', recommended: false },
			{ id: 'claude-delta', name: 'Claude Delta', recommended: false },
			{ id: 'claude-alpha', name: 'Claude Alpha', recommended: false },
			{ id: 'claude-invalid', name: 'Claude Invalid', recommended: false },
		]);
	});

	it('keeps an unknown saved model selectable', () => {
		const options = getInstanceAiModelOptions('openai', catalog, 'retired-model');

		expect(options.map(({ id }) => id)).toEqual([
			...INSTANCE_AI_RECOMMENDED_MODELS.openai,
			'retired-model',
		]);
	});

	it('sorts a saved catalog model by its release date', () => {
		const options = getInstanceAiModelOptions('anthropic', catalog, 'claude-beta');

		expect(options.map(({ id }) => id)).toEqual([
			...INSTANCE_AI_RECOMMENDED_MODELS.anthropic,
			'claude-zeta',
			'claude-beta',
			'claude-delta',
			'claude-alpha',
			'claude-invalid',
		]);
	});

	it('does not provide catalog options for custom endpoints', () => {
		expect(getInstanceAiModelOptions('custom', catalog, 'custom-model')).toEqual([]);
	});
});
