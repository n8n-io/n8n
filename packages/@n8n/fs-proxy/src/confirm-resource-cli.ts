import type { AffectedResource, ResourceDecision } from './tools/types';

/**
 * Strip control characters (including ANSI escape sequences) from a string
 * before interpolating it into a terminal prompt to prevent injection attacks.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — stripping control chars
const CONTROL_CHARS_RE = new RegExp('[\\u0000-\\u001f\\u007f]', 'g');

export function sanitizeForTerminal(value: string): string {
	return value.replace(CONTROL_CHARS_RE, '');
}

export const RESOURCE_DECISIONS: ResourceDecision[] = [
	'allowOnce',
	'allowForSession',
	'alwaysAllow',
	'denyOnce',
	'alwaysDeny',
];

export async function cliConfirmResourceAccess(
	resource: AffectedResource,
): Promise<ResourceDecision> {
	const readline = await import('node:readline');
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const question = [
		`\nPermission request — ${resource.toolGroup}: ${resource.resource}`,
		`  ${resource.description}`,
		'  1. Allow once',
		'  2. Allow for session',
		'  3. Always allow',
		'  4. Deny once',
		'  5. Always deny',
		'Choice [1-5]: ',
	].join('\n');

	return await new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			const idx = parseInt(answer.trim(), 10) - 1;
			resolve(RESOURCE_DECISIONS[idx] ?? 'denyOnce');
		});
	});
}
