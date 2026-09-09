/** Dated snapshot suffixes: Anthropic `-20251001`, OpenAI `-2024-08-06`. */
export const SNAPSHOT_SUFFIX = /-(?:\d{8}|\d{4}-\d{2}-\d{2})$/;

/** Versionless alias of a dated snapshot id (`claude-haiku-4-5-20251001` → `claude-haiku-4-5`). */
export function stripSnapshotSuffix(id: string): string {
	return id.replace(SNAPSHOT_SUFFIX, '');
}
