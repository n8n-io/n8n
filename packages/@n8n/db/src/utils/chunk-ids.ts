import chunk from 'lodash/chunk';

/** Safe for three binds per ID: SQLite allows 32,766 binds; PostgreSQL, 65,535. */
const ID_QUERY_BATCH_SIZE = 10_000;

export function chunkIds<T>(ids: T[]): T[][] {
	return chunk(ids, ID_QUERY_BATCH_SIZE);
}
