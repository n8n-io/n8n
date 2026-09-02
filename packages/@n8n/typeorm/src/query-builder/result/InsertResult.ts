import { ObjectLiteral } from '../../common/ObjectLiteral';
import { QueryResult } from '../../query-runner/QueryResult';

/**
 * Result object returned by InsertQueryBuilder execution.
 */
export class InsertResult {
	static from(queryResult: QueryResult) {
		const result = new this();
		result.raw = queryResult.raw;
		return result;
	}

	/**
	 * Contains inserted entity id.
	 * Has entity-like structure (not just column database name and values).
	 */
	identifiers: ObjectLiteral[] = [];

	/**
	 * Generated values returned by a database.
	 * Has entity-like structure (not just column database name and values).
	 */
	generatedMaps: ObjectLiteral[] = [];

	/**
	 * Raw SQL result returned by executed query.
	 */
	raw: any;
}
