/** Quote a value for use as one POSIX shell argument. */
export function quoteShellArg(value: string): string {
	return `'${value.replaceAll("'", "'\"'\"'")}'`;
}
