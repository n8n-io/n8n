/** Formats per-node failures as `"NodeName": message`, joined with `; `. Callers add their own prefix. */
export function formatNodeFailures(failures: Array<{ nodeName: string; message: string }>): string {
	return failures.map(({ nodeName, message }) => `"${nodeName}": ${message}`).join('; ');
}

/** The activation error of a failed publication: one failure verbatim, several prefixed and joined. */
export function formatFailedActivationError(
	failures: Array<{ nodeName: string; message: string }>,
): string {
	if (failures.length === 1) return failures[0].message;
	return `Triggers failed to activate: ${formatNodeFailures(failures)}`;
}
