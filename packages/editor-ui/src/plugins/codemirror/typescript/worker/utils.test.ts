import { generateExtensionTypes, schemaToTypescriptTypes } from './utils';

describe('typescript worker utils', () => {
	describe('generateExtensionTypes', () => {
		it('should work', async () => {
			expect(await generateExtensionTypes()).toMatchSnapshot();
		});
	});

	describe('schemaToTypescriptTypes', () => {
		it('should work', () => {
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
					'Node name 1',
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
