import {
	groupSchemasByDiscriminators,
	generateOutputSchemaContent,
	generateOutputSchemaJson,
	type OutputSchema,
} from '../generate-output-schemas';

describe('generate-output-schemas', () => {
	describe('groupSchemasByDiscriminators', () => {
		it('groups schemas by resource then operation', () => {
			const schemas: OutputSchema[] = [
				{
					resource: 'user',
					operation: 'get',
					schema: { type: 'object', properties: { id: { type: 'string' } } },
				},
				{
					resource: 'user',
					operation: 'create',
					schema: { type: 'object', properties: { id: { type: 'string' } } },
				},
				{
					resource: 'post',
					operation: 'get',
					schema: { type: 'object', properties: { id: { type: 'string' } } },
				},
			];

			const grouped = groupSchemasByDiscriminators(schemas);

			expect(grouped).toHaveLength(2); // 2 resources
			const userGroup = grouped.find((g) => g.parameters?.resource === 'user');
			expect(userGroup).toBeDefined();
			expect(userGroup!.schemas).toHaveLength(2); // 2 operations
			expect(userGroup!.schemas![0].parameters?.operation).toBe('get');
			expect(userGroup!.schemas![1].parameters?.operation).toBe('create');
		});

		it('handles single schema without nesting', () => {
			const schemas: OutputSchema[] = [{ resource: '', operation: '', schema: { type: 'object' } }];

			const grouped = groupSchemasByDiscriminators(schemas);

			expect(grouped).toHaveLength(1);
			expect(grouped[0].schema).toEqual({ type: 'object' });
			expect(grouped[0].parameters).toBeUndefined();
		});

		it('handles schemas with only operation (no resource)', () => {
			const schemas: OutputSchema[] = [
				{
					resource: '',
					operation: 'execute',
					schema: { type: 'object', properties: { result: { type: 'string' } } },
				},
			];

			const grouped = groupSchemasByDiscriminators(schemas);

			expect(grouped).toHaveLength(1);
			// No resource means it's a simple schema
			expect(grouped[0].schema).toBeDefined();
		});

		it('preserves schema content', () => {
			const originalSchema = {
				type: 'object',
				properties: {
					id: { type: 'string' },
					name: { type: 'string' },
					email: { type: 'string', format: 'email' },
				},
				required: ['id'],
			};
			const schemas: OutputSchema[] = [
				{ resource: 'user', operation: 'get', schema: originalSchema },
			];

			const grouped = groupSchemasByDiscriminators(schemas);

			expect(grouped[0].schemas![0].schema).toEqual(originalSchema);
		});
	});

	describe('generateOutputSchemaContent', () => {
		it('generates valid TypeScript for multi-resource node', () => {
			const schemas: OutputSchema[] = [
				{ resource: 'channel', operation: 'get', schema: { type: 'object' } },
				{ resource: 'channel', operation: 'getAll', schema: { type: 'array' } },
				{ resource: 'message', operation: 'send', schema: { type: 'object' } },
			];

			const content = generateOutputSchemaContent('Slack', 2, schemas);

			expect(content).toContain('export const outputSchemas');
			expect(content).toContain("parameters: { resource: 'channel' }");
			expect(content).toContain("parameters: { operation: 'get' }");
			expect(content).toContain("parameters: { operation: 'getAll' }");
			expect(content).toContain("parameters: { resource: 'message' }");
			expect(content).toContain("parameters: { operation: 'send' }");
		});

		it('generates simple structure for single-schema node', () => {
			const schemas: OutputSchema[] = [
				{ resource: '', operation: '', schema: { type: 'object', additionalProperties: true } },
			];

			const content = generateOutputSchemaContent('HttpRequest', 4, schemas);

			expect(content).toContain('export const outputSchemas');
			expect(content).toContain('schema:');
			// Should not have nested parameters structure
			expect(content).not.toContain('parameters: { resource:');
		});

		it('includes JSDoc header', () => {
			const schemas: OutputSchema[] = [
				{ resource: 'user', operation: 'get', schema: { type: 'object' } },
			];

			const content = generateOutputSchemaContent('TestNode', 1, schemas);

			expect(content).toContain('TestNode');
			expect(content).toContain('Version 1');
			expect(content).toContain('Output Schemas');
		});

		it('exports with const assertion', () => {
			const schemas: OutputSchema[] = [
				{ resource: 'user', operation: 'get', schema: { type: 'object' } },
			];

			const content = generateOutputSchemaContent('TestNode', 1, schemas);

			expect(content).toContain('as const');
		});

		it('handles empty schemas array', () => {
			const content = generateOutputSchemaContent('TestNode', 1, []);

			expect(content).toContain('export const outputSchemas = []');
		});
	});

	describe('generateOutputSchemaJson', () => {
		it('generates valid JSON for multi-resource node', () => {
			const schemas: OutputSchema[] = [
				{ resource: 'channel', operation: 'get', schema: { type: 'object' } },
				{ resource: 'message', operation: 'send', schema: { type: 'object' } },
			];

			const content = generateOutputSchemaJson(schemas);
			const parsed = JSON.parse(content);

			expect(parsed).toHaveLength(2);
			expect(parsed[0].parameters?.resource).toBe('channel');
			expect(parsed[1].parameters?.resource).toBe('message');
		});

		it('generates valid JSON that can be parsed at runtime', () => {
			const schemas: OutputSchema[] = [
				{
					resource: 'user',
					operation: 'get',
					schema: {
						type: 'object',
						properties: { id: { type: 'string' }, name: { type: 'string' } },
					},
				},
			];

			const content = generateOutputSchemaJson(schemas);
			const parsed = JSON.parse(content);

			// Verify the structure matches what the resolver expects
			expect(parsed[0].schemas[0].schema.properties.id.type).toBe('string');
		});

		it('handles empty schemas', () => {
			const content = generateOutputSchemaJson([]);
			const parsed = JSON.parse(content);

			expect(parsed).toEqual([]);
		});
	});
});
