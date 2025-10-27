import type { ProjectRole } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import type { User } from '../../entities';
import { generateNanoId } from '../../utils/generators';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

const projectAdminRole: ProjectRole = 'project:personalOwner';

type RelationTable = 'shared_workflow' | 'shared_credentials';

const table = {
	sharedCredentials: 'shared_credentials',
	sharedCredentialsTemp: 'shared_credentials_2',
	sharedWorkflow: 'shared_workflow',
	sharedWorkflowTemp: 'shared_workflow_2',
	project: 'project',
	user: 'user',
	projectRelation: 'project_relation',
} as const;

function escapeNames(escape: MigrationContext['escape']) {
	const t = {
		project: escape.tableName(table.project),
		projectRelation: escape.tableName(table.projectRelation),
		sharedCredentials: escape.tableName(table.sharedCredentials),
		sharedCredentialsTemp: escape.tableName(table.sharedCredentialsTemp),
		sharedWorkflow: escape.tableName(table.sharedWorkflow),
		sharedWorkflowTemp: escape.tableName(table.sharedWorkflowTemp),
		user: escape.tableName(table.user),
	};
	const c = {
		createdAt: escape.columnName('createdAt'),
		updatedAt: escape.columnName('updatedAt'),
		workflowId: escape.columnName('workflowId'),
		credentialsId: escape.columnName('credentialsId'),
		userId: escape.columnName('userId'),
		projectId: escape.columnName('projectId'),
		firstName: escape.columnName('firstName'),
		lastName: escape.columnName('lastName'),
	};

	return { t, c };
}

