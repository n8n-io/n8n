/**
 * Marks a column to generate a value on entity insertion.
 * There are three types of generation strategy - increment, uuid and rowid (cockroachdb only).
 * Increment uses a number which increases by one on each insertion.
 * Uuid generates a special UUID token.
 * Rowid supports only in CockroachDB and uses `unique_rowid()` function
 *
 * Note, some databases do not support non-primary generation columns.
 */
export declare function Generated(strategy?: "increment" | "uuid" | "rowid"): PropertyDecorator;
