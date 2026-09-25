/** Formats per-node failures as `"NodeName": message`, joined with `; `. Callers add the prefix. */
export function formatNodeFailures(failures: Array<{ nodeName: string; message: string }>): string {
	return failures.map(({ nodeName, message }) => `"${nodeName}": ${message}`).join('; ');
}
