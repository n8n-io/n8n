import { DbQueryResultCache } from './DbQueryResultCache';
import { QueryResultCache } from './QueryResultCache';
import { DataSource } from '../data-source/DataSource';
import { TypeORMError } from '../error/TypeORMError';

/**
 * Caches query result into the database.
 */
export class QueryResultCacheFactory {
	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(protected connection: DataSource) {}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates a new query result cache based on connection options.
	 */
	create(): QueryResultCache {
		if (!this.connection.options.cache)
			throw new TypeORMError(
				`To use cache you need to enable it in connection options by setting cache: true or providing some caching options. Example: { host: ..., username: ..., cache: true }`,
			);

		const cache: any = this.connection.options.cache;

		if (cache.provider && typeof cache.provider === 'function') {
			return cache.provider(this.connection);
		}

		return new DbQueryResultCache(this.connection);
	}
}
