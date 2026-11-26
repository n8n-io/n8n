import { sanitizeGeminiSchema, sanitizeGenerativeAITools } from '../sanitize-tools';

describe('sanitizeGeminiSchema', () => {
	it('should convert array type with null into scalar type and nullable: true', () => {
		const input = {
			type: 'object',
			properties: {
				text: {
					type: ['string', 'null'],
					description: 'an optional text field',
				},
				count: {
					type: ['null', 'integer'],
					description: 'an optional count field',
				},
				price: {
					type: ['number', 'null'],
				},
				active: {
					type: ['boolean', 'null'],
				},
			},
			required: ['text'],
		};

		const result = sanitizeGeminiSchema(input);

		expect(result).toEqual({
			type: 'object',
			properties: {
				text: {
					type: 'string',
					nullable: true,
					description: 'an optional text field',
				},
				count: {
					type: 'integer',
					nullable: true,
					description: 'an optional count field',
				},
				price: {
					type: 'number',
					nullable: true,
				},
				active: {
					type: 'boolean',
					nullable: true,
				},
			},
			required: ['text'],
		});
	});

	it('should handle single-element array type', () => {
		const input = {
			type: ['string'],
		};

		const result = sanitizeGeminiSchema(input);

		expect(result).toEqual({
			type: 'string',
		});
	});

	it('should handle type: null by setting type: string and nullable: true', () => {
		const input = {
			type: 'null',
		};

		const result = sanitizeGeminiSchema(input);

		expect(result).toEqual({
			type: 'string',
			nullable: true,
		});
	});

	it('should flatten anyOf union with null', () => {
		const input = {
			type: 'object',
			properties: {
				query: {
					anyOf: [{ type: 'string', description: 'query string' }, { type: 'null' }],
				},
			},
		};

		const result = sanitizeGeminiSchema(input);

		expect(result).toEqual({
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'query string',
					nullable: true,
				},
			},
		});
	});

	it('should flatten oneOf union with null', () => {
		const input = {
			type: 'object',
			properties: {
				limit: {
					oneOf: [{ type: 'null' }, { type: 'integer', minimum: 1 }],
				},
			},
		};

		const result = sanitizeGeminiSchema(input);

		expect(result).toEqual({
			type: 'object',
			properties: {
				limit: {
					type: 'integer',
					minimum: 1,
					nullable: true,
				},
			},
		});
	});

	it('should recursively sanitize array items', () => {
		const input = {
			type: 'array',
			items: {
				type: ['string', 'null'],
			},
		};

		const result = sanitizeGeminiSchema(input);

		expect(result).toEqual({
			type: 'array',
			items: {
				type: 'string',
				nullable: true,
			},
		});
	});

	it('should recursively sanitize deeply nested objects', () => {
		const input = {
			type: 'object',
			properties: {
				user: {
					type: 'object',
					properties: {
						email: {
							type: ['string', 'null'],
						},
						tags: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									id: { type: ['number', 'null'] },
								},
							},
						},
					},
				},
			},
		};

		const result = sanitizeGeminiSchema(input);

		expect(result).toEqual({
			type: 'object',
			properties: {
				user: {
					type: 'object',
					properties: {
						email: {
							type: 'string',
							nullable: true,
						},
						tags: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									id: {
										type: 'number',
										nullable: true,
									},
								},
							},
						},
					},
				},
			},
		});
	});

	it('should leave schemas without null or union types untouched', () => {
		const input = {
			type: 'object',
			properties: {
				name: { type: 'string' },
				age: { type: 'integer' },
			},
			required: ['name'],
		};

		const result = sanitizeGeminiSchema(input);

		expect(result).toEqual(input);
	});
});

describe('sanitizeGenerativeAITools', () => {
	it('should sanitize function declarations parameters in Generative AI tools', () => {
		const tools = [
			{
				functionDeclarations: [
					{
						name: 'search_database',
						description: 'searches records',
						parameters: {
							type: 'object',
							properties: {
								query: { type: 'string' },
								filter: { type: ['string', 'null'] },
							},
							required: ['query'],
						},
					},
				],
			},
		];

		const result = sanitizeGenerativeAITools(tools);

		expect(result).toEqual([
			{
				functionDeclarations: [
					{
						name: 'search_database',
						description: 'searches records',
						parameters: {
							type: 'object',
							properties: {
								query: { type: 'string' },
								filter: { type: 'string', nullable: true },
							},
							required: ['query'],
						},
					},
				],
			},
		]);
	});

	it('should return non-array or tools without functionDeclarations untouched', () => {
		expect(sanitizeGenerativeAITools(null as unknown as unknown[])).toBeNull();
		expect(sanitizeGenerativeAITools(undefined as unknown as unknown[])).toBeUndefined();

		const codeExecutionTool = [{ codeExecution: {} }];
		expect(sanitizeGenerativeAITools(codeExecutionTool)).toEqual(codeExecutionTool);
	});
});
