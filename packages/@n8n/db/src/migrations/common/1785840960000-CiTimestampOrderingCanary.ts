import type { MigrationContext, ReversibleMigration } from '../migration-types';

// Deliberately timestamped below the current head migration to verify the
// migration-timestamp CI check rejects out-of-order migrations. Do not merge.
export class CiTimestampOrderingCanary1785840960000 implements ReversibleMigration {
	async up(_context: MigrationContext) {}

	async down(_context: MigrationContext) {}
}
