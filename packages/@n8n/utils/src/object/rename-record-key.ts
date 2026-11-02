/**
 * Returns a copy of `record` with the `oldName` entry moved to `newName`.
 * Returns the same record when it has no `oldName` entry.
 */
export function renameRecordKey<T>(
	record: Record<string, T>,
	oldName: string,
	newName: string,
): Record<string, T> {
	if (!record[oldName]) return record;
	const { [oldName]: value, ...rest } = record;
	return { ...rest, [newName]: value };
}
