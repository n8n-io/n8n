import { generateJsonSchemaFromData } from './json-schema-from-data';

describe('generateJsonSchemaFromData', () => {
	it('infers string type', () => {
		expect(generateJsonSchemaFromData('hello')).toEqual({ type: 'string' });
	});

	it('infers number type', () => {
		expect(generateJsonSchemaFromData(42)).toEqual({ type: 'number' });
	});

	it('infers boolean type', () => {
		expect(generateJsonSchemaFromData(true)).toEqual({ type: 'boolean' });
	});

	it('infers null type', () => {
		expect(generateJsonSchemaFromData(null)).toEqual({ type: 'null' });
	});

	it('infers undefined as null', () => {
		expect(generateJsonSchemaFromData(undefined)).toEqual({ type: 'null' });
	});

	it('infers flat object', () => {
		expect(generateJsonSchemaFromData({ name: 'test', count: 5 })).toEqual({
			type: 'object',
			properties: {
				name: { type: 'string' },
				count: { type: 'number' },
			},
			required: ['name', 'count'],
		});
	});

	it('infers nested object', () => {
		expect(generateJsonSchemaFromData({ user: { email: 'a@b.com', active: true } })).toEqual({
			type: 'object',
			properties: {
				user: {
					type: 'object',
					properties: {
						email: { type: 'string' },
						active: { type: 'boolean' },
					},
					required: ['email', 'active'],
				},
			},
			required: ['user'],
		});
	});

	it('infers array with items', () => {
		expect(generateJsonSchemaFromData([{ id: 1 }])).toEqual({
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'number' },
				},
				required: ['id'],
			},
		});
	});

	it('infers empty array', () => {
		expect(generateJsonSchemaFromData([])).toEqual({
			type: 'array',
			items: {},
		});
	});

	it('does not retain actual values', () => {
		const data = { secret: 'my-api-key', email: 'user@private.com', count: 999 };
		const schema = generateJsonSchemaFromData(data);

		const json = JSON.stringify(schema);
		expect(json).not.toContain('my-api-key');
		expect(json).not.toContain('user@private.com');
		expect(json).not.toContain('999');
	});
});
