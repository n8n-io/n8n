import Ajv2020 from 'ajv/dist/2020';
import { safeRegex } from 'n8n-workflow';

import { t } from '../schema';
import { validate, validateUntrusted } from '../validator';

afterEach(() => vi.restoreAllMocks());

describe('validate', () => {
	it('runs a pattern that can take more than linear time through safeRegex', () => {
		const test = vi.spyOn(safeRegex, 'test');
		const input = 'a'.repeat(20);
		expect(validate(input, { type: 'string', pattern: '(a+)+$' })).toEqual([]);
		expect(test).toHaveBeenCalledWith('(a+)+$', input, 'u');
		test.mockClear();
		expect(validate(input, { type: 'string', pattern: '^a+$' })).toEqual([]);
		expect(test).not.toHaveBeenCalled();
	});

	it('gives the issue of a schema that does not compile', () => {
		expect(validate('a', { type: 'string', pattern: 'a(' })).toEqual([
			expect.stringMatching(/^input: the schema is not valid: .*Invalid regular expression/),
		]);
	});

	it('compiles a schema once, and keeps a bounded number of compiled schemas', () => {
		const compile = vi.spyOn(Ajv2020.prototype, 'compile');
		const remove = vi.spyOn(Ajv2020.prototype, 'removeSchema');
		const schemas = Array.from({ length: 300 }, (_, minimum) => t.num().with({ minimum }).json);
		expect(schemas.flatMap((schema) => validate(300, schema))).toEqual([]);
		expect(schemas.flatMap((schema) => validate(300, schema))).toEqual([]);
		expect(compile).toHaveBeenCalledTimes(300);
		expect(remove.mock.calls.length).toBeGreaterThanOrEqual(300 - 256);
	});

	it('names the tag of a variant for a value of another type', () => {
		const variant = t.variant('mode', { all: {}, limit: { max: t.int() } }).json;
		expect(validate('Sheet1', variant)).toEqual([
			'input: needs "mode" set to one of "all", "limit"',
		]);
		expect(validate(1, t.nullable(t.str()).json)).toEqual([
			'input: does not match any allowed shape',
		]);
	});

	it('gives the issues of each item of a list of variants', () => {
		const list = t.arr(t.variant('mode', { all: {}, limit: { max: t.int() } })).json;
		expect(validate([{ mode: 'limit', max: 'x' }, { mode: 'all', extra: 1 }, 'x'], list)).toEqual([
			'input[0].max: must be integer, got "x"',
			'input[1]: unknown field(s) extra. Allowed: mode',
			'input[2]: needs "mode" set to one of "all", "limit"',
		]);
	});

	it.each([
		['$defs', { $defs: { parent: { type: 'object', properties: { page: { type: 'string' } } } } }],
		[
			'definitions',
			{ definitions: { parent: { type: 'object', properties: { page: { type: 'string' } } } } },
		],
	])('resolves a local ref into %s, also with expressions and from a guest', (key, defs) => {
		const schema = {
			type: 'object',
			properties: { parent: { $ref: `#/${key}/parent` } },
			...defs,
		} as never;
		for (const check of [
			(value: unknown) => validate(value, schema),
			(value: unknown) => validate(value, schema, { allowExpressions: true }),
			(value: unknown) => validateUntrusted(value, schema),
		]) {
			expect(check({ parent: { page: 'p' } })).toEqual([]);
			expect(check({ parent: { page: 1 } })).toEqual(['input.parent.page: must be string, got 1']);
		}
		expect(
			validate({ parent: { page: '={{ $json.id }}' } }, schema, { allowExpressions: true }),
		).toEqual([]);
	});

	it('refuses a ref that does not resolve in the schema', () => {
		const schema = { type: 'object', properties: { parent: { $ref: '#/$defs/parent' } } } as never;
		expect(validate({ parent: 1 }, schema)).toEqual([
			expect.stringMatching(/^input: the schema is not valid: .*#\/\$defs\/parent/),
		]);
		const remote = { $ref: 'https://example.com/schema.json' };
		expect(validateUntrusted(1, remote)).toEqual([
			expect.stringMatching(/^input: the schema is not valid: /),
		]);
	});

	it('checks keywords outside the contract format', () => {
		expect(validate('ab', { type: 'string', maxLength: 1 } as never)).toEqual([
			'input: must NOT have more than 1 characters',
		]);
	});
});

describe('validateUntrusted', () => {
	const schema = t.obj({ id: t.str(), tags: t.arr(t.str()) }).json;

	it('gives the same issues as validate', () => {
		const value = { id: 1, tags: ['a', 2], extra: true };
		expect(validateUntrusted(value, schema, { path: 'page' })).toEqual(
			validate(value, schema, { path: 'page' }),
		);
		expect(validateUntrusted(value, schema, { path: 'page' })).toEqual([
			'page.id: must be string, got 1',
			'page.tags[1]: must be string, got 2',
			'page: unknown field(s) extra. Allowed: id, tags',
		]);
	});

	it.each([
		[
			'a schema that is too large',
			{ enum: Array.from({ length: 30_000 }, (_, index) => `value ${index}`) },
			/^input: the schema has \d+ bytes, more than 262144$/,
		],
		[
			'a schema that nests too deep',
			Array.from({ length: 70 }).reduce<object>((inner) => ({ items: inner }), {}),
			/^input: the schema nests deeper than 64 levels$/,
		],
		[
			'a pattern that can take more than linear time',
			{ type: 'string', pattern: '(a+)+$' },
			/^input: the schema pattern "\(a\+\)\+\$" can take more than linear time$/,
		],
		[
			'a key pattern that can take more than linear time',
			{ type: 'object', patternProperties: { '^(a|a)*$': {} } },
			/^input: the schema pattern .* can take more than linear time$/,
		],
		['a schema that is not valid', { type: 'text' }, /^input: the schema is not valid: /],
		['a value that is no schema', 'string', /^input: the schema is not an object$/],
	])('refuses %s before it compiles it', (_, guestSchema, issue) => {
		const compile = vi.spyOn(Ajv2020.prototype, 'compile');
		expect(validateUntrusted('a', guestSchema)).toEqual([expect.stringMatching(issue)]);
		expect(compile).not.toHaveBeenCalled();
	});

	it('checks a schema text of a guest once', () => {
		const check = vi.spyOn(Ajv2020.prototype, 'validateSchema');
		const text = JSON.stringify(t.obj({ name: t.str().with({ minLength: 3 }) }).json);
		expect(validateUntrusted({ name: 'a' }, JSON.parse(text))).toEqual([
			'input.name: must have at least 3 characters',
		]);
		check.mockClear();
		expect(validateUntrusted({ name: 'abc' }, JSON.parse(text))).toEqual([]);
		expect(check).not.toHaveBeenCalled();
	});

	it('refuses a guest schema that validate compiled before', () => {
		const slow = { type: 'string', pattern: '(b+)+$' } as const;
		expect(validate('b', slow)).toEqual([]);
		expect(validateUntrusted('b', { ...slow })).toEqual([
			expect.stringMatching(/can take more than linear time$/),
		]);
	});
});
