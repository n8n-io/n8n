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
		])('%s', (_, expression) => {
			expect(evaluator.execute(expression, { value: { a: 1 } })).toBe(1);
		});
	});
});
