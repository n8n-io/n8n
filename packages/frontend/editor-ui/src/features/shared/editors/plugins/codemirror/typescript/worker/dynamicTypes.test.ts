import { getSnippetTypes, schemaToTypescriptTypes } from './dynamicTypes';

describe('typescript worker dynamicTypes', () => {
	describe('getSnippetTypes', () => {
		it('emits sources for inference and skips invalid ones', () => {
			const result = getSnippetTypes({
				global: { double: '(n) => n * 2', broken: '(x =>' },
				project: { TAX: '0.19' },
			});

			expect(result).toContain('double: ((n) => n * 2),');
			expect(result).not.toContain('broken');
			expect(result).toContain('TAX: (0.19),');
			expect(result).toContain('const $snippets: typeof __n8nSnippetsGlobal;');
			expect(result).toContain('const $project: typeof __n8nSnippetsProject;');
		});
	});

	describe('schemaToTypescriptTypes', () => {
		it('should convert a schema to a typescript type', () => {
			expect(
				schemaToTypescriptTypes(
					{
						type: 'object',
						value: [
							{
								key: 'test',
								type: 'string',
								value: '',
								path: '.test',
							},
							{
								type: 'object',
								key: 'nested',
								path: '.nested',
								value: [
									{
										key: 'amount',
										type: 'number',
										value: '',
										path: '.amount',
									},
								],
							},
							{
								type: 'array',
								key: 'nestedArray',
								path: '.nestedArray',
								value: [
									{
										type: 'object',
										key: 'nested',
										path: '.nestedArray.nested',
										value: [
											{
												key: 'amount',
												type: 'number',
												value: '',
												path: '.amount',
											},
										],
									},
								],
							},
						],
						path: '',
					},
					'NodeName_1',
				),
			).toEqual(`interface NodeName_1 {
  test: string;
  nested: {
  amount: number;
};
  nestedArray: Array<{
  amount: number;
}>;
}`);
		});
	});
});
