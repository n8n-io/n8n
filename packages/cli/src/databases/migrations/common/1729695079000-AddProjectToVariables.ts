import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddProjectToVariables1729695079000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, addForeignKey } }: MigrationContext) {
		await addColumns('variables', [column('projectId').varchar(36)]);
		await addForeignKey('variables', 'projectId', ['project', 'id']);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('variables', ['projectId']);
	}
}
