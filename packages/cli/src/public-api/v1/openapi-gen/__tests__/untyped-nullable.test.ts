import { stripUntypedNullable } from '../untyped-nullable';

describe('stripUntypedNullable', () => {
	it('removes an untyped nullable, leaving an unconstrained schema', () => {
		const schema = { nullable: true };
		stripUntypedNullable(schema);
		expect(schema).toEqual({});
	});

	it('removes an untyped nullable but keeps its siblings', () => {
		const schema = { nullable: true, description: 'anything goes' };
		stripUntypedNullable(schema);
		expect(schema).toEqual({ description: 'anything goes' });
	});

	it('leaves a typed nullable unchanged', () => {
		const schema = { type: 'string', nullable: true };
		stripUntypedNullable(schema);
		expect(schema).toEqual({ type: 'string', nullable: true });
	});

	it('leaves an untyped nullable next to allOf unchanged', () => {
		const schema = { allOf: [{ type: 'string' }], nullable: true };
		stripUntypedNullable(schema);
		expect(schema).toEqual({ allOf: [{ type: 'string' }], nullable: true });
	});

	it('leaves an untyped nullable next to a $ref unchanged', () => {
		const schema = { $ref: '#/components/schemas/Widget', nullable: true };
		stripUntypedNullable(schema);
		expect(schema).toEqual({ $ref: '#/components/schemas/Widget', nullable: true });
	});

	it('normalizes a nested schema under properties', () => {
		const schema = { type: 'object', properties: { anything: { nullable: true } } };
		stripUntypedNullable(schema);
		expect(schema).toEqual({ type: 'object', properties: { anything: {} } });
	});

	it('normalizes a nested schema under items', () => {
		const schema = { type: 'array', items: { nullable: true } };
		stripUntypedNullable(schema);
		expect(schema).toEqual({ type: 'array', items: {} });
	});

	it('normalizes a nested schema under additionalProperties', () => {
		const schema = { type: 'object', additionalProperties: { nullable: true } };
		stripUntypedNullable(schema);
		expect(schema).toEqual({ type: 'object', additionalProperties: {} });
	});

	it('normalizes a nested schema under anyOf', () => {
		const schema = { anyOf: [{ nullable: true }, { type: 'string' }] };
		stripUntypedNullable(schema);
		expect(schema).toEqual({ anyOf: [{}, { type: 'string' }] });
	});

	it('leaves an example payload untouched', () => {
		const schema = { type: 'object', example: { nullable: true } };
		stripUntypedNullable(schema);
		expect(schema).toEqual({ type: 'object', example: { nullable: true } });
	});

	it('leaves a property literally named "nullable" untouched', () => {
		const schema = { type: 'object', properties: { nullable: { type: 'boolean' } } };
		stripUntypedNullable(schema);
		expect(schema).toEqual({ type: 'object', properties: { nullable: { type: 'boolean' } } });
	});
});
