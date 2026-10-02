import { resourceMapperValueSchema } from './schema-helpers';

describe('resourceMapperValueSchema', () => {
	it('accepts defineBelow when value is null and schema is present', () => {
		const result = resourceMapperValueSchema.safeParse({
			mappingMode: 'defineBelow',
			value: null,
			schema: [{ id: 'name', displayName: 'Name', type: 'string', required: false }],
		});

		expect(result.success).toBe(true);
	});

	it('accepts defineBelow before schema is loaded', () => {
		const result = resourceMapperValueSchema.safeParse({
			mappingMode: 'defineBelow',
			value: null,
		});

		expect(result.success).toBe(true);
	});

	it('accepts defineBelow with manual values', () => {
		const result = resourceMapperValueSchema.safeParse({
			mappingMode: 'defineBelow',
			value: {
				name: '={{ $json.name }}',
				email: '={{ $json.email }}',
			},
			schema: [
				{ id: 'name', displayName: 'Name', type: 'string', required: false },
				{ id: 'email', displayName: 'Email', type: 'string', required: false },
			],
		});

		expect(result.success).toBe(true);
	});

	it('accepts unknown mapping modes', () => {
		const result = resourceMapperValueSchema.safeParse({
			mappingMode: 'newMappingMode',
			value: {
				name: '={{ $json.name }}',
			},
		});

		expect(result.success).toBe(true);
	});

	it('accepts autoMapInputData without schema', () => {
		const result = resourceMapperValueSchema.safeParse({
			mappingMode: 'autoMapInputData',
			value: null,
		});

		expect(result.success).toBe(true);
	});

	it('accepts expression values', () => {
		const result = resourceMapperValueSchema.safeParse('={{ $json.columns }}');

		expect(result.success).toBe(true);
	});
});
