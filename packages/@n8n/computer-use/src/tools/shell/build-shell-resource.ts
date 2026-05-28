import * as path from 'node:path';

const WRAPPER_COMMANDS = new Set(['sudo', 'env', 'time', 'nice', 'nohup', 'xargs', 'doas']);

/**
 * Returns true when the command contains syntax that makes static program
 * extraction unreliable: shell operators (|, ;, &), command substitution
 * ($(...) or backticks), process substitution <(...) / >(...), or newlines
 * (shell treats them as command separators like ;).
 */
const COMPLEX_TOKENS = ['|', ';', '&', '$(', '`', '<(', '>(', '\n'];

function isComplex(command: string): boolean {
	return COMPLEX_TOKENS.some((token) => command.includes(token));
}

/**
 * Build a shell resource identifier for permission checking.
 *
 * Simple, recognizable commands: strip wrapper commands and env var
 * assignments, return `basename(program) args`.
 *
 * Everything else (chained operators, command/process substitution,
 * variable-indirect execution, relative paths): return the full command
 * unchanged so the confirmation prompt shows exactly what will run.
 */
export function buildShellResource(command: string): string {
	const trimmed = command.trim();

	if (isComplex(trimmed)) return trimmed;

	const words = trimmed.split(/\s+/);
	let programIndex = -1;

	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		if (word.startsWith('-')) continue;
		if (/^[A-Z_a-z][A-Z0-9_a-z]*=/.test(word)) continue;
		if (WRAPPER_COMMANDS.has(word)) continue;
		programIndex = i;
		break;
	}

	if (programIndex === -1) return trimmed;

	const program = words[programIndex];

	// Variable reference or relative path — context-dependent, return full command
	if (program.startsWith('$') || program.startsWith('./') || program.startsWith('../')) {
		return trimmed;
	}

	const basename = path.basename(program);
	const rest = words.slice(programIndex + 1);

	return rest.length > 0 ? `${basename} ${rest.join(' ')}` : basename;
}
