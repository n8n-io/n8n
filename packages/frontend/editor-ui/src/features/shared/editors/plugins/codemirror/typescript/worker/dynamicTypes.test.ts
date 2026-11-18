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

		it('quotes property names that are not valid TypeScript identifiers', () => {
			expect(
				schemaToTypescriptTypes(
					{
						type: 'object',
						value: [
							{
								key: 'testing Stuff',
								type: 'string',
								value: '',
								path: '.testing Stuff',
							},
							{
								key: 'content-type',
								type: 'number',
								value: '',
								path: '.content-type',
							},
						],
						path: '',
					},
					'NodeName_1',
				),
			).toBe(`interface NodeName_1 {
  "testing Stuff": string;
  "content-type": number;
}`);
		});
	});
});
