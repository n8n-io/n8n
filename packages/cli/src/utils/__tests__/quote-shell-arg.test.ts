import { execFileSync } from 'node:child_process';

import { quoteShellArg } from '../quote-shell-arg';

describe('quoteShellArg', () => {
	const testCases = [
		['a plain value', 'hello', "'hello'"],
		['one single quote', "it's", "'it'\\''s'"],
		['several single quotes', "it's John's", "'it'\\''s John'\\''s'"],
		['an empty value', '', "''"],
		['shell metacharacters', '$(name); `name` $HOME " \\ *\n', "'$(name); `name` $HOME \" \\ *\n'"],
	];

	it.each(testCases)('quotes %s as one literal argument', (_description, value, expected) => {
		expect(quoteShellArg(value)).toBe(expected);
	});

	it.skipIf(process.platform === 'win32').each(testCases)(
		'round-trips %s through a POSIX shell',
		(_description, value) => {
			const quoted = quoteShellArg(value);

			expect(
				execFileSync('sh', ['-c', `set -- ${quoted}; printf '%s\\n' "$#"; printf '%s' "$1"`], {
					encoding: 'utf8',
				}),
			).toBe(`1\n${value}`);
		},
	);
});
