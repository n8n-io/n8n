import { z } from 'zod';

export const manifestSchema = z.object({
	/**
	 * Name of the last executed migration in the database the tarball was exported from.
	 * @example 'CreateAnnotationTables1724753530828'
	 */
	lastExecutedMigration: z.string(),

	/** Type of database the tarball was exported from. */
	sourceDbType: z.union([
		z.literal('sqlite'),
		z.literal('mariadb'),
		z.literal('mysqldb'),
		z.literal('postgresdb'),
	]),

	/**
	 * ISO-8601 timestamp of when the tarball was exported.
	 * @example '2021-01-01T11:11:11.111Z'
	 */
	exportedAt: z.string(),

	/**
	 * Number of rows in each populated table being exported.
	 * @example { 'workflow_entity': 123, 'credentials_entity': 456 }
	 */
	rowCounts: z.record(z.string(), z.number()),

	/**
	 * Incremental ID sequences in tables being exported.
	 * @example [ { name: 'workflow_entity', value: 123 }, { name: 'credentials_entity', value: 456 } ]
	 */
	sequences: z.record(z.string(), z.number()),
});
