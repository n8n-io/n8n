import type { JSONSchema7 } from 'json-schema';

import { jsonSchemaToCompactText } from '../json-config/schema-text-serializer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap a schema in a top-level object so we can assert on field labels. */
function wrap(fieldName: string, schema: object, required = false) {
	return {
		type: 'object' as const,
		properties: { [fieldName]: schema },
		...(required ? { required: [fieldName] } : {}),
	};
}

function field(fieldName: string, schema: object, required = false): string {
	return jsonSchemaToCompactText(wrap(fieldName, schema, required));
}

// ---------------------------------------------------------------------------
// Scalar types
// ---------------------------------------------------------------------------

describe('scalar types', () => {
	it('renders a plain string field', () => {
		expect(field('name', { type: 'string' }, true)).toBe('  name: string (required)');
	});

	it('renders an optional string field', () => {
		expect(field('name', { type: 'string' })).toBe('  name?: string');
	});

	it('renders boolean', () => {
		expect(field('active', { type: 'boolean' }, true)).toBe('  active: boolean (required)');
	});

	it('renders integer', () => {
		expect(field('count', { type: 'integer' }, true)).toBe('  count: integer (required)');
	});

	it('renders number', () => {
		expect(field('score', { type: 'number' })).toBe('  score?: number');
	});

	it('renders plain array', () => {
		expect(field('items', { type: 'array' })).toBe('  items?: array');
	});

	it('renders array with typed items', () => {
		expect(field('tags', { type: 'array', items: { type: 'string' } })).toBe(
			'  tags?: array of <string>',
		);
	});

	it('renders array whose items are a anyOf union', () => {
		expect(
			field('vals', { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'number' }] } }),
		).toBe(['  vals?: array with items any of:', '    | string', '    | number'].join('\n'));
	});

	it('renders array whose items are a oneOf union', () => {
		expect(
			field('vals', {
				type: 'array',
				items: { oneOf: [{ type: 'boolean' }, { type: 'integer' }] },
			}),
		).toBe(['  vals?: array with items any of:', '    | boolean', '    | integer'].join('\n'));
	});

	it('renders array whose items are object shapes in an anyOf union', () => {
		expect(
			field('events', {
				type: 'array',
				items: {
					anyOf: [
						{
							type: 'object',
							properties: { kind: { const: 'click' }, x: { type: 'number' } },
							required: ['kind', 'x'],
						},
						{
							type: 'object',
							properties: { kind: { const: 'key' }, char: { type: 'string' } },
							required: ['kind', 'char'],
						},
					],
				},
			}),
		).toBe(
			[
				'  events?: array with items any of:',
				'    | (kind = "click")',
				'      x: number (required)',
				'    | (kind = "key")',
				'      char: string (required)',
			].join('\n'),
		);
	});

	it('renders unknown for unrecognised type', () => {
		expect(field('x', {})).toBe('  x?: unknown');
	});
});

// ---------------------------------------------------------------------------
// String constraints
// ---------------------------------------------------------------------------

describe('string constraints', () => {
	it('renders minLength only', () => {
		expect(field('s', { type: 'string', minLength: 1 })).toBe('  s?: string [min 1 chars]');
	});

	it('renders maxLength only', () => {
		expect(field('s', { type: 'string', maxLength: 50 })).toBe('  s?: string [max 50 chars]');
	});

	it('renders minLength..maxLength range', () => {
		expect(field('s', { type: 'string', minLength: 2, maxLength: 20 })).toBe(
			'  s?: string [2..20 chars]',
		);
	});

	it('renders pattern', () => {
		expect(field('s', { type: 'string', pattern: '^[a-z]+$' })).toBe(
			'  s?: string [pattern: ^[a-z]+$]',
		);
	});

	it('renders range and pattern together', () => {
		expect(field('s', { type: 'string', minLength: 1, pattern: '^\\w+$' })).toBe(
			'  s?: string [min 1 chars, pattern: ^\\w+$]',
		);
	});
});

// ---------------------------------------------------------------------------
// Numeric constraints
// ---------------------------------------------------------------------------

