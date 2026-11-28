import isEqual from 'lodash/isEqual';

/**
 * Names of the top-level fields whose value differs between two snapshots of
 * the same settings object. Only names are returned, never values, so the
 * result is safe to put into a telemetry or audit payload.
 */
export function getChangedFields(previous: object | undefined, next: object | undefined): string[] {
	const before: Record<string, unknown> = { ...previous };
	const after: Record<string, unknown> = { ...next };
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	return [...keys].filter((key) => !isEqual(before[key], after[key]));
}
