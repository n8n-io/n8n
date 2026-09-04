import { shellEscape, toShellCommand } from '../../../workspace/sandbox/shell-command';

describe('shellEscape', () => {
	it('leaves a safe argument unquoted', () => {
		expect(shellEscape('--user=a@b')).toBe('--user=a@b');
	});

	it('quotes an argument with unsafe characters', () => {
		expect(shellEscape('hello world')).toBe("'hello world'");
	});

	it('quotes an argument that contains a single quote', () => {
		expect(shellEscape("it's")).toBe("'it'\\''s'");
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
});
