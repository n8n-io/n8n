import { schemaToTypescriptTypes } from './dynamicTypes';

describe('typescript worker dynamicTypes', () => {
	describe('schemaToTypescriptTypes', () => {
		it('should quote property keys that are not valid identifiers', () => {
			expect(
				schemaToTypescriptTypes(
					{
						type: 'object',
						value: [
							{ key: 'hyphen-key', type: 'string', value: '', path: '.hyphen-key' },
							{ key: 'space key', type: 'number', value: '', path: '.space key' },
							{ key: '123numeric', type: 'boolean', value: '', path: '.123numeric' },
							{ key: 'valid_key', type: 'string', value: '', path: '.valid_key' },
							{ key: '$valid', type: 'string', value: '', path: '.$valid' },
						],
						path: '',
					},
					'TestInterface',
				),
			).toEqual(`interface TestInterface {
  "hyphen-key": string;
  "space key": number;
  "123numeric": boolean;
  valid_key: string;
  $valid: string;
}`);
		});

		it('should quote nested property keys that are not valid identifiers', () => {
			expect(
				schemaToTypescriptTypes(
					{
						type: 'object',
						value: [
							{
								key: 'user-info',
								type: 'object',
								path: '.user-info',
								value: [
									{ key: 'first-name', type: 'string', value: '', path: '.first-name' },
									{ key: 'age', type: 'number', value: '', path: '.age' },
								],
							},
						],
						path: '',
					},
					'TestInterface',
				),
			).toEqual(`interface TestInterface {
  "user-info": {
  "first-name": string;
  age: number;
};
}`);
		});

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
