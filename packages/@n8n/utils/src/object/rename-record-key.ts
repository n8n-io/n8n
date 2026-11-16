/**
 * Returns a copy of `record` with the `oldName` entry moved to `newName`.
 * Returns the same record when `oldName` is not an own key of it.
 */
export function renameRecordKey<T>(
	record: Record<string, T>,
	oldName: string,
	newName: string,
): Record<string, T> {
	if (!Object.hasOwn(record, oldName)) return record;
	const { [oldName]: value, ...rest } = record;
	return { ...rest, [newName]: value };
}
