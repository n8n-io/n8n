import { select } from '@inquirer/prompts';

import type { AffectedResource, ResourceDecision } from './tools/types';

/**
 * Strip control characters (including ANSI escape sequences) from a string
 * before interpolating it into a terminal prompt to prevent injection attacks.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — stripping control chars
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = new RegExp('[\\u0000-\\u001f\\u007f]', 'g');

export function sanitizeForTerminal(value: string): string {
	return value.replace(CONTROL_CHARS_RE, '');
}

export async function cliConfirmResourceAccess(
	resource: AffectedResource,
): Promise<ResourceDecision> {
	const answer = await select({
		message: `Grant permission — ${resource.toolGroup}: ${sanitizeForTerminal(resource.resource)}`,
		choices: [
			{ name: 'Allow once', value: 'allowOnce' as ResourceDecision },
			{ name: 'Allow for session', value: 'allowForSession' as ResourceDecision },
			{ name: 'Always allow', value: 'alwaysAllow' as ResourceDecision },
			{ name: 'Deny once', value: 'denyOnce' as ResourceDecision },
			{ name: 'Always deny', value: 'alwaysDeny' as ResourceDecision },
		],
	});

	return answer;
}