describe('numeric constraints', () => {
	it('renders minimum only', () => {
		expect(field('n', { type: 'number', minimum: 0 })).toBe('  n?: number [min 0]');
	});

	it('renders maximum only', () => {
		expect(field('n', { type: 'integer', maximum: 100 })).toBe('  n?: integer [max 100]');
	});

	it('renders minimum..maximum range', () => {
		expect(field('n', { type: 'number', minimum: 0, maximum: 1 })).toBe('  n?: number [0..1]');
	});
});

// ---------------------------------------------------------------------------
// Enum and const
// ---------------------------------------------------------------------------

describe('enum and const', () => {
	it('renders an enum as a union of JSON-stringified values', () => {
		expect(field('color', { enum: ['red', 'green', 'blue'] })).toBe(
			'  color?: "red" | "green" | "blue"',
		);
	});

	it('renders a numeric enum', () => {
		expect(field('level', { enum: [1, 2, 3] })).toBe('  level?: 1 | 2 | 3');
	});

	it('renders a const value', () => {
		expect(field('kind', { const: 'event' })).toBe('  kind?: "event"');
	});
});

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

describe('default values', () => {
	it('appends the default for a scalar field', () => {
		expect(field('count', { type: 'integer', default: 0 })).toBe('  count?: integer (default: 0)');
	});

	it('appends the default together with required suffix', () => {
		expect(field('flag', { type: 'boolean', default: false }, true)).toBe(
			'  flag: boolean (required) (default: false)',
		);
	});

	it('JSON-stringifies string defaults', () => {
		expect(field('mode', { type: 'string', default: 'auto' })).toBe(
			'  mode?: string (default: "auto")',
		);
	});
});

// ---------------------------------------------------------------------------
// Object with properties
// ---------------------------------------------------------------------------

describe('object with properties', () => {
	it('does not emit a header line for the top-level object', () => {
		const output = jsonSchemaToCompactText({
			type: 'object',
			properties: { x: { type: 'number' } },
			required: ['x'],
		});
		expect(output).toBe('  x: number (required)');
	});

	it('emits required and optional properties correctly', () => {
		const output = jsonSchemaToCompactText({
			type: 'object',
			properties: {
				id: { type: 'string' },
				label: { type: 'string' },
			},
			required: ['id'],
		});
		expect(output).toBe('  id: string (required)\n  label?: string');
	});

	it('marks a named object field as required', () => {
		const output = field(
			'address',
			{
				type: 'object',
				properties: { street: { type: 'string' } },
				required: ['street'],
			},
			true,
		);
		expect(output).toBe('  address: object (required)\n    street: string (required)');
	});

	it('marks a named object field as optional', () => {
		const output = field('meta', {
			type: 'object',
			properties: { key: { type: 'string' } },
		});
		expect(output).toBe('  meta?: object\n    key?: string');
	});

	it('appends an additionalProperties catch-all when properties are also present', () => {
		const output = jsonSchemaToCompactText({
			type: 'object',
			properties: { name: { type: 'string' } },
			required: ['name'],
			additionalProperties: { type: 'number' },
		});
		expect(output).toBe('  name: string (required)\n  [key: string]: number');
	});
});

// ---------------------------------------------------------------------------
// Record (object with only additionalProperties)
// ---------------------------------------------------------------------------

describe('Record type (additionalProperties only)', () => {
	it('renders Record<string, V> for a typed additionalProperties', () => {
		expect(field('data', { type: 'object', additionalProperties: { type: 'string' } })).toBe(
			'  data?: Record<string, string>',
		);
	});

	it('renders Record<string, unknown> when additionalProperties is true', () => {
		expect(field('data', { type: 'object', additionalProperties: true }, true)).toBe(
			'  data: Record<string, unknown> (required)',
		);
	});
});

// ---------------------------------------------------------------------------
// Nested objects
// ---------------------------------------------------------------------------

describe('nested objects', () => {
	it('indents nested properties correctly', () => {
		const output = jsonSchemaToCompactText({
			type: 'object',
			properties: {
				user: {
					type: 'object',
					properties: {
						profile: {
							type: 'object',
							properties: { bio: { type: 'string' } },
						},
					},
					required: ['profile'],
				},
			},
			required: ['user'],
		});
		expect(output).toBe(
			['  user: object (required)', '    profile: object (required)', '      bio?: string'].join(
				'\n',
			),
		);
	});
});

