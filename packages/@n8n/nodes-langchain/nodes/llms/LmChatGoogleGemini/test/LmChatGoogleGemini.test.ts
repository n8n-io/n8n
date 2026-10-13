import type { IExecuteSingleFunctions, INodeExecutionData, PostReceiveAction } from 'n8n-workflow';

import { LmChatGoogleGemini } from '../LmChatGoogleGemini.node';

// Stands in for an entry in the shared FEATURED_MODELS list.
vi.mock('@n8n/ai-utilities/model-discovery', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities/model-discovery')>()),
	pinGoogleModels: <T>(models: T[], getModelId: (model: T) => string) => [
		...models.filter((model) => getModelId(model) === 'models/gemini-featured'),
		...models.filter((model) => getModelId(model) !== 'models/gemini-featured'),
	],
}));

describe('LmChatGoogleGemini', () => {
	it('should send every model field to the provider catalog with a Gemini 3.x floor', () => {
		const hints = new LmChatGoogleGemini().description.properties
			.filter((p) => p.name === 'modelName')
			.map((p) => p.builderHint?.propertyHint);

		expect(hints).toHaveLength(3);
		for (const hint of hints) {
			expect(hint).toContain('even with a connected credential');
			expect(hint).toContain('use current Google provider catalog information');
			expect(hint).toContain('Do not choose Gemini 2.x or older');
		}
	});

	it('should not name builder tools in the model hint', () => {
		const hints = new LmChatGoogleGemini().description.properties
			.filter((p) => p.name === 'modelName')
			.map((p) => p.builderHint?.propertyHint);

		for (const hint of hints) {
			expect(hint).not.toMatch(/searchModels|explore-resources|nodes\(/);
		}
	});

	it('should label, sort and pin models in every version', async () => {
		const modelProperties = new LmChatGoogleGemini().description.properties.filter(
			(p) => p.name === 'modelName',
		);
		const options: INodeExecutionData[] = [
			{ json: { name: 'models/gemini-zeta', value: 'models/gemini-zeta', displayName: '' } },
			{
				json: {
					name: 'models/gemini-featured',
					value: 'models/gemini-featured',
					displayName: 'gemini-featured',
				},
			},
			{ json: { name: 'models/gemini-2.5-pro', value: 'models/gemini-2.5-pro' } },
			{
				json: {
					name: 'models/gemini-api-named',
					value: 'models/gemini-api-named',
					displayName: 'Gemini Api Named',
				},
			},
		];

		expect(modelProperties).toHaveLength(3);
		for (const property of modelProperties) {
			const postReceive = property.typeOptions?.loadOptions?.routing?.output
				?.postReceive as PostReceiveAction[];
			const labelModels = postReceive.at(-1);
			if (typeof labelModels !== 'function') throw new Error('Expected a postReceive function');

			const result = await labelModels.call({} as IExecuteSingleFunctions, options, {} as never);

			// The API's displayName wins, then MODEL_DISPLAY_NAMES, then the id.
			expect(result.map((option) => option.json)).toEqual([
				{ name: 'models/gemini-featured', value: 'models/gemini-featured' },
				{ name: 'Gemini 2.5 Pro', value: 'models/gemini-2.5-pro' },
				{ name: 'Gemini Api Named', value: 'models/gemini-api-named' },
				{ name: 'models/gemini-zeta', value: 'models/gemini-zeta' },
			]);
		}
	});
});
