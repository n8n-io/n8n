/**
 * Quote a value for use as one POSIX shell argument.
 *
 * Each single quote becomes the `'\''` sequence (close-quote, escaped quote,
 * reopen-quote), so the value stays literal and cannot end the argument.
 */
export function quoteShellArg(value: string): string {
	return `'${value.replaceAll("'", "'\\''")}'`;
}