export class CreateProject1714133768519 implements ReversibleMigration {
	async setupTables({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.project).withColumns(
			column('id').varchar(36).primary.notNull,
			column('name').varchar(255).notNull,
			column('type').varchar(36).notNull,
		).withTimestamps;

		await createTable(table.projectRelation)
			.withColumns(
				column('projectId').varchar(36).primary.notNull,
				column('userId').uuid.primary.notNull,
				column('role').varchar().notNull,
			)
			.withIndexOn('projectId')
			.withIndexOn('userId')
			.withForeignKey('projectId', {
				tableName: table.project,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async alterSharedTable(
		relationTableName: RelationTable,
		{
			escape,
			isMysql,
			runQuery,
			schemaBuilder: { addForeignKey, addColumns, addNotNull, createIndex, column },
		}: MigrationContext,
	) {
		const projectIdColumn = column('projectId').varchar(36).default('NULL');
		await addColumns(relationTableName, [projectIdColumn]);

		const relationTable = escape.tableName(relationTableName);
		const { t, c } = escapeNames(escape);

		// Populate projectId
		const subQuery = `
				SELECT P.id as ${c.projectId}, T.${c.userId}
				FROM ${t.projectRelation} T
				LEFT JOIN ${t.project} P
				ON T.${c.projectId} = P.id AND P.type = 'personal'
				LEFT JOIN ${relationTable} S
				ON T.${c.userId} = S.${c.userId}
				WHERE P.id IS NOT NULL
		`;
		const swQuery = isMysql
			? `UPDATE ${relationTable}, (${subQuery}) as mapping
				    SET ${relationTable}.${c.projectId} = mapping.${c.projectId}
				    WHERE ${relationTable}.${c.userId} = mapping.${c.userId}`
			: `UPDATE ${relationTable}
						SET ${c.projectId} = mapping.${c.projectId}
				    FROM (${subQuery}) as mapping
				    WHERE ${relationTable}.${c.userId} = mapping.${c.userId}`;

		await runQuery(swQuery);

		await addForeignKey(relationTableName, 'projectId', ['project', 'id']);

		await addNotNull(relationTableName, 'projectId');

		// Index the new projectId column
		await createIndex(relationTableName, ['projectId']);
	}

	async alterSharedCredentials({
		escape,
		runQuery,
		schemaBuilder: { column, createTable, dropTable },
	}: MigrationContext) {
		await createTable(table.sharedCredentialsTemp)
			.withColumns(
				column('credentialsId').varchar(36).notNull.primary,
				column('projectId').varchar(36).notNull.primary,
				column('role').text.notNull,
			)
			.withForeignKey('credentialsId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: table.project,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		const { c, t } = escapeNames(escape);

		await runQuery(`
			INSERT INTO ${t.sharedCredentialsTemp} (${c.createdAt}, ${c.updatedAt}, ${c.credentialsId}, ${c.projectId}, role)
			SELECT ${c.createdAt}, ${c.updatedAt}, ${c.credentialsId}, ${c.projectId}, role FROM ${t.sharedCredentials};
		`);

		await dropTable(table.sharedCredentials);
		await runQuery(`ALTER TABLE ${t.sharedCredentialsTemp} RENAME TO ${t.sharedCredentials};`);
	}

	async alterSharedWorkflow({
		escape,
		runQuery,
		schemaBuilder: { column, createTable, dropTable },
	}: MigrationContext) {
		await createTable(table.sharedWorkflowTemp)
			.withColumns(
				column('workflowId').varchar(36).notNull.primary,
				column('projectId').varchar(36).notNull.primary,
				column('role').text.notNull,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: table.project,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		const { c, t } = escapeNames(escape);

		await runQuery(`
			INSERT INTO ${t.sharedWorkflowTemp} (${c.createdAt}, ${c.updatedAt}, ${c.workflowId}, ${c.projectId}, role)
			SELECT ${c.createdAt}, ${c.updatedAt}, ${c.workflowId}, ${c.projectId}, role FROM ${t.sharedWorkflow};
		`);

		await dropTable(table.sharedWorkflow);
		await runQuery(`ALTER TABLE ${t.sharedWorkflowTemp} RENAME TO ${t.sharedWorkflow};`);
	}

	async createUserPersonalProjects({ runQuery, runInBatches, escape }: MigrationContext) {
		const { c, t } = escapeNames(escape);
		const getUserQuery = `SELECT id, ${c.firstName}, ${c.lastName}, email FROM ${t.user}`;
		await runInBatches<Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>>(
			getUserQuery,
			async (users) => {
				await Promise.all(
					users.map(async (user) => {
						const projectId = generateNanoId();
						const name = this.createPersonalProjectName(user.firstName, user.lastName, user.email);
						await runQuery(
							`INSERT INTO ${t.project} (id, type, name) VALUES (:projectId, 'personal', :name)`,
							{
								projectId,
								name,
							},
						);

						await runQuery(
							`INSERT INTO ${t.projectRelation} (${c.projectId}, ${c.userId}, role) VALUES (:projectId, :userId, :projectRole)`,
							{
								projectId,
								userId: user.id,
								projectRole: projectAdminRole,
							},
						);
					}),
				);
			},
		);
	}

	// Duplicated from packages/@n8n/db/src/entities/User.ts
	// Reason:
	// This migration should work the same even if we refactor the function in
	// `User.ts`.
	createPersonalProjectName(firstName?: string, lastName?: string, email?: string) {
		if (firstName && lastName && email) {
			return `${firstName} ${lastName} <${email}>`;
		} else if (email) {
			return `<${email}>`;
		} else {
			return 'Unnamed Project';
		}
	}

	async up(context: MigrationContext) {
		await this.setupTables(context);
		await this.createUserPersonalProjects(context);
		await this.alterSharedTable(table.sharedCredentials, context);
		await this.alterSharedCredentials(context);
		await this.alterSharedTable(table.sharedWorkflow, context);
		await this.alterSharedWorkflow(context);
	}

	async down({ isMysql, logger, escape, runQuery, schemaBuilder: sb }: MigrationContext) {
		const { t, c } = escapeNames(escape);

		// 0. check if all projects are personal projects
		const [{ count: nonPersonalProjects }] = await runQuery<[{ count: number }]>(
			`SELECT COUNT(*) FROM ${t.project} WHERE type <> 'personal';`,
		);

		if (nonPersonalProjects > 0) {
			const message =
				'Down migration only possible when there are no projects. Please delete all projects that were created via the UI first.';
			logger.error(message);
			throw new UserError(message);
		}

		// 1. create temp table for shared workflows
		await sb
			.createTable(table.sharedWorkflowTemp)
			.withColumns(
				sb.column('workflowId').varchar(36).notNull.primary,
				sb.column('userId').uuid.notNull.primary,
				sb.column('role').text.notNull,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
				// In MySQL foreignKey names must be unique across all tables and
				// TypeORM creates predictable names based on the columnName.
				// So the current shared_workflow table's foreignKey for workflowId would
				// clash with this one if we don't create a random name.
				name: isMysql ? nanoid() : undefined,
			})
			.withForeignKey('userId', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		// 2. migrate data into temp table
		await runQuery(`
			INSERT INTO ${t.sharedWorkflowTemp} (${c.createdAt}, ${c.updatedAt}, ${c.workflowId}, role, ${c.userId})
			SELECT SW.${c.createdAt}, SW.${c.updatedAt}, SW.${c.workflowId}, SW.role, PR.${c.userId}
			FROM ${t.sharedWorkflow} SW
			LEFT JOIN project_relation PR on SW.${c.projectId} = PR.${c.projectId} AND PR.role = 'project:personalOwner'
		`);

		// 3. drop shared workflow table
		await sb.dropTable(table.sharedWorkflow);

		// 4. rename temp table
		await runQuery(`ALTER TABLE ${t.sharedWorkflowTemp} RENAME TO ${t.sharedWorkflow};`);

		// 5. same for shared creds
		await sb
			.createTable(table.sharedCredentialsTemp)
			.withColumns(
				sb.column('credentialsId').varchar(36).notNull.primary,
				sb.column('userId').uuid.notNull.primary,
				sb.column('role').text.notNull,
			)
			.withForeignKey('credentialsId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
				// In MySQL foreignKey names must be unique across all tables and
				// TypeORM creates predictable names based on the columnName.
				// So the current shared_credentials table's foreignKey for credentialsId would
				// clash with this one if we don't create a random name.
				name: isMysql ? nanoid() : undefined,
			})
			.withForeignKey('userId', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
		await runQuery(`
			INSERT INTO ${t.sharedCredentialsTemp} (${c.createdAt}, ${c.updatedAt}, ${c.credentialsId}, role, ${c.userId})
			SELECT SC.${c.createdAt}, SC.${c.updatedAt}, SC.${c.credentialsId}, SC.role, PR.${c.userId}
			FROM ${t.sharedCredentials} SC
			LEFT JOIN project_relation PR on SC.${c.projectId} = PR.${c.projectId} AND PR.role = 'project:personalOwner'
		`);
		await sb.dropTable(table.sharedCredentials);
		await runQuery(`ALTER TABLE ${t.sharedCredentialsTemp} RENAME TO ${t.sharedCredentials};`);

		// 6. drop project and project relation table
		await sb.dropTable(table.projectRelation);
		await sb.dropTable(table.project);
	}
}
