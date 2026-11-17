/**
 * The locale specs of a combination for the target Node.js (`node-identity.ts`): from the
 * table (`locale-data.generated.ts`) or derived in this process (`locale-derive.ts`).
 */
import { localeIdentity } from '../node-identity.ts';
import { LOCALE_TABLE, LOCALE_TABLE_IDENTITY } from './locale-data.generated.ts';
import type { TableEntry } from './locale-derive.ts';
import { derivedLocaleEntry } from './locale-derive.ts';

/** A table of specs and the locale identity of the Node.js that made it. */
export interface LocaleTable {
	identity: string;
	entries: Record<string, TableEntry>;
}

const COMMITTED: LocaleTable = { identity: LOCALE_TABLE_IDENTITY, entries: LOCALE_TABLE };

/**
 * The specs of a combination for the target, or undefined (the call stays in the host): from
 * the table when the table was made with the locale identity of the target, else derived in
 * this process when the target is this process. The name lists of a date spec of the table
 * are indexes in `LOCALE_NAMES`; those of a derived spec are the lists.
 */
export function localeEntry(
	method: string,
	locale: string | null,
	options: Record<string, unknown>,
	table: LocaleTable = COMMITTED,
): TableEntry | undefined {
	const key = JSON.stringify([method, locale, options]);
	if (table.identity === localeIdentity() && Object.hasOwn(table.entries, key)) {
		return table.entries[key];
	}
	return derivedLocaleEntry(method, locale, options);
}
