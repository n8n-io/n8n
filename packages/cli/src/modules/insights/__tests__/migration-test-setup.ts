import type { TestMigrationContext } from '@n8n/backend-test-utils';

/**
 * Test values for BIGINT migration validation.
 * Covers INT32 boundaries and BIGINT capabilities.
 */
export const BOUNDARY_TEST_VALUES = {
	zero: 0,
	positiveOne: 1,
	negativeOne: -1,
	intMax: 2_147_483_647, // 2^31 - 1 (max signed 32-bit int)
	intMin: -2_147_483_648, // -2^31 (min signed 32-bit int)
	beyondInt: 2_147_483_648, // For post-migration testing (exceeds INT32)
	bigintMax: 9_223_372_036_854_775_807n, // 2^63 - 1 (max signed 64-bit int)
} as const;

/**
 * Insert raw insights data using SQL (compatible with pre-migration INT schema).
 * Uses database-specific helpers for table names and escaping.
 */
export async function insertPreMigrationRawData(
	context: TestMigrationContext,
	metaId: number,
	testValues: number[],
): Promise<void> {
	const tableName = context.escape.tableName('insights_raw');
	for (const value of testValues) {
		await context.queryRunner.query(
			`INSERT INTO ${tableName} (metaId, type, value, timestamp) VALUES (?, ?, ?, ?)`,
			[metaId, 0, value, new Date()],
		);
	}
}

/**
 * Insert insights_by_period data using SQL (compatible with pre-migration INT schema).
 * Uses database-specific helpers for table names and escaping.
 */
export async function insertPreMigrationPeriodData(
	context: TestMigrationContext,
	metaId: number,
	testValues: number[],
): Promise<void> {
	const tableName = context.escape.tableName('insights_by_period');
	const baseDate = new Date('2025-01-01T00:00:00.000Z');
	for (let i = 0; i < testValues.length; i++) {
		const periodStart = new Date(baseDate.getTime() + i * 3600000); // Add 1 hour per iteration
		await context.queryRunner.query(
			`INSERT INTO ${tableName} (metaId, type, value, periodUnit, periodStart) VALUES (?, ?, ?, ?, ?)`,
			[metaId, 0, testValues[i], 0, periodStart.toISOString()],
		);
	}
}
