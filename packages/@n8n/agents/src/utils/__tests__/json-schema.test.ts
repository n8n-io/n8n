import type { JSONSchema7 } from 'json-schema';

import { fixSchema, lockAdditionalProperties } from '../json-schema';

describe('fixSchema', () => {
	it('adds type "object" when properties is present but type is absent', () => {
		expect(fixSchema({ properties: { name: { type: 'string' } } })).toEqual({
			type: 'object',
			properties: { name: { type: 'string' } },
		});
	});

	it('leaves the type untouched when it is already set', () => {
		const schema: JSONSchema7 = { type: 'object', properties: { a: { type: 'number' } } };
		expect(fixSchema(schema)).toEqual(schema);
	});

	it('does not add a type when there are no properties', () => {
		expect(fixSchema({ description: 'no properties' })).toEqual({ description: 'no properties' });
	});

	it('does not mutate the input schema', () => {
		const input: JSONSchema7 = { properties: { x: { type: 'string' } } };
		fixSchema(input);
		expect(input).not.toHaveProperty('type');
	});
});

describe('lockAdditionalProperties', () => {
	it('sets additionalProperties:false on a root object that omits it', () => {
		const result = lockAdditionalProperties({
			type: 'object',
			properties: { name: { type: 'string' } },
			required: ['name'],
		});

		expect(result).toEqual({
			type: 'object',
			properties: { name: { type: 'string' } },
			required: ['name'],
			additionalProperties: false,
		});
	});

	it('normalises an object that declares properties without a type', () => {
		const result = lockAdditionalProperties({
			properties: { id: { type: 'string' } },
		} as JSONSchema7);

		expect(result).toMatchObject({ type: 'object', additionalProperties: false });
	});

	it('applies additionalProperties:false recursively to nested objects', () => {
		const result = lockAdditionalProperties({
			type: 'object',
			properties: {
				address: {
					type: 'object',
					properties: { city: { type: 'string' } },
				},
				tags: {
					type: 'array',
					items: { type: 'object', properties: { label: { type: 'string' } } },
				},
			},
		});

		const props = (result.properties ?? {}) as Record<string, JSONSchema7>;
		expect(props.address.additionalProperties).toBe(false);
		const items = props.tags.items as JSONSchema7;
		expect(items.additionalProperties).toBe(false);
	});

	it('recurses into $defs and anyOf branches', () => {
		const result = lockAdditionalProperties({
			type: 'object',
			properties: { ref: { $ref: '#/$defs/Inner' } },
			anyOf: [{ type: 'object', properties: { a: { type: 'string' } } }],
			$defs: {
				Inner: { type: 'object', properties: { b: { type: 'number' } } },
			},
		});

		const defs = (result.$defs ?? {}) as Record<string, JSONSchema7>;
		expect(defs.Inner.additionalProperties).toBe(false);
		const anyOf = (result.anyOf ?? []) as JSONSchema7[];
		expect(anyOf[0].additionalProperties).toBe(false);
	});

	it('does not override an explicit additionalProperties value', () => {
		const result = lockAdditionalProperties({
			type: 'object',
			properties: { name: { type: 'string' } },
			additionalProperties: true,
		});

		expect(result.additionalProperties).toBe(true);
	});

	it('does not mutate the input schema', () => {
		const input: JSONSchema7 = { type: 'object', properties: { name: { type: 'string' } } };
		lockAdditionalProperties(input);
		expect(input.additionalProperties).toBeUndefined();
	});

	it('handles a property literally named __proto__ as an own property without mutating the prototype chain', () => {
		// Build an object with a real own `__proto__` property (a plain object
		// literal would instead set the prototype) to exercise the safe re-mapping.
		const properties: Record<string, JSONSchema7> = {};
		Object.defineProperty(properties, '__proto__', {
			value: { type: 'string' },
			enumerable: true,
			writable: true,
			configurable: true,
		});
		const result = lockAdditionalProperties({ type: 'object', properties });

		const resultProps = result.properties as Record<string, JSONSchema7>;
		// The dangerous key is kept as a real own property, and the rebuilt object's
		// prototype is left untouched (Object.defineProperty, not bracket assignment).
		expect(Object.getPrototypeOf(resultProps)).toBe(Object.prototype);
		expect(Object.prototype.hasOwnProperty.call(resultProps, '__proto__')).toBe(true);
	});
});
