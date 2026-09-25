import { JSON_SCHEMA_DRAFT_2020_12, toDraft202012 } from './draft-2020-12';

const DRAFT_07 = 'http://json-schema.org/draft-07/schema#';

describe('toDraft202012', () => {
	describe('dialect', () => {
		it('replaces a draft-07 declaration with 2020-12', () => {
			const result = toDraft202012({ $schema: DRAFT_07, type: 'object' });

			expect(result.$schema).toBe(JSON_SCHEMA_DRAFT_2020_12);
		});

		it('declares the dialect on a document that had none', () => {
			expect(toDraft202012({ type: 'object' }).$schema).toBe(JSON_SCHEMA_DRAFT_2020_12);
		});

		it('returns a bare declaration for a non-object document', () => {
			expect(toDraft202012(null)).toEqual({ $schema: JSON_SCHEMA_DRAFT_2020_12 });
		});
	});

	describe('tuples', () => {
		it('moves positional schemas to prefixItems', () => {
			const result = toDraft202012({
				type: 'array',
				minItems: 2,
				maxItems: 2,
				items: [{ type: 'string' }, { type: 'number' }],
			});

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				type: 'array',
				minItems: 2,
				maxItems: 2,
				prefixItems: [{ type: 'string' }, { type: 'number' }],
			});
		});

		it('folds additionalItems into items for a tuple with a rest element', () => {
			const result = toDraft202012({
				type: 'array',
				items: [{ type: 'string' }],
				additionalItems: { type: 'boolean' },
			});

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				type: 'array',
				prefixItems: [{ type: 'string' }],
				items: { type: 'boolean' },
			});
		});

		it('leaves a list schema alone', () => {
			const result = toDraft202012({ type: 'array', items: { type: 'string' } });

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				type: 'array',
				items: { type: 'string' },
			});
		});

		it('drops additionalItems with no tuple to constrain, which draft-07 ignores', () => {
			const result = toDraft202012({ type: 'array', additionalItems: { type: 'string' } });

			expect(result).toEqual({ $schema: JSON_SCHEMA_DRAFT_2020_12, type: 'array' });
		});

		it('migrates tuples nested in every subschema position', () => {
			const tuple = { type: 'array', items: [{ type: 'string' }] };
			const migrated = { type: 'array', prefixItems: [{ type: 'string' }] };

			const result = toDraft202012({
				type: 'object',
				properties: { a: tuple },
				patternProperties: { '^b': tuple },
				additionalProperties: tuple,
				propertyNames: tuple,
				not: tuple,
				if: tuple,
				then: tuple,
				else: tuple,
				contains: tuple,
				allOf: [tuple],
				anyOf: [tuple],
				oneOf: [tuple],
				items: tuple,
			});

			expect(result).toMatchObject({
				properties: { a: migrated },
				patternProperties: { '^b': migrated },
				additionalProperties: migrated,
				propertyNames: migrated,
				not: migrated,
				if: migrated,
				then: migrated,
				else: migrated,
				contains: migrated,
				allOf: [migrated],
				anyOf: [migrated],
				oneOf: [migrated],
				items: migrated,
			});
		});

		it('migrates a tuple nested inside another tuple', () => {
			const result = toDraft202012({
				type: 'array',
				items: [{ type: 'array', items: [{ type: 'string' }] }],
				additionalItems: { type: 'array', items: [{ type: 'number' }] },
			});

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				type: 'array',
				prefixItems: [{ type: 'array', prefixItems: [{ type: 'string' }] }],
				items: { type: 'array', prefixItems: [{ type: 'number' }] },
			});
		});
	});

	describe('$defs', () => {
		it('renames root definitions and repoints refs into it', () => {
			const result = toDraft202012({
				$ref: '#/definitions/Node',
				definitions: {
					Node: { type: 'object', properties: { self: { $ref: '#/definitions/Node' } } },
				},
			});

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				$ref: '#/$defs/Node',
				$defs: { Node: { type: 'object', properties: { self: { $ref: '#/$defs/Node' } } } },
			});
		});

		it('leaves refs that do not point into root definitions', () => {
			const result = toDraft202012({
				type: 'object',
				properties: { a: { $ref: '#/properties/b' }, b: { type: 'string' } },
			});

			expect(result.properties).toEqual({
				a: { $ref: '#/properties/b' },
				b: { type: 'string' },
			});
		});

		it('keeps a nested definitions object addressable while still migrating it', () => {
			const result = toDraft202012({
				type: 'object',
				properties: {
					a: {
						definitions: { Inner: { type: 'array', items: [{ type: 'string' }] } },
						$ref: '#/properties/a/definitions/Inner',
					},
				},
			});

			expect(result.properties).toEqual({
				a: {
					definitions: { Inner: { type: 'array', prefixItems: [{ type: 'string' }] } },
					$ref: '#/properties/a/definitions/Inner',
				},
			});
		});
	});

	describe('dependencies', () => {
		it('splits property lists into dependentRequired', () => {
			const result = toDraft202012({
				type: 'object',
				dependencies: { card: ['name', 'zip'] },
			});

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				type: 'object',
				dependentRequired: { card: ['name', 'zip'] },
			});
		});

		it('splits subschemas into dependentSchemas, migrating them', () => {
			const result = toDraft202012({
				type: 'object',
				dependencies: {
					card: { properties: { t: { type: 'array', items: [{ type: 'string' }] } } },
				},
			});

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				type: 'object',
				dependentSchemas: {
					card: { properties: { t: { type: 'array', prefixItems: [{ type: 'string' }] } } },
				},
			});
		});

		it('handles both forms in one document', () => {
			const result = toDraft202012({
				dependencies: { a: ['b'], c: { required: ['d'] } },
			});

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				dependentRequired: { a: ['b'] },
				dependentSchemas: { c: { required: ['d'] } },
			});
		});

		it('does not treat a property named dependencies as the keyword', () => {
			const result = toDraft202012({
				type: 'object',
				properties: { dependencies: { type: 'object' } },
			});

			expect(result.properties).toEqual({ dependencies: { type: 'object' } });
			expect(result).not.toHaveProperty('dependentRequired');
		});
	});

	describe('draft-04 numeric bounds', () => {
		it('converts the boolean exclusive form to the numeric form', () => {
			const result = toDraft202012({
				type: 'number',
				minimum: 3,
				exclusiveMinimum: true,
				maximum: 9,
				exclusiveMaximum: true,
			});

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				type: 'number',
				exclusiveMinimum: 3,
				exclusiveMaximum: 9,
			});
		});

		it('keeps inclusive bounds when the flag is false', () => {
			const result = toDraft202012({
				type: 'number',
				minimum: 3,
				exclusiveMinimum: false,
			});

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				type: 'number',
				minimum: 3,
			});
		});

		it('leaves the numeric form alone', () => {
			const result = toDraft202012({ type: 'number', exclusiveMinimum: 3, maximum: 9 });

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				type: 'number',
				exclusiveMinimum: 3,
				maximum: 9,
			});
		});
	});

	describe('keyword safety', () => {
		it.each(['items', 'additionalItems', 'definitions', 'dependentSchemas', 'properties'])(
			'does not treat a property named %s as a keyword',
			(name) => {
				const result = toDraft202012({
					type: 'object',
					properties: { [name]: { type: 'array', items: [{ type: 'string' }] } },
				});

				expect(result.properties).toEqual({
					[name]: { type: 'array', prefixItems: [{ type: 'string' }] },
				});
			},
		);

		it('passes boolean subschemas through', () => {
			const result = toDraft202012({
				type: 'object',
				properties: { a: true, b: false },
				additionalProperties: false,
				items: [true],
			});

			expect(result).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				type: 'object',
				properties: { a: true, b: false },
				additionalProperties: false,
				prefixItems: [true],
			});
		});

		it('preserves unrelated keywords, including 2020-12-valid numeric bounds', () => {
			const document = {
				type: 'object',
				title: 'T',
				description: 'd',
				required: ['a'],
				properties: { a: { type: 'number', exclusiveMinimum: 3, multipleOf: 2 } },
				enum: [1, 2],
				format: 'email',
			};

			expect(toDraft202012(document)).toEqual({
				$schema: JSON_SCHEMA_DRAFT_2020_12,
				...document,
			});
		});

		it('is idempotent', () => {
			const document = {
				type: 'array',
				items: [{ type: 'string' }],
				additionalItems: { type: 'number' },
				definitions: { A: { type: 'string' } },
			};

			const once = toDraft202012(document);
			expect(toDraft202012(once)).toEqual(once);
		});
	});
});
