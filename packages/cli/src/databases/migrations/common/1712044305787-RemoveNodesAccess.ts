import type { IrreversibleMigration, MigrationContext } from '@db/types';

export class RemoveNodesAccess1712044305787 implements IrreversibleMigration {
	async up({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('credentials_entity', ['nodesAccess']);
	}
}
