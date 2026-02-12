/**
 * Warning Tracker
 *
 * Tracks validation warnings that have been shown to the agent to avoid
 * repeating the same warnings. Uses code|nodeName|parameterPath as the
 * deduplication key, allowing message content to change while the location
 * stays the same.
 */

import type { ValidationWarning } from '../types';

/**
 * Generates a unique key for a warning based on its location.
 *
 * The key format is: code|nodeName|parameterPath
 * This allows deduplication by location rather than message content.
 *
 * @param warning - The warning to generate a key for
 * @returns A unique string key
 */
function getWarningKey(warning: ValidationWarning): string {
	return `${warning.code}|${warning.nodeName ?? ''}|${warning.parameterPath ?? ''}`;
}

/**
 * Tracks which validation warnings have been shown to the agent.
 *
 * Consolidates warning deduplication logic that was previously duplicated
 * in multiple places in the code builder agent.
 */
export class WarningTracker {
	private seenWarnings = new Set<string>();
	private preExistingKeys = new Set<string>();

	/**
	 * Mark warnings as pre-existing (discovered before the agent starts editing).
	 * Pre-existing warnings are annotated when shown to the agent so it can
	 * distinguish them from warnings caused by its own changes.
	 *
	 * @param warnings - Array of warnings found in the existing workflow
	 */
	markAsPreExisting(warnings: ValidationWarning[]): void {
		for (const w of warnings) {
			this.preExistingKeys.add(getWarningKey(w));
		}
	}

	/**
	 * Check whether a warning was pre-existing in the workflow before the agent edited it.
	 *
	 * @param warning - The warning to check
	 * @returns true if the warning was marked as pre-existing
	 */
	isPreExisting(warning: ValidationWarning): boolean {
		return this.preExistingKeys.has(getWarningKey(warning));
	}

	/**
	 * Filter warnings to only include those that haven't been seen before.
	 *
	 * @param warnings - Array of warnings to filter
	 * @returns Array of warnings that are new (not previously seen)
	 */
	filterNewWarnings(warnings: ValidationWarning[]): ValidationWarning[] {
		return warnings.filter((warning) => !this.seenWarnings.has(getWarningKey(warning)));
	}

	/**
	 * Mark warnings as seen so they won't be returned by filterNewWarnings.
	 *
	 * @param warnings - Array of warnings to mark as seen
	 */
	markAsSeen(warnings: ValidationWarning[]): void {
		for (const warning of warnings) {
			this.seenWarnings.add(getWarningKey(warning));
		}
	}
}
