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
							{ key: 'testing Stuff', type: 'string', value: '', path: '["testing Stuff"]' },
							{ key: 'content-type', type: 'string', value: '', path: '["content-type"]' },
							{ key: '0leading-digit', type: 'number', value: '', path: '["0leading-digit"]' },
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

		it('should escape quotes and backslashes in quoted keys', () => {
			expect(
				schemaToTypescriptTypes(
					{
						type: 'object',
						value: [
							{ key: 'say "hi"', type: 'string', value: '', path: '["say \\"hi\\""]' },
							{ key: 'back\\slash', type: 'string', value: '', path: '["back\\\\slash"]' },
						],
						path: '',
					},
					'NodeName_3',
				),
			).toEqual(`interface NodeName_3 {
  "say \\"hi\\"": string;
  "back\\\\slash": string;
}`);
		});

		it('should quote non-identifier keys in nested objects', () => {
			expect(
				schemaToTypescriptTypes(
					{
						type: 'object',
						value: [
							{
								type: 'object',
								key: 'headers',
								path: '.headers',
								value: [
									{
										key: 'x-request-id',
										type: 'string',
										value: '',
										path: '.headers["x-request-id"]',
									},
									{ key: 'valid_$Key1', type: 'string', value: '', path: '.headers.valid_$Key1' },
								],
							},
						],
						path: '',
					},
					'NodeName_4',
				),
			).toEqual(`interface NodeName_4 {
  headers: {
  "x-request-id": string;
  valid_$Key1: string;
};
}`);
		});
	});
});
