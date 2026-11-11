/**
 * The single shell-escaping implementation for the sandbox adapters. Add call sites here
 * instead of writing a local quoting helper: three copies drifted apart before, which gave
 * the same argument a different quoting in each adapter.
 */

/**
 * Shell-quote an argument for safe interpolation into a shell command string.
 * Safe characters (alphanumeric, `.`, `_`, `-`, `/`, `=`, `:`, `@`, `+`) pass through.
 * Everything else is wrapped in single quotes with embedded quotes escaped, so an empty
 * argument stays a positional `''`.
 */
export function shellEscape(value: string): string {
	return /^[A-Za-z0-9_./:=@+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

/** Joins a command with its escaped arguments into a single shell command line. */
export function toShellCommand(command: string, args: string[] = []): string {
	if (args.length === 0) return command;
	return [command, ...args.map((arg) => shellEscape(arg))].join(' ');
}