// ---------------------------------------------------------------------------
// Union types (anyOf / oneOf)
// ---------------------------------------------------------------------------

describe('union types', () => {
	it('detects a discriminator field and labels branches by its const value', () => {
		const output = field(
			'action',
			{
				anyOf: [
					{
						type: 'object',
						properties: {
							type: { const: 'click' },
							x: { type: 'number' },
							y: { type: 'number' },
						},
						required: ['type', 'x', 'y'],
					},
					{
						type: 'object',
						properties: {
							type: { const: 'type' },
							text: { type: 'string' },
						},
						required: ['type', 'text'],
					},
				],
			},
			true,
		);
		expect(output).toBe(
			[
				'  action: one of <discriminated by "type"> (required)',
				'    | type = "click": { type: "click", x: number, y: number }',
				'    | type = "type": { type: "type", text: string }',
			].join('\n'),
		);
	});

	it('falls back to "type" discriminator label when no const property is found', () => {
		const output = field('value', {
			anyOf: [
				{ type: 'object', properties: { a: { type: 'string' } } },
				{ type: 'object', properties: { b: { type: 'number' } } },
			],
		});
		expect(output).toBe(
			[
				'  value?: one of <discriminated by "type">',
				'    | ?: { a?: string }',
				'    | ?: { b?: number }',
			].join('\n'),
		);
	});

	it('treats oneOf the same as anyOf', () => {
		const output = field('val', {
			oneOf: [
				{ type: 'object', properties: { kind: { const: 'A' } }, required: ['kind'] },
				{ type: 'object', properties: { kind: { const: 'B' } }, required: ['kind'] },
			],
		});
		expect(output).toContain('discriminated by "kind"');
		expect(output).toContain('kind = "A"');
		expect(output).toContain('kind = "B"');
	});

	it('marks optional union fields with ?', () => {
		const output = field('ev', {
			anyOf: [{ type: 'object', properties: { k: { const: 'x' } }, required: ['k'] }],
		});
		expect(output).toMatch(/^ {2}ev\?:/);
	});

	it('uses "one of" (not "array of") for anyOf/oneOf union fields', () => {
		expect(
			field('ev', {
				anyOf: [
					{ type: 'object', properties: { kind: { const: 'A' } }, required: ['kind'] },
					{ type: 'object', properties: { kind: { const: 'B' } }, required: ['kind'] },
				],
			}),
		).toBe(
			[
				'  ev?: one of <discriminated by "kind">',
				'    | kind = "A": { kind: "A" }',
				'    | kind = "B": { kind: "B" }',
			].join('\n'),
		);

		expect(field('items', { type: 'array', items: { type: 'string' } })).toBe(
			'  items?: array of <string>',
		);
	});

	it('emits nothing for a top-level union schema (no fieldName)', () => {
		const output = jsonSchemaToCompactText({
			anyOf: [
				{ type: 'object', properties: { a: { type: 'string' } } },
				{ type: 'object', properties: { b: { type: 'number' } } },
			],
		});
		expect(output).toBe('');
	});

	it('appends (required) to a required union field', () => {
		const output = field(
			'action',
			{
				anyOf: [
					{ type: 'object', properties: { kind: { const: 'A' } }, required: ['kind'] },
					{ type: 'object', properties: { kind: { const: 'B' } }, required: ['kind'] },
				],
			},
			true,
		);
		expect(output).toMatch(/^ {2}action: one of .* \(required\)$/m);
	});

	it('appends (default: ...) to a union field with a default', () => {
		const output = field('mode', {
			anyOf: [{ type: 'object', properties: { kind: { const: 'A' } }, required: ['kind'] }],
			default: { kind: 'A' },
		});
		expect(output).toMatch(/\(default: \{"kind":"A"\}\)/);
	});

	it('uses a single-value enum as a discriminator const', () => {
		const output = field('ev', {
			anyOf: [
				{
					type: 'object',
					properties: { kind: { enum: ['start'] }, ms: { type: 'number' } },
					required: ['kind', 'ms'],
				},
				{
					type: 'object',
					properties: { kind: { enum: ['stop'] } },
					required: ['kind'],
				},
			],
		});
		expect(output).toContain('discriminated by "kind"');
		expect(output).toContain('kind = "start"');
		expect(output).toContain('kind = "stop"');
	});
});

