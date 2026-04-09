/**
 * Removes entries from a record where the value is null or undefined.
 * @param record - The input object whose entries may be null or undefined.
 * @returns A new object containing only entries with non-null and non-undefined values.
 */
export function removeUndefinedEntries<T>(
  record: Record<string, T | undefined>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).filter(([_key, value]) => value != null),
  ) as Record<string, T>;
}
