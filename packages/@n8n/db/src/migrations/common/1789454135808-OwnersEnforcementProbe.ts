import type { MigrationContext, ReversibleMigration } from '../migration-types';

// Probe for the OWNERS review check on this branch. Not registered, does nothing.
export class OwnersEnforcementProbe1789454135808 implements ReversibleMigration {
	async up(_context: MigrationContext) {}

	async down(_context: MigrationContext) {}
}
