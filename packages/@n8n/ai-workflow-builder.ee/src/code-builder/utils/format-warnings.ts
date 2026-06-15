/**
 * Format validation warnings for display to the agent.
 *
 * When a `WarningTracker` is provided, warnings that existed before the agent
 * started editing are tagged with `[pre-existing]` so the agent can make an
 * informed decision about whether to fix them.
 */

import type { WarningTracker } from '../state/warning-tracker';
import type { ValidationWarning } from '../types';

/**
 * Format an array of validation warnings into a bullet-list string.
 *
 * Each warning is formatted as: `- [CODE] message`
 * If a `warningTracker` is supplied and the warning is pre-existing, the
 * format becomes: `- [CODE] [pre-existing] message`
 *
 * @param warnings - The warnings to format
 * @param warningTracker - Optional tracker to annotate pre-existing warnings
 * @returns Newline-separated formatted string
 */
export function formatWarnings(
	warnings: ValidationWarning[],
	warningTracker?: WarningTracker,
): string {
	return warnings
		.map((w) => {
			const tag = warningTracker?.isPreExisting(w) ? ' [pre-existing]' : '';
			return `- [${w.code}]${tag} ${w.message}`;
		})
		.join('\n');
}
