import { normalizeGeminiToolSchema, wrapGeminiBindTools } from './normalizeGeminiToolSchema';

describe('normalizeGeminiToolSchema', () => {
	it('should normalize nullable type arrays recursively', () => {
		const schema = {
			type: 'object',
			additionalProperties: false,
			properties: {
				value: {
					type: ['string', 'null'],
					additionalProperties: false,
				},
			},
		};

		const normalized = normalizeGeminiToolSchema(schema, 'my_tool') as {
			properties: { value: { type: string; nullable: boolean; additionalProperties?: unknown } };
			additionalProperties?: unknown;
		};

		expect(normalized.additionalProperties).toBeUndefined();
		expect(normalized.properties.value.type).toBe('string');
		expect(normalized.properties.value.nullable).toBe(true);
		expect(normalized.properties.value.additionalProperties).toBeUndefined();
	});

	it('should throw a descriptive error for anyOf', () => {
		const schema = {
			type: 'object',
			properties: {
				value: {
					anyOf: [{ type: 'string' }, { type: 'number' }],
				},
			},
		};

		expect(() => normalizeGeminiToolSchema(schema, 'my_tool')).toThrow(/my_tool/);
		expect(() => normalizeGeminiToolSchema(schema, 'my_tool')).toThrow(/anyOf is not supported/);
	});

	it('should throw a descriptive error for unsupported multi-type union', () => {
		const schema = {
			type: 'object',
			properties: {
				value: {
					type: ['string', 'number', 'null'],
				},
			},
		};

		expect(() => normalizeGeminiToolSchema(schema, 'my_tool')).toThrow(/unsupported type union/);
	});
});

describe('wrapGeminiBindTools', () => {
	it('should normalize schema tools before calling bindTools', () => {
		const originalBindTools = jest.fn().mockReturnValue('bound');
		const model = {
			bindTools: originalBindTools as (tools: unknown[], kwargs?: unknown) => unknown,
		};
		const wrappedModel = wrapGeminiBindTools(model);
		const tools = [
			{
				name: 'weather_tool',
				schema: {
					type: 'object',
					properties: {
						value: { type: ['number', 'null'] },
					},
				},
			},
		];

		wrappedModel.bindTools?.(tools, { tool_choice: 'auto' });

		expect(originalBindTools).toHaveBeenCalledTimes(1);
		const calledTools = originalBindTools.mock.calls[0][0] as Array<{
			schema: { properties: { value: { type: string; nullable: boolean } } };
		}>;

		expect(calledTools[0].schema.properties.value.type).toBe('number');
		expect(calledTools[0].schema.properties.value.nullable).toBe(true);
		expect(tools[0].schema.properties.value.type).toEqual(['number', 'null']);
	});

	it('should normalize function declarations before calling bindTools', () => {
		const originalBindTools = jest.fn().mockReturnValue('bound');
		const model = {
			bindTools: originalBindTools as (tools: unknown[], kwargs?: unknown) => unknown,
		};
		const wrappedModel = wrapGeminiBindTools(model);
		const tools = [
			{
				functionDeclarations: [
					{
						name: 'my_tool',
						parameters: {
							type: 'object',
							properties: {
								value: { type: ['string', 'null'] },
							},
						},
					},
				],
			},
		];

		wrappedModel.bindTools?.(tools);

		const calledTools = originalBindTools.mock.calls[0][0] as Array<{
			functionDeclarations: Array<{
				parameters: { properties: { value: { type: string; nullable: boolean } } };
			}>;
		}>;

		expect(calledTools[0].functionDeclarations[0].parameters.properties.value.type).toBe('string');
		expect(calledTools[0].functionDeclarations[0].parameters.properties.value.nullable).toBe(true);
	});

	it('should throw before binding unsupported union schemas', () => {
		const originalBindTools = jest.fn().mockReturnValue('bound');
		const wrappedModel = wrapGeminiBindTools({
			bindTools: originalBindTools as (tools: unknown[], kwargs?: unknown) => unknown,
		});

		expect(() =>
			wrappedModel.bindTools?.([
				{
					name: 'bad_tool',
					schema: {
						type: 'object',
						properties: {
							value: {
								oneOf: [{ type: 'string' }, { type: 'number' }],
							},
						},
					},
				},
			]),
		).toThrow(/oneOf is not supported/);
		expect(originalBindTools).not.toHaveBeenCalled();
	});
});
