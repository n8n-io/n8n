import { Column } from '../dsl/column';
import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const ROLE_TABLE_NAME = 'role';
const PROJECT_RELATION_TABLE_NAME = 'project_relation';
const USER_TABLE_NAME = 'user';
const PROJECT_RELATION_ROLE_IDX_NAME = 'project_relation_role_idx';
const PROJECT_RELATION_ROLE_PROJECT_IDX_NAME = 'project_relation_role_project_idx';
const USER_ROLE_IDX_NAME = 'user_role_idx';

export class AddTimestampsToRoleAndRoleIndexes1756906557570 implements IrreversibleMigration {
	async up({ schemaBuilder, queryRunner, tablePrefix }: MigrationContext) {
		// This loads the table metadata from the database and
		// feeds the query runners cache with the table metadata
		// Not doing this, seems to get TypeORM to wrongfully try to
		// add the columns twice in the same statement.
		await queryRunner.getTable(`${tablePrefix}${USER_TABLE_NAME}`);

		await schemaBuilder.addColumns(ROLE_TABLE_NAME, [
			new Column('createdAt').timestampTimezone().notNull.default('NOW()'),
			new Column('updatedAt').timestampTimezone().notNull.default('NOW()'),
		]);

		// This index should allow us to efficiently query project relations by their role
		// This will be used for counting how many users have a specific project role
		await schemaBuilder.createIndex(
			PROJECT_RELATION_TABLE_NAME,
			['role'],
			false,
			PROJECT_RELATION_ROLE_IDX_NAME,
		);

		// This index should allow us to efficiently query project relations by their role and project
		// This will be used for counting how many users in a specific project have a specific project role
		await schemaBuilder.createIndex(
			PROJECT_RELATION_TABLE_NAME,
			['projectId', 'role'],
			false,
			PROJECT_RELATION_ROLE_PROJECT_IDX_NAME,
		);

		// This index should allow us to efficiently query users by their role slug
		// This will be used for counting how many users have a specific global role
		await schemaBuilder.createIndex(USER_TABLE_NAME, ['roleSlug'], false, USER_ROLE_IDX_NAME);
	}
}
