import { addObjectTypeToObjectUnions } from '../object-union-type';

const webhook = { type: 'object', properties: { url: { type: 'string' } } };
const syslog = { type: 'object', properties: { host: { type: 'string' } } };

describe('addObjectTypeToObjectUnions', () => {
	it('adds `type: object` to a oneOf whose members are all objects', () => {
		const schema = { oneOf: [webhook, syslog], description: 'A destination' };
		addObjectTypeToObjectUnions(schema);
		expect(schema).toEqual({
			type: 'object',
			oneOf: [webhook, syslog],
			description: 'A destination',
		});
	});

	it('leaves a oneOf with a non-object member unchanged', () => {
		const schema = { oneOf: [webhook, { type: 'array', items: {} }] };
		addObjectTypeToObjectUnions(schema);
		expect(schema).toEqual({ oneOf: [webhook, { type: 'array', items: {} }] });
	});

	it('leaves a oneOf with a $ref member unchanged', () => {
		const schema = { oneOf: [webhook, { $ref: '#/components/schemas/Syslog' }] };
		addObjectTypeToObjectUnions(schema);
		expect(schema).toEqual({ oneOf: [webhook, { $ref: '#/components/schemas/Syslog' }] });
	});

	it('normalizes a nested union under items', () => {
		const schema = { type: 'array', items: { oneOf: [webhook, syslog] } };
		addObjectTypeToObjectUnions(schema);
		expect(schema).toEqual({ type: 'array', items: { type: 'object', oneOf: [webhook, syslog] } });
	});

	it('does not rewrite example data', () => {
		const schema = { type: 'object', example: { oneOf: [webhook, syslog] } };
		addObjectTypeToObjectUnions(schema);
		expect(schema).toEqual({ type: 'object', example: { oneOf: [webhook, syslog] } });
	});
});
