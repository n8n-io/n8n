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

describe('lockAdditionalProperties — composed objects', () => {
	it.each([
		['allOf', { allOf: [{ type: 'object', properties: { a: { type: 'string' } } }] }],
		['oneOf', { oneOf: [{ type: 'object', properties: { a: { type: 'string' } } }] }],
		['$ref', { $ref: '#/$defs/Inner' }],
		['then', { if: { required: ['k'] }, then: { properties: { a: { type: 'string' } } } }],
	])('leaves an object composed via %s open', (_keyword, composition) => {
		const result = lockAdditionalProperties({
			type: 'object',
			...composition,
		} as unknown as JSONSchema7);

		expect(result.additionalProperties).toBeUndefined();
	});

	it('leaves an object open when its own properties are extended by a branch', () => {
		const result = lockAdditionalProperties({
			type: 'object',
			properties: { a: { type: 'string' } },
			allOf: [{ type: 'object', properties: { b: { type: 'string' } } }],
		});

		expect(result.additionalProperties).toBeUndefined();
		const branch = (result.allOf ?? []) as JSONSchema7[];
		expect(branch[0].additionalProperties).toBeUndefined();
	});

	it.each([
		['allOf', { allOf: [{ type: 'object', properties: { b: { type: 'string' } } }] }],
		[
			'if/then',
			{ if: { required: ['a'] }, then: { type: 'object', properties: { b: { type: 'string' } } } },
		],
	])('keeps { a, b } valid across a %s composition', (_keyword, composition) => {
		const schema = {
			type: 'object',
			properties: { a: { type: 'string' } },
			...composition,
		} as JSONSchema7;

		// A branch validates the whole instance: closing it would reject `a`, and
		// closing the parent would reject `b`, so nothing here may be closed.
		expect(lockAdditionalProperties(schema)).toEqual(schema);
	});

	it('still closes objects nested inside a branch', () => {
		const result = lockAdditionalProperties({
			type: 'object',
			properties: { a: { type: 'string' } },
			if: { required: ['a'] },
			then: {
				type: 'object',
				properties: { nested: { type: 'object', properties: { c: { type: 'string' } } } },
			},
		});

		const then = result.then as JSONSchema7;
		expect(then.additionalProperties).toBeUndefined();
		const nested = (then.properties as Record<string, JSONSchema7>).nested;
		expect(nested.additionalProperties).toBe(false);
	});

	it('still closes an object that only lists its own properties', () => {
		const result = lockAdditionalProperties({
			type: 'object',
			properties: { a: { type: 'string' } },
			not: { required: ['b'] },
		});

		expect(result.additionalProperties).toBe(false);
	});

	it('honours an explicit additionalProperties on a composed object', () => {
		const result = lockAdditionalProperties({
			type: 'object',
			additionalProperties: false,
			allOf: [{ type: 'object', properties: { a: { type: 'string' } } }],
		});

		expect(result.additionalProperties).toBe(false);
	});
});

describe('lockAdditionalProperties — nested keywords', () => {
	it('closes objects behind contains and patternProperties', () => {
		const result = lockAdditionalProperties({
			type: 'array',
			contains: { type: 'object', properties: {} },
			patternProperties: { '^x-': { type: 'object', properties: {} } },
		});

		expect((result.contains as JSONSchema7).additionalProperties).toBe(false);
		const patternProperties = result.patternProperties as Record<string, JSONSchema7>;
		expect(patternProperties['^x-'].additionalProperties).toBe(false);
	});

	it('leaves if/then/else/not branches open', () => {
		const result = lockAdditionalProperties({
			if: { type: 'object', properties: {} },
			then: { type: 'object', properties: {} },
			else: { type: 'object', properties: {} },
			not: { type: 'object', properties: {} },
		});

		for (const key of ['if', 'then', 'else', 'not'] as const) {
			expect((result[key] as JSONSchema7).additionalProperties).toBeUndefined();
		}
	});
});
