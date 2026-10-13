import { Tournament } from '../src/index';

const evaluator = new Tournament((e) => {
	throw e;
});

/**
 * Every identifier that is a free read has to be resolved through the data
 * context. One that is skipped resolves against the host scope instead, which
 * is how `process` and friends become reachable from an expression.
 */
describe('jsVariablePolyfill', () => {
	describe('free reads resolve through the data context', () => {
		it.each([
			['object spread', '{{ ({...value}).a }}'],
			['nested object spread', '{{ ({...({...value})}).a }}'],
			['computed object key', '{{ ({[key]: 1}).a }}'],
			['computed class field', '{{ (() => { class X { [key] = 1; } return new X().a; })() }}'],
			[
				'computed class method',
				'{{ (() => { class X { [key]() { return 1; } } return new X().a(); })() }}',
			],
			['switch case', '{{ (() => { switch (1) { case one: return 1; } })() }}'],
		])('%s', (_, expression) => {
			expect(evaluator.execute(expression, { value: { a: 1 }, key: 'a', one: 1 })).toBe(1);
		});

		it('array spread', () => {
			expect(evaluator.execute('{{ [...value].length }}', { value: [1, 2, 3] })).toBe(3);
		});

		it('call argument spread', () => {
			expect(evaluator.execute('{{ Math.max(...value) }}', { value: [1, 5, 3] })).toBe(5);
		});

		it('base class', () => {
			class Base {
				greet() {
					return 'hello';
				}
			}

			expect(
				evaluator.execute('{{ (() => { class X extends Base {} return new X().greet(); })() }}', {
					Base,
				}),
			).toBe('hello');
		});
	});

	describe('unresolved free reads do not fall through to the host scope', () => {
		it.each([
			['object spread', '{{ ({...process}) }}'],
			['nested object spread', '{{ ({...({...process})}) }}'],
			['spread inside a function', '{{ (() => ({...process}))() }}'],
		])('%s', (_, expression) => {
			expect(evaluator.execute(expression, {})).toEqual({});
		});

		it.each([
			['array spread', '{{ [...process] }}'],
			['call argument spread', '{{ ((a) => a)(...process) }}'],
		])('%s', (_, expression) => {
			expect(() => evaluator.execute(expression, {})).toThrow(/is not iterable/);
		});

		it('base class', () => {
			expect(() => evaluator.execute('{{ (() => { class X extends Buffer {} })() }}', {})).toThrow(
				/is not a constructor or null/,
			);
		});

		it('switch case', () => {
			expect(
				evaluator.execute(
					'{{ (() => { switch (1) { case process: return "host"; } return "safe"; })() }}',
					{},
				),
			).toBe('safe');
		});

		it.each([
			['computed object key', '{{ Object.keys({[process]: 1})[0] }}'],
			[
				'computed class method key',
				'{{ (() => { class X { [process]() {} } return Object.getOwnPropertyNames(X.prototype)[1]; })() }}',
			],
		])('%s', (_, expression) => {
			expect(evaluator.execute(expression, { Object })).toBe('undefined');
		});
	});

	describe('block-scoped declarations do not leak into sibling or enclosing scopes', () => {
		it.each([
			['sibling block', '{{ (() => { { let value; } return value; })() }}'],
			[
				'for statement head',
				'{{ (() => { for (let value = 0; value < 1; value++) {} return value; })() }}',
			],
			['for-of statement head', '{{ (() => { for (const value of [1]) {} return value; })() }}'],
			['for-in statement head', '{{ (() => { for (const value in {a: 1}) {} return value; })() }}'],
			[
				'for statement body',
				'{{ (() => { for (let i = 0; i < 1; i++) { let value; } return value; })() }}',
			],
			[
				'switch case body without a block',
				'{{ (() => { switch (1) { case 2: let value; } return value; })() }}',
			],
			[
				'switch discriminant, with the name declared in a case body',
				'{{ (() => { var out; switch (out = value) { case "never": let value = 1; } return out; })() }}',
			],
			[
				'destructuring pattern in a sibling block',
				'{{ (() => { { const {a: [value = 0]} = {a: []}; } return value; })() }}',
			],
			[
				'rest element in a sibling block',
				'{{ (() => { { const [...value] = [1]; } return value; })() }}',
			],
			[
				'class declaration in a sibling block',
				'{{ (() => { { class value {} } return value; })() }}',
			],
			[
				'multiple declarators in a sibling block',
				'{{ (() => { { let value = 0, other = 0; } return value; })() }}',
			],
			[
				'catch clause body',
				'{{ (() => { try { throw 1; } catch (e) { let value; } return value; })() }}',
			],
			['block nested two levels deep', '{{ (() => { { { let value; } } return value; })() }}'],
		])('%s', (_, expression) => {
			expect(evaluator.execute(expression, { value: 42 })).toBe(42);
		});

		// Asserted from both sides: the data context entry when there is one, undefined when not.
		it('a name that is also a host global resolves through the data context', () => {
			const expression =
				'{{ (() => { { let process = 0, other = 0; } return typeof process; })() }}';

			expect(evaluator.execute(expression, { process: 'data' })).toBe('string');
			expect(evaluator.execute(expression, {})).toBe('undefined');
		});

		// A class declaration is block-scoped in every mode, so the outer read is a free read.
		it('class declaration in a sibling block does not cover a read outside it', () => {
			const expression = '{{ (() => { { class Pick {} } return Pick; })() }}';

			expect(evaluator.execute(expression, { Pick: 'data' })).toBe('data');
		});
	});

	describe('a function declared in a block is not visible outside that block', () => {
		// Holds whatever shape the declaration takes. Each name doubles as a host global, so both
		// sides are asserted: the data context entry when there is one, undefined when not.
		it.each([
			[
				'a plain declaration',
				'{{ (() => { { function process() {} } return typeof process; })() }}',
			],
			[
				'a plain declaration in an if block',
				'{{ (() => { if (1) { function process() {} } return typeof process; })() }}',
			],
			[
				'a plain declaration in a switch case body',
				'{{ (() => { switch (1) { case 1: function process() {} } return typeof process; })() }}',
			],
			[
				'a plain declaration read through a nested arrow',
				'{{ (() => { { function process() {} } return (() => typeof process)(); })() }}',
			],
			[
				'a plain declaration read before the block is evaluated',
				'{{ (() => { const before = typeof process; { function process() {} } return before; })() }}',
			],
			['a generator', '{{ (() => { { function* Function() {} } return typeof Function; })() }}'],
			[
				'an async function',
				'{{ (() => { { async function process() {} } return typeof process; })() }}',
			],
			[
				'an async generator',
				'{{ (() => { { async function* process() {} } return typeof process; })() }}',
			],
			[
				'a generator in a switch case body',
				'{{ (() => { switch (1) { case 1: function* Function() {} } return typeof Function; })() }}',
			],
			[
				'an async function in a switch case body',
				'{{ (() => { switch (1) { case 1: async function process() {} } return typeof process; })() }}',
			],
			[
				'an async generator in a switch case body',
				'{{ (() => { switch (1) { case 1: async function* process() {} } return typeof process; })() }}',
			],
			[
				'a declaration under a use strict prologue',
				'{{ (() => { "use strict"; { function process() {} } return typeof process; })() }}',
			],
			[
				'a declaration inside a class body',
				'{{ (() => { class X { static go() { { function process() {} } return typeof process; } } return X.go(); })() }}',
			],
			[
				'a declaration with a use strict prologue in its own body',
				'{{ (() => { { function process() { "use strict"; } } return typeof process; })() }}',
			],
			[
				'a declaration with an escaped spelling of the prologue in its own body',
				'{{ (() => { { function process() { "\\u0075se strict"; } } return typeof process; })() }}',
			],
		])('%s declared in a block does not cover a read outside it', (_, expression) => {
			expect(evaluator.execute(expression, { Function: 'data', process: 'data' })).toBe('string');
			expect(evaluator.execute(expression, {})).toBe('undefined');
		});

		// An enclosing lexical declaration of the same name does not change the answer.
		it.each([
			[
				'a let of the same name in an enclosing block',
				'{{ (() => { { let process = 1; { function process() {} } } return typeof process; })() }}',
			],
			[
				'a lexical for-head binding of the same name',
				'{{ (() => { for (let process of [0]) { { function process() {} } } return typeof process; })() }}',
			],
			[
				'a conflicting let in another case of the same switch',
				'{{ (() => { switch (0) { case 0: { function Function() {} } break; case 1: let Function = 1; } return typeof Function; })() }}',
			],
		])('%s: the read outside the block resolves through the data context', (_, expression) => {
			expect(evaluator.execute(expression, { Function: 'data', process: 'data' })).toBe('string');
			expect(evaluator.execute(expression, {})).toBe('undefined');
		});
	});

	describe('block-scoped bindings are left alone within their own region', () => {
		it.each([
			['own block', '{{ (() => { { let x = value; return x; } })() }}'],
			[
				'for statement head and body',
				'{{ (() => { for (let i = value; i < 10; i++) { return i; } })() }}',
			],
			[
				'for-of statement head and body',
				'{{ (() => { for (const item of [value]) { return item; } })() }}',
			],
			[
				'for-in statement head and body',
				'{{ (() => { for (const item in [value]) { return [value][item]; } })() }}',
			],
			[
				'switch case body without a block',
				'{{ (() => { switch (1) { case 1: const x = value; return x; } })() }}',
			],
			['class static block', '{{ (() => { class X { static { X.r = value; } } return X.r; })() }}'],
			['catch parameter', '{{ (() => { try { throw value; } catch (e) { return e; } })() }}'],
			[
				'function declaration in its own block',
				'{{ (() => { { function f() { return value; } return f(); } })() }}',
			],
			[
				'function declaration hoisted within its function body',
				'{{ (() => { return f(); function f() { return value; } })() }}',
			],
			[
				'destructuring pattern in its own block',
				'{{ (() => { { const {a: [local = value]} = {a: []}; return local; } })() }}',
			],
			[
				'rest element in its own block',
				'{{ (() => { { const [...local] = [value]; return local[0]; } })() }}',
			],
		])('%s', (_, expression) => {
			expect(evaluator.execute(expression, { value: 1 })).toBe(1);
		});

		it('case test is covered by a declaration in a later case body', () => {
			// A case test is evaluated inside the case block's environment, so the read stays local.
			expect(() =>
				evaluator.execute(
					'{{ (() => { switch (1) { case value: return "matched"; case 2: let value = 1; } return "none"; })() }}',
					{ value: 1 },
				),
			).toThrow(/Cannot access 'value' before initialization/);
		});

		it('an inner switch does not cover the outer discriminant', () => {
			// The declaration sits in the inner switch, so the region walk must stop there.
			const expression =
				'{{ (() => { var out; switch (out = value) { case 1: switch (2) { case 3: let value = 9; } } return out; })() }}';

			expect(evaluator.execute(expression, { value: 42 })).toBe(42);
		});
	});

	describe('a function expression name is visible only inside its own body', () => {
		// A function expression's name lives in the function's own scope, not the enclosing region.
		// Compared against the function itself: a routed name would hit the decoy entry instead.
		it.each([
			[
				'own name in its body',
				'{{ (() => { const f = function pick() { return pick === f ? 1 : 0; }; return f(); })() }}',
			],
			[
				'own name in its body, recursively',
				'{{ (function countDown(n) { return n === 0 ? 1 : countDown(n - 1); })(3) }}',
			],
		])('%s', (_, expression) => {
			expect(evaluator.execute(expression, { pick: () => 0, countDown: () => 0 })).toBe(1);
		});

		it('own name read after the function expression resolves through the data context', () => {
			const expression =
				'{{ (() => { const f = function value() { return 1; }; return value; })() }}';

			expect(evaluator.execute(expression, { value: 42 })).toBe(42);
		});
	});

	describe('bindings are left alone', () => {
		it.each([
			['rest property', '{{ (() => { const {...rest} = value; return rest.a; })() }}'],
			['rest element', '{{ (() => { const [...rest] = [1]; return rest[0]; })() }}'],
			['rest parameter', '{{ ((...rest) => rest[0])(1) }}'],
			[
				'local shadowing a host global',
				'{{ (() => { const process = value; return {...process}.a; })() }}',
			],
			['parameter shadowing a host global', '{{ ((process) => ({...process}).a)(value) }}'],
			[
				'declared function parameter shadowing a host global',
				'{{ (() => { function f(process) { return ({...process}).a; } return f(value); })() }}',
			],
			[
				'var in a nested block read outside the block',
				'{{ (() => { { var process = value; } return ({...process}).a; })() }}',
			],
			[
				'function declaration at function-body level shadowing a host global',
				'{{ (() => { function process() { return value; } return process().a; })() }}',
			],
			[
				'function declaration at function-body level, called before it is declared',
				'{{ (() => { return process().a; function process() { return value; } })() }}',
			],
			[
				'function declaration read inside its own block, shadowing a host global',
				'{{ (() => { { function process() { return value; } return process().a; } })() }}',
			],
			[
				'class declaration at function-body level shadowing a host global',
				'{{ (() => { class process { a = value.a; } return new process().a; })() }}',
			],
			[
				'multiple declarators at function-body level shadowing a host global',
				'{{ (() => { let process = value, other = 0; return {...process}.a; })() }}',
			],
		])('%s', (_, expression) => {
			expect(evaluator.execute(expression, { value: { a: 1 } })).toBe(1);
		});
	});
});

