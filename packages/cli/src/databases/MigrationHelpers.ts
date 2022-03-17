import { QueryRunner } from 'typeorm';

export class MigrationHelpers {
	queryRunner: QueryRunner;

	constructor(queryRunner: QueryRunner) {
		this.queryRunner = queryRunner;
	}

	// runs an operation sequential on chunks of a query that returns a potentially large Array.
	/* eslint-disable no-await-in-loop */
	async runChunked(
		query: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		operation: (results: any[]) => Promise<void>,
		limit = 100,
	): Promise<void> {
		let offset = 0;
		let chunkedQuery: string;
		let chunkedQueryResults: unknown[];

		do {
			chunkedQuery = this.chunkQuery(query, limit, offset);
			chunkedQueryResults = (await this.queryRunner.query(chunkedQuery)) as unknown[];
			// pass a copy to prevent errors from mutation
			await operation([...chunkedQueryResults]);
			offset += limit;
		} while (chunkedQueryResults.length === limit);
	}
	/* eslint-enable no-await-in-loop */

	private chunkQuery(query: string, limit: number, offset = 0): string {
		return `
			${query}
			LIMIT ${limit}
			OFFSET ${offset}
		`;
	}
}
