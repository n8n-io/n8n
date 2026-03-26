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

export const RESOURCE_DECISIONS: Record<ResourceDecision, string> = {
	allowOnce: 'Allow once',
	allowForSession: 'Allow for session',
	alwaysAllow: 'Always allow',
	denyOnce: 'Deny once',
	alwaysDeny: 'Always deny',
} as const;

export async function cliConfirmResourceAccess(
	resource: AffectedResource,
): Promise<ResourceDecision> {
	const answer = await select({
		message: `Grant permission — ${resource.toolGroup}: ${sanitizeForTerminal(resource.resource)}`,
		choices: (Object.entries(RESOURCE_DECISIONS) as Array<[ResourceDecision, string]>).map(
			([value, name]) => ({
				name,
				value,
			}),
		),
	});

	return answer;
}