describe('generated code', () => {
	it('generates identifier code independent of the global JSON.stringify', () => {
		const [pristine] = evaluator.getExpressionCode('{{ someFreeName }}');
		expect(pristine).toContain('"someFreeName"');

		const bogus = 'BOGUS_STRINGIFY_OUTPUT';
		const originalStringify = JSON.stringify;
		let generated: string;
		try {
			JSON.stringify = (() => bogus) as unknown as typeof JSON.stringify;
			[generated] = evaluator.getExpressionCode('{{ anotherFreeName }}');
		} finally {
			JSON.stringify = originalStringify;
		}

		expect(generated).not.toContain(bogus);
		expect(generated).toBe(pristine.replace(/someFreeName/g, 'anotherFreeName'));
	});

	it('renders text chunks and the join separator independent of the global JSON.stringify', () => {
		const [pristine] = evaluator.getExpressionCode('prefix {{ value }}');
		expect(pristine).toContain('["prefix "');
		expect(pristine).toContain('].join("")');

		const bogus = 'BOGUS_STRINGIFY_OUTPUT';
		const originalStringify = JSON.stringify;
		let generated: string;
		try {
			JSON.stringify = (() => bogus) as unknown as typeof JSON.stringify;
			[generated] = evaluator.getExpressionCode('prefix {{ value }}');
		} finally {
			JSON.stringify = originalStringify;
		}

		// The text chunk and join separator render verbatim; neither is routed
		// through the global.
		expect(generated).toContain('["prefix "');
		expect(generated).toContain('].join("")');
	});

	it.each([
		['a line separator', 'a\u2028b'],
		['a paragraph separator', 'a\u2029b'],
		['quotes, a backslash and a newline', 'he said "hi"\\\n\ttab'],
	])('round-trips text chunks containing %s', (_, text) => {
		expect(evaluator.execute(`${text} {{ 1 }}`, {})).toBe(`${text} 1`);
	});
});
