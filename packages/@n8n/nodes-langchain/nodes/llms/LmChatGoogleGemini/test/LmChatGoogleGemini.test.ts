import type { IExecuteSingleFunctions, INodeExecutionData, PostReceiveAction } from 'n8n-workflow';

import { LmChatGoogleGemini } from '../LmChatGoogleGemini.node';

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
			{
				json: {
					name: 'models/gemini-zeta',
					value: 'models/gemini-zeta',
					displayName: '',
					priority: '',
				},
			},
			{
				json: {
					name: 'models/gemini-featured',
					value: 'models/gemini-featured',
					displayName: 'Gemini Featured',
					priority: 10,
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

			// The API's displayName labels a model, else its id. A priority pins a model.
			expect(result.map((option) => option.json)).toEqual([
				{ name: 'Gemini Featured', value: 'models/gemini-featured' },
				{ name: 'Gemini Api Named', value: 'models/gemini-api-named' },
				{ name: 'models/gemini-2.5-pro', value: 'models/gemini-2.5-pro' },
				{ name: 'models/gemini-zeta', value: 'models/gemini-zeta' },
			]);
		}
	});

	it('should leave the label of an option without a string value alone', async () => {
		const property = new LmChatGoogleGemini().description.properties.find(
			(p) => p.name === 'modelName',
		);
		const postReceive = property?.typeOptions?.loadOptions?.routing?.output
			?.postReceive as PostReceiveAction[];
		const labelModels = postReceive.at(-1);
		if (typeof labelModels !== 'function') throw new Error('Expected a postReceive function');

		const result = await labelModels.call(
			{} as IExecuteSingleFunctions,
			[{ json: { name: 'Unknown', value: 42, displayName: 'Ignored' } }],
			{} as never,
		);

		expect(result.map((option) => option.json)).toEqual([{ name: 'Unknown', value: 42 }]);
	});
});
