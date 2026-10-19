import { execFileSync } from 'node:child_process';

import { quoteShellArg } from '../quote-shell-arg';

describe('quoteShellArg', () => {
	it.each([
		['a plain value', 'hello', "'hello'"],
		['one single quote', "it's", "'it'\\''s'"],
		['several single quotes', "it's John's", "'it'\\''s John'\\''s'"],
		['an empty value', '', "''"],
		['shell metacharacters', '$(name); `name` $HOME " \\ *\n', "'$(name); `name` $HOME \" \\ *\n'"],
	])('quotes %s as one literal argument', (_description, value, expected) => {
		const quoted = quoteShellArg(value);

		expect(quoted).toBe(expected);
		expect(
			execFileSync('sh', ['-c', `set -- ${quoted}; printf '%s\\n' "$#"; printf '%s' "$1"`], {
				encoding: 'utf8',
			}),
		).toBe(`1\n${value}`);
	});
});
