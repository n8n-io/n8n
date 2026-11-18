import type { MigrationContext, ReversibleMigration } from '../migration-types';

const pageTable = 'page';
const column = 'isProjectSummary';

export class AddProjectSummaryToPage1795008198000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column: newColumn } }: MigrationContext) {
		await addColumns(
			pageTable,
			[
				newColumn(column)
					.bool.notNull.default(false)
					.comment('True for the page that sums up its project. At most one for each project'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(pageTable, [column], { recreatesOnSqlite: true });
	}
}
