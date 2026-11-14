import { schemaToTypescriptTypes } from './dynamicTypes';

describe('typescript worker dynamicTypes', () => {
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

		it('should quote keys with spaces, hyphens, and leading digits', () => {
			expect(
				schemaToTypescriptTypes(
					{
						type: 'object',
						value: [
							{
								key: 'testing Stuff',
								type: 'string',
								value: '',
								path: '["testing Stuff"]',
							},
							{
								key: 'content-type',
								type: 'string',
								value: '',
								path: '["content-type"]',
							},
							{
								key: '0leading-digit',
								type: 'number',
								value: '',
								path: '["0leading-digit"]',
							},
						],
						path: '',
					},
					'NodeName_2',
				),
			).toEqual(`interface NodeName_2 {
  "testing Stuff": string;
  "content-type": string;
  "0leading-digit": number;
}`);
		});
	});
});
