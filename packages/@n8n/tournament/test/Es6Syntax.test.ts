import { Tournament } from '../src/index';

const fnStub = () => {};

describe('ES6 Syntax', () => {
	let t: Tournament;

	beforeAll(() => {
		t = new Tournament(fnStub, '___n8n_data');
	});

	test('arrow functions', () => {
		const result = t.execute('{{ () => 1 }}', {});

		expect(result instanceof Function).toBe(true);
	});

	test('interpolation in template literals', () => {
		const result = t.execute('{{ `abc ${num} def` }}', { num: 123 });

		expect(result).toBe('abc 123 def');
	});

	// https://github.com/n8n-io/n8n/issues/32262
	test('multiline template literal does not add a space before ${} after an identifier char', () => {
		const result = t.execute('{{ `\nchk_${id}` }}', { id: 123 });

		expect(result).toBe('\nchk_123');
	});

	test('multiline template literal interpolation stays correct inside a map callback', () => {
		const result = t.execute(
			'{{ people.map(p => `\nchk_${p.id}\nchk-${p.id}\n${p.first_name}_${p.id}`).join("") }}',
			{ people: [{ id: '123', first_name: 'John' }] },
		);

		expect(result).toBe('\nchk_123\nchk-123\nJohn_123');
	});

	test('spread operator', () => {
		const result = t.execute('{{ Math.max(...[1, 2, 3]) }}', {});

		expect(result).toBe(3);
	});
});
