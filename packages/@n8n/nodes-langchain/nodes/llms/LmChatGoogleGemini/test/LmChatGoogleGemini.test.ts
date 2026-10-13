import type { IExecuteSingleFunctions, INodeExecutionData, PostReceiveAction } from 'n8n-workflow';

import { LmChatGoogleGemini } from '../LmChatGoogleGemini.node';

// Stands in for an entry in the shared FEATURED_MODELS map.
vi.mock('@n8n/ai-utilities/model-discovery', async (importOriginal) => {
	const featured = 'models/gemini-featured';
	return {
		...(await importOriginal<typeof import('@n8n/ai-utilities/model-discovery')>()),
		getGoogleModelLabel: (modelId: string) => (modelId === featured ? 'Gemini Featured' : modelId),
		pinGoogleModels: <T>(models: T[], getModelId: (model: T) => string) => [
			...models.filter((model) => getModelId(model) === featured),
			...models.filter((model) => getModelId(model) !== featured),
		],
	};
});

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

	it('should list featured models first, under their product name, in every version', async () => {
		const modelProperties = new LmChatGoogleGemini().description.properties.filter(
			(p) => p.name === 'modelName',
		);
		const sortedOptions: INodeExecutionData[] = [
			{ json: { name: 'models/gemini-2.5-flash', value: 'models/gemini-2.5-flash' } },
			{ json: { name: 'models/gemini-featured', value: 'models/gemini-featured' } },
		];

		expect(modelProperties).toHaveLength(3);
		for (const property of modelProperties) {
			const postReceive = property.typeOptions?.loadOptions?.routing?.output
				?.postReceive as PostReceiveAction[];
			const featureModels = postReceive.at(-1);
			if (typeof featureModels !== 'function') throw new Error('Expected a postReceive function');

			const options = await featureModels.call(
				{} as IExecuteSingleFunctions,
				sortedOptions,
				{} as never,
			);

			expect(options.map((option) => option.json)).toEqual([
				{ name: 'Gemini Featured', value: 'models/gemini-featured' },
				{ name: 'models/gemini-2.5-flash', value: 'models/gemini-2.5-flash' },
			]);
		}
	});
});
