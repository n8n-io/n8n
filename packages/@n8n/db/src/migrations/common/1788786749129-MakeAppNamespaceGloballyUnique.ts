import type { MigrationContext, ReversibleMigration } from '../migration-types';

const APP_TABLE = 'app';

/**
 * An App is served at `/apps/<namespace>`, a URL that carries no project, so a
 * namespace that is only unique per project cannot be resolved to one App.
 *
 * The index is only tightened, never data: a duplicate namespace across two
 * projects fails this migration loudly instead of being renamed, because a
 * rename would silently change the public URL of a live App.
 */
export class MakeAppNamespaceGloballyUnique1788786749129 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex, dropIndex } }: MigrationContext) {
		await dropIndex(APP_TABLE, ['namespace', 'projectId'], { skipIfMissing: true });
		await createIndex(APP_TABLE, ['namespace'], true);
	}

	async down({ schemaBuilder: { createIndex, dropIndex } }: MigrationContext) {
		await dropIndex(APP_TABLE, ['namespace'], { skipIfMissing: true });
		await createIndex(APP_TABLE, ['namespace', 'projectId'], true);
	}
}
