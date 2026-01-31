import { matchSchema, type OutputSchemaEntry } from '../output-schema-resolver';

describe('matchSchema', () => {
	describe('simple schemas', () => {
		it('matches simple schema without parameters', () => {
			const schemas: OutputSchemaEntry[] = [{ schema: { type: 'object' } }];
			const result = matchSchema(schemas, {});
			expect(result).toEqual({ type: 'object' });
		});

		it('returns first schema when multiple exist without parameters', () => {
			const schemas: OutputSchemaEntry[] = [
				{ schema: { id: 'first' } },
				{ schema: { id: 'second' } },
			];
			const result = matchSchema(schemas, {});
			expect(result).toEqual({ id: 'first' });
		});
	});

	describe('parameter matching', () => {
		it('matches schema with single parameter', () => {
			const schemas: OutputSchemaEntry[] = [
				{
					parameters: { resource: 'user' },
					schema: { type: 'object', properties: { userId: { type: 'string' } } },
				},
				{
					parameters: { resource: 'post' },
					schema: { type: 'object', properties: { postId: { type: 'string' } } },
				},
			];
			const result = matchSchema(schemas, { resource: 'post' });
			expect(result).toEqual({ type: 'object', properties: { postId: { type: 'string' } } });
		});

		it('matches schema with multiple parameters', () => {
			const schemas: OutputSchemaEntry[] = [
				{
					parameters: { resource: 'user', operation: 'get' },
					schema: { id: 'user-get' },
				},
				{
					parameters: { resource: 'user', operation: 'create' },
					schema: { id: 'user-create' },
				},
			];
			const result = matchSchema(schemas, { resource: 'user', operation: 'create' });
			expect(result).toEqual({ id: 'user-create' });
		});

		it('returns undefined when no parameters match', () => {
			const schemas: OutputSchemaEntry[] = [
				{ parameters: { resource: 'user' }, schema: { type: 'object' } },
			];
			const result = matchSchema(schemas, { resource: 'post' });
			expect(result).toBeUndefined();
		});

		it('ignores extra parameters in input when schema parameters match', () => {
			const schemas: OutputSchemaEntry[] = [
				{ parameters: { resource: 'user' }, schema: { id: 'user' } },
			];
			const result = matchSchema(schemas, { resource: 'user', operation: 'get', extra: 'value' });
			expect(result).toEqual({ id: 'user' });
		});
	});

	describe('nested schemas (depth-first)', () => {
		it('matches nested schemas depth-first', () => {
			const schemas: OutputSchemaEntry[] = [
				{
					parameters: { resource: 'channel' },
					schemas: [
						{ parameters: { operation: 'get' }, schema: { id: 'channel-get' } },
						{ parameters: { operation: 'getAll' }, schema: { id: 'channel-getAll' } },
					],
				},
			];
			const result = matchSchema(schemas, { resource: 'channel', operation: 'getAll' });
			expect(result).toEqual({ id: 'channel-getAll' });
		});

		it('returns first match in nested structure', () => {
			const schemas: OutputSchemaEntry[] = [
				{
					parameters: { resource: 'channel' },
					schemas: [
						{ schema: { id: 'channel-default' } },
						{ parameters: { operation: 'get' }, schema: { id: 'channel-get' } },
					],
				},
			];
			const result = matchSchema(schemas, { resource: 'channel', operation: 'get' });
			// Should return first match (channel-default) since it has no parameters to filter
			expect(result).toEqual({ id: 'channel-default' });
		});

		it('handles deeply nested schemas', () => {
			const schemas: OutputSchemaEntry[] = [
				{
					parameters: { resource: 'channel' },
					schemas: [
						{
							parameters: { operation: 'get' },
							schemas: [
								{ parameters: { mode: 'full' }, schema: { id: 'channel-get-full' } },
								{ parameters: { mode: 'summary' }, schema: { id: 'channel-get-summary' } },
							],
						},
					],
				},
			];
			const result = matchSchema(schemas, {
				resource: 'channel',
				operation: 'get',
				mode: 'summary',
			});
			expect(result).toEqual({ id: 'channel-get-summary' });
		});

		it('skips non-matching nested branches', () => {
			const schemas: OutputSchemaEntry[] = [
				{
					parameters: { resource: 'channel' },
					schemas: [{ parameters: { operation: 'get' }, schema: { id: 'channel-get' } }],
				},
				{
					parameters: { resource: 'message' },
					schemas: [{ parameters: { operation: 'send' }, schema: { id: 'message-send' } }],
				},
			];
			const result = matchSchema(schemas, { resource: 'message', operation: 'send' });
			expect(result).toEqual({ id: 'message-send' });
		});
	});

	describe('mixed schemas', () => {
		it('handles mix of schemas with and without parameters', () => {
			const schemas: OutputSchemaEntry[] = [
				{ parameters: { resource: 'special' }, schema: { id: 'special' } },
				{ schema: { id: 'fallback' } },
			];
			// Should match 'special' when resource matches
			expect(matchSchema(schemas, { resource: 'special' })).toEqual({ id: 'special' });
			// Should fall through to fallback when no match
			expect(matchSchema(schemas, { resource: 'other' })).toEqual({ id: 'fallback' });
		});

		it('handles entry with both schema and nested schemas', () => {
			// When an entry has both schema and schemas, schemas should take precedence for matching
			const schemas: OutputSchemaEntry[] = [
				{
					parameters: { resource: 'channel' },
					schema: { id: 'channel-default' },
					schemas: [{ parameters: { operation: 'get' }, schema: { id: 'channel-get' } }],
				},
			];
			// Should recurse into schemas first
			const result = matchSchema(schemas, { resource: 'channel', operation: 'get' });
			expect(result).toEqual({ id: 'channel-get' });
		});

		it('falls back to direct schema when nested schemas do not match', () => {
			const schemas: OutputSchemaEntry[] = [
				{
					parameters: { resource: 'channel' },
					schema: { id: 'channel-default' },
					schemas: [{ parameters: { operation: 'create' }, schema: { id: 'channel-create' } }],
				},
			];
			// operation: 'get' doesn't match 'create', should fall back to direct schema
			const result = matchSchema(schemas, { resource: 'channel', operation: 'get' });
			expect(result).toEqual({ id: 'channel-default' });
		});
	});

	describe('edge cases', () => {
		it('returns undefined for empty schemas array', () => {
			const result = matchSchema([], {});
			expect(result).toBeUndefined();
		});

		it('returns undefined when nested schemas are empty', () => {
			const schemas: OutputSchemaEntry[] = [{ parameters: { resource: 'channel' }, schemas: [] }];
			const result = matchSchema(schemas, { resource: 'channel' });
			expect(result).toBeUndefined();
		});

		it('handles undefined parameters in schema entry', () => {
			const schemas: OutputSchemaEntry[] = [{ parameters: undefined, schema: { id: 'default' } }];
			const result = matchSchema(schemas, { resource: 'anything' });
			expect(result).toEqual({ id: 'default' });
		});
	});
});
