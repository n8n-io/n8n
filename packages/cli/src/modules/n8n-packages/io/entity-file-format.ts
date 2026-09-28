/**
 * The single source of entity-file bytes: exporters write them and the diff
 * engine hashes them, so both must call this function or their hashes drift
 * apart and unchanged entities show up as diffs.
 */
export function formatEntityFile(serialized: unknown): string {
	return JSON.stringify(serialized, null, '\t');
}
