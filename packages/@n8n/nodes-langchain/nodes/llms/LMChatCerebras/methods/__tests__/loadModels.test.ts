import { searchModels } from '../loadModels';

describe('LmChatCerebras searchModels', () => {
	const mockContext = {} as any;

	it('should return all models when no filter is provided', async () => {
		const result = await searchModels.call(mockContext);

		expect(result.results).toHaveLength(6);
		expect(result.results).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'Llama 3.3 70B',
					value: 'llama-3.3-70b',
				}),
				expect.objectContaining({
					name: 'Qwen 3 235B',
					value: 'qwen-3-235b-a22b',
				}),
				expect.objectContaining({
					name: 'DeepSeek R1 Distill Llama 70B',
					value: 'deepseek-r1-distill-llama-70b',
				}),
			]),
		);
	});

	it('should filter models by name', async () => {
		const result = await searchModels.call(mockContext, '3.3');

		expect(result.results).toHaveLength(1);
		expect(result.results).toEqual([
			{
				name: 'Llama 3.3 70B',
				value: 'llama-3.3-70b',
			},
		]);
	});

	it('should filter models by id', async () => {
		const result = await searchModels.call(mockContext, 'qwen');

		expect(result.results).toHaveLength(2);
		expect(result.results).toEqual([
			{
				name: 'Qwen 3 235B',
				value: 'qwen-3-235b-a22b',
			},
			{
				name: 'Qwen 3 32B',
				value: 'qwen-3-32b',
			},
		]);
	});

	it('should perform case-insensitive filtering', async () => {
		const result = await searchModels.call(mockContext, 'LLAMA');

		expect(result.results).toHaveLength(4);
	});

	it('should return empty results when filter matches nothing', async () => {
		const result = await searchModels.call(mockContext, 'gpt');

		expect(result.results).toHaveLength(0);
	});
});
