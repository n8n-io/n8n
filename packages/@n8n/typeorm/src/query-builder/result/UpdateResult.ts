import { ObjectLiteral } from '../../common/ObjectLiteral';
import { QueryResult } from '../../query-runner/QueryResult';

/**
 * Result object returned by UpdateQueryBuilder execution.
 */
export class UpdateResult {
	static from(queryResult: QueryResult) {
		const result = new this();
		result.raw = queryResult.records;
		result.affected = queryResult.affected;
		return result;
	}

	/**
	 * Raw SQL result returned by executed query.
	 */
	raw: any;

	/**
	 * Number of affected rows/documents
	 * Not all drivers support this
	 */
	affected?: number;

	/**
	 * Contains inserted entity id.
	 * Has entity-like structure (not just column database name and values).
	 */
	// identifier: ObjectLiteral[] = [];

	/**
	 * Generated values returned by a database.
	 * Has entity-like structure (not just column database name and values).
	 */
	generatedMaps: ObjectLiteral[] = [];
}
