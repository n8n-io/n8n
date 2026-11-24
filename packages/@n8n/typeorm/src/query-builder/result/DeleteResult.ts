import { QueryResult } from '../../query-runner/QueryResult';

/**
 * Result object returned by DeleteQueryBuilder execution.
 */
export class DeleteResult {
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
	affected?: number | null;
}
