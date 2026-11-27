/**
 * For a write that must not change `updated_at` of the row. TypeORM sets
 * `updated_at` to the current time in each UPDATE that does not name the
 * column. Readers use `updated_at` of a settled step as the time it settled,
 * and the execution view returns `updated_at` of an execution.
 */
export const KEEP_UPDATED_AT = { updatedAt: () => 'updated_at' };
