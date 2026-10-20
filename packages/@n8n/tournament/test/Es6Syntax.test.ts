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

	test('does not insert a space after a newline escape before interpolation', () => {
		const result = t.execute('{{ `\\n${items.join("\\n")}` }}', {
			items: ['- 1', '- 2', '- 3'],
		});

		expect(result).toBe('\n- 1\n- 2\n- 3');
	});

	test('does not insert a space after a real newline before interpolation', () => {
		const result = t.execute('{{ `\n${items.join("\\n")}` }}', {
			items: ['- 1', '- 2', '- 3'],
		});

		expect(result).toBe('\n- 1\n- 2\n- 3');
	});

	test('keeps text that follows a newline attached to the interpolation', () => {
		const result = t.execute('{{ `hello\nworld${name}` }}', { name: 'Ada' });

		expect(result).toBe('hello\nworldAda');
	});

	test('spread operator', () => {
		const result = t.execute('{{ Math.max(...[1, 2, 3]) }}', {});

		expect(result).toBe(3);
	});
});
