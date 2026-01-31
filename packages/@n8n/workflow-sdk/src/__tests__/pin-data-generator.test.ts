import { generateFromSchema } from '../pin-data-generator';

describe('generateFromSchema', () => {
	describe('basic types', () => {
		it('generates object with string properties', () => {
			const schema = { type: 'object', properties: { name: { type: 'string' } } };
			const result = generateFromSchema(schema, 1);
			expect(result).toHaveLength(1);
			expect(typeof result[0].name).toBe('string');
		});

		it('handles number type', () => {
			const schema = { type: 'object', properties: { count: { type: 'number' } } };
			const result = generateFromSchema(schema, 1);
			expect(typeof result[0].count).toBe('number');
		});

		it('handles integer type', () => {
			const schema = { type: 'object', properties: { count: { type: 'integer' } } };
			const result = generateFromSchema(schema, 1);
			expect(typeof result[0].count).toBe('number');
			expect(Number.isInteger(result[0].count)).toBe(true);
		});

		it('handles boolean type', () => {
			const schema = { type: 'object', properties: { active: { type: 'boolean' } } };
			const result = generateFromSchema(schema, 1);
			expect(typeof result[0].active).toBe('boolean');
		});
	});

	describe('ID fields', () => {
		it('generates uuid for "id" property', () => {
			const schema = { type: 'object', properties: { id: { type: 'string' } } };
			const result = generateFromSchema(schema, 1);
			expect(result[0].id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
		});

		it('generates uuid for properties ending with "Id"', () => {
			const schema = { type: 'object', properties: { userId: { type: 'string' } } };
			const result = generateFromSchema(schema, 1);
			expect(result[0].userId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
		});

		it('generates uuid for properties ending with "_id"', () => {
			const schema = { type: 'object', properties: { user_id: { type: 'string' } } };
			const result = generateFromSchema(schema, 1);
			expect(result[0].user_id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
		});
	});

	describe('string formats', () => {
		it('generates email for format: email', () => {
			const schema = { type: 'object', properties: { email: { type: 'string', format: 'email' } } };
			const result = generateFromSchema(schema, 1);
			expect(result[0].email).toContain('@');
		});

		it('generates url for format: uri', () => {
			const schema = { type: 'object', properties: { website: { type: 'string', format: 'uri' } } };
			const result = generateFromSchema(schema, 1);
			expect(typeof result[0].website).toBe('string');
			expect((result[0].website as string).length).toBeGreaterThan(0);
		});

		it('generates url for format: url', () => {
			const schema = { type: 'object', properties: { link: { type: 'string', format: 'url' } } };
			const result = generateFromSchema(schema, 1);
			expect(typeof result[0].link).toBe('string');
		});

		it('generates uuid for format: uuid', () => {
			const schema = { type: 'object', properties: { uuid: { type: 'string', format: 'uuid' } } };
			const result = generateFromSchema(schema, 1);
			expect(result[0].uuid).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
		});

		it('generates ISO date string for format: date-time', () => {
			const schema = {
				type: 'object',
				properties: { createdAt: { type: 'string', format: 'date-time' } },
			};
			const result = generateFromSchema(schema, 1);
			expect(() => new Date(result[0].createdAt as string)).not.toThrow();
		});
	});

	describe('enum values', () => {
		it('picks a value from enum', () => {
			const schema = {
				type: 'object',
				properties: { status: { type: 'string', enum: ['active', 'inactive', 'pending'] } },
			};
			const result = generateFromSchema(schema, 1);
			expect(['active', 'inactive', 'pending']).toContain(result[0].status);
		});

		it('handles numeric enums', () => {
			const schema = {
				type: 'object',
				properties: { priority: { type: 'number', enum: [1, 2, 3] } },
			};
			const result = generateFromSchema(schema, 1);
			expect([1, 2, 3]).toContain(result[0].priority);
		});
	});

	describe('multiple items', () => {
		it('generates multiple items when itemCount > 1', () => {
			const schema = { type: 'object', properties: { id: { type: 'string' } } };
			const result = generateFromSchema(schema, 2);
			expect(result).toHaveLength(2);
		});

		it('generates unique values for each item', () => {
			const schema = { type: 'object', properties: { id: { type: 'string' } } };
			const result = generateFromSchema(schema, 3);
			const ids = result.map((item) => item.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(3);
		});
	});

	describe('seeded generation', () => {
		it('generates deterministic data with seed', () => {
			const schema = { type: 'object', properties: { id: { type: 'string' } } };
			const result1 = generateFromSchema(schema, 1, { seed: 42 });
			const result2 = generateFromSchema(schema, 1, { seed: 42 });
			expect(result1).toEqual(result2);
		});

		it('generates different data with different seeds', () => {
			const schema = { type: 'object', properties: { id: { type: 'string' } } };
			const result1 = generateFromSchema(schema, 1, { seed: 42 });
			const result2 = generateFromSchema(schema, 1, { seed: 123 });
			expect(result1).not.toEqual(result2);
		});
	});

	describe('nested objects', () => {
		it('handles nested objects', () => {
			const schema = {
				type: 'object',
				properties: {
					user: {
						type: 'object',
						properties: { id: { type: 'string' }, name: { type: 'string' } },
					},
				},
			};
			const result = generateFromSchema(schema, 1);
			expect(typeof result[0].user).toBe('object');
			expect(typeof (result[0].user as Record<string, unknown>).id).toBe('string');
			expect(typeof (result[0].user as Record<string, unknown>).name).toBe('string');
		});

		it('handles deeply nested objects', () => {
			const schema = {
				type: 'object',
				properties: {
					level1: {
						type: 'object',
						properties: {
							level2: {
								type: 'object',
								properties: { value: { type: 'number' } },
							},
						},
					},
				},
			};
			const result = generateFromSchema(schema, 1);
			const level1 = result[0].level1 as Record<string, unknown>;
			const level2 = level1.level2 as Record<string, unknown>;
			expect(typeof level2.value).toBe('number');
		});
	});

	describe('arrays', () => {
		it('handles arrays with item schema', () => {
			const schema = {
				type: 'object',
				properties: {
					tags: { type: 'array', items: { type: 'string' } },
				},
			};
			const result = generateFromSchema(schema, 1);
			expect(Array.isArray(result[0].tags)).toBe(true);
			expect((result[0].tags as unknown[]).length).toBeGreaterThan(0);
		});

		it('handles arrays of objects', () => {
			const schema = {
				type: 'object',
				properties: {
					users: {
						type: 'array',
						items: { type: 'object', properties: { id: { type: 'string' } } },
					},
				},
			};
			const result = generateFromSchema(schema, 1);
			expect(Array.isArray(result[0].users)).toBe(true);
			const users = result[0].users as Array<Record<string, unknown>>;
			expect(typeof users[0].id).toBe('string');
		});
	});

	describe('edge cases', () => {
		it('handles empty properties object', () => {
			const schema = { type: 'object', properties: {} };
			const result = generateFromSchema(schema, 1);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({});
		});

		it('handles schema without properties', () => {
			const schema = { type: 'object' };
			const result = generateFromSchema(schema, 1);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({});
		});

		it('handles itemCount of 0', () => {
			const schema = { type: 'object', properties: { id: { type: 'string' } } };
			const result = generateFromSchema(schema, 0);
			expect(result).toHaveLength(0);
		});
	});
});
