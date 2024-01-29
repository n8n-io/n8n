import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import type { User } from '@/databases/entities/User';
import { generateNanoId } from '@/databases/utils/generators';
import type { MigrationContext, IrreversibleMigration } from '@db/types';

const projectAdminRole: ProjectRole = 'project:admin';
const projectTable = 'project';
const projectRelationTable = 'project_relation';

type Table = 'shared_workflow' | 'shared_credentials';

const resourceIdColumns: Record<Table, string> = {
	shared_credentials: 'credentialsId',
	shared_workflow: 'workflowId',
};

export class MigrateToProjects1706072166570 implements IrreversibleMigration {
	async alterSharedTable(
		table: Table,
		{
			escape,
			isMysql,
			runQuery,
			schemaBuilder: { addForeignKey, addColumns, createIndex, column },
		}: MigrationContext,
	) {
		// Add projectId column, this is set to a blank string by default because it's a primary key
		const projectIdColumn = column('projectId').varchar(36).primary.default("''");
		await addColumns(table, [projectIdColumn]);
		await addForeignKey(table, 'projectId', ['project', 'id']);

		const tableName = escape.tableName(table);
		const projectName = escape.tableName(projectTable);
		const relationTableName = escape.tableName(projectRelationTable);
		const resourceIdColumn = resourceIdColumns[table];

		// Populate projectId
		const subQuery = `
				SELECT P.id as projectId, T.userId
				FROM ${relationTableName} T
				LEFT JOIN ${projectName} P
				ON T.projectId = P.id AND P.type = 'personal'
				LEFT JOIN ${tableName} S
				ON T.userId = S.userId
				WHERE P.id IS NOT NULL
		`;
		const swQuery = isMysql
			? `UPDATE ${tableName}, (${subQuery}) as mapping
				    SET ${tableName}.projectId = mapping.projectId
				    WHERE ${tableName}.userId = mapping.userId`
			: `UPDATE ${tableName}
						SET projectId = mapping.projectId
				    FROM (${subQuery}) as mapping
				    WHERE ${tableName}.userId = mapping.userId`;

		await runQuery(swQuery);

		// Index the new projectId column
		await createIndex(table, ['projectId']);

		// Set up new composite unique index
		await createIndex(table, ['projectId', resourceIdColumn], true);
	}

	async createUserPersonalProjects({ runQuery, runInBatches, escape }: MigrationContext) {
		const userTable = escape.tableName('user');
		const projectName = escape.tableName(projectTable);
		const projectRelationName = escape.tableName('project_relation');
		const getUserQuery = `SELECT id FROM ${userTable}`;
		await runInBatches<Pick<User, 'id'>>(getUserQuery, async (users) => {
			await Promise.all(
				users.map(async (user) => {
					const projectId = generateNanoId();
					await runQuery(`INSERT INTO ${projectName} (id, type) VALUES (:projectId, 'personal')`, {
						projectId,
					});

					await runQuery(
						`INSERT INTO ${projectRelationName} (projectId, userId, role) VALUES (:projectId, :userId, :projectRole)`,
						{
							projectId,
							userId: user.id,
							projectRole: projectAdminRole,
						},
					);
				}),
			);
		});
	}

	async up(context: MigrationContext) {
		await this.createUserPersonalProjects(context);
		await this.alterSharedTable('shared_credentials', context);
		await this.alterSharedTable('shared_workflow', context);
	}
}