// ---------------------------------------------------------------------------
// Array-union field metadata (required / default)
// ---------------------------------------------------------------------------

describe('array-union field metadata', () => {
	it('appends (required) when the array-union field is required', () => {
		const output = field(
			'events',
			{
				type: 'array',
				items: { anyOf: [{ type: 'string' }, { type: 'number' }] },
			},
			true,
		);
		expect(output).toMatch(/^ {2}events: array with items any of: \(required\)$/m);
	});

	it('appends (default: ...) when the array-union field carries a default', () => {
		const output = field('events', {
			type: 'array',
			items: { anyOf: [{ type: 'string' }] },
			default: [],
		});
		expect(output).toMatch(/\(default: \[\]\)/);
	});

	it('appends both (required) and (default: ...) together', () => {
		const output = field(
			'events',
			{
				type: 'array',
				items: { anyOf: [{ type: 'string' }] },
				default: [],
			},
			true,
		);
		expect(output).toMatch(/array with items any of: \(required\) \(default: \[\]\)/);
	});
});

// ---------------------------------------------------------------------------
// Full integration: large realistic schema
// ---------------------------------------------------------------------------

describe('full schema snapshot', () => {
	it('serializes a large realistic schema to the expected string', () => {
		const schema = {
			type: 'object',
			required: ['id', 'status', 'priority', 'metadata', 'event'],
			properties: {
				id: { type: 'string', minLength: 1, maxLength: 36 },
				status: { enum: ['draft', 'active', 'archived'] },
				priority: { type: 'integer', minimum: 1, maximum: 5 },
				enabled: { type: 'boolean', default: true },
				tags: { type: 'array', items: { type: 'string' } },
				metadata: {
					type: 'object',
					required: ['createdBy'],
					properties: {
						createdBy: { type: 'string' },
						version: { type: 'integer', default: 1 },
					},
				},
				config: {
					type: 'object',
					additionalProperties: { type: 'string' },
				},
				scores: {
					type: 'object',
					required: ['baseline'],
					properties: { baseline: { type: 'number', minimum: 0, maximum: 1 } },
					additionalProperties: { type: 'number' },
				},
				event: {
					anyOf: [
						{
							type: 'object',
							required: ['type', 'x', 'y'],
							properties: {
								type: { const: 'click' },
								x: { type: 'number' },
								y: { type: 'number' },
							},
						},
						{
							type: 'object',
							required: ['type', 'key'],
							properties: {
								type: { const: 'keypress' },
								key: { type: 'string' },
								modifiers: { type: 'array', items: { type: 'string' } },
							},
						},
					],
				},
			},
		};

		const expected = [
			'  id: string [1..36 chars] (required)',
			'  status: "draft" | "active" | "archived" (required)',
			'  priority: integer [1..5] (required)',
			'  enabled?: boolean (default: true)',
			'  tags?: array of <string>',
			'  metadata: object (required)',
			'    createdBy: string (required)',
			'    version?: integer (default: 1)',
			'  config?: Record<string, string>',
			'  scores?: object',
			'    baseline: number [0..1] (required)',
			'    [key: string]: number',
			'  event: one of <discriminated by "type"> (required)',
			'    | type = "click": { type: "click", x: number, y: number }',
			'    | type = "keypress": { type: "keypress", key: string, modifiers?: array of <string> }',
		].join('\n');

		expect(jsonSchemaToCompactText(schema as unknown as JSONSchema7)).toBe(expected);
	});
});

// ---------------------------------------------------------------------------
// Custom indent
// ---------------------------------------------------------------------------

describe('custom indent', () => {
	it('applies the initial indent offset to all lines', () => {
		const output = jsonSchemaToCompactText(
			{
				type: 'object',
				properties: { x: { type: 'string' } },
				required: ['x'],
			},
			2,
		);
		expect(output).toBe('      x: string (required)');
	});
});
