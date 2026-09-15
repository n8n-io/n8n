import { shellEscape, toShellCommand } from '../../../workspace/sandbox/shell-command';

describe('shellEscape', () => {
	it('leaves a safe argument unquoted', () => {
		expect(shellEscape('--user=a@b')).toBe('--user=a@b');
	});

	it('leaves every safe character unquoted', () => {
		expect(shellEscape('aZ0_./:=@+-')).toBe('aZ0_./:=@+-');
	});

	it('quotes an argument with unsafe characters', () => {
		expect(shellEscape('hello world')).toBe("'hello world'");
	});

	it('quotes an argument that contains a single quote', () => {
		expect(shellEscape("it's")).toBe("'it'\\''s'");
	});

	it('keeps an empty argument as an empty quoted string', () => {
		expect(shellEscape('')).toBe("''");
	});
});

describe('toShellCommand', () => {
	it('returns the command alone when there are no arguments', () => {
		expect(toShellCommand('ls')).toBe('ls');
		expect(toShellCommand('ls', [])).toBe('ls');
	});

	it('joins the command with escaped arguments', () => {
		expect(toShellCommand('echo', ['--user=a@b', 'hello world'])).toBe(
			"echo --user=a@b 'hello world'",
		);
	});

	it('keeps an empty argument in the command line', () => {
		expect(toShellCommand('echo', ['', 'x'])).toBe("echo '' x");
	});
});
