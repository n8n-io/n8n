import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * MultitenantTransformation Migration
 *
 * This migration transforms the n8n database schema to support true multi-tenancy by:
 * 1. Moving ownership from shared_workflow/shared_credentials tables to direct projectId columns
 * 2. Removing the shared_workflow and shared_credentials tables
 * 3. Establishing direct foreign key relationships between workflows/credentials and projects
 *
 * Migration Steps (up):
 * - Add projectId column to workflow_entity table
 * - Migrate workflow ownership data from shared_workflow (role='workflow:owner')
 * - Add projectId column to credentials_entity table
 * - Migrate credential ownership data from shared_credentials (role='credential:owner')
 * - Drop shared_workflow and shared_credentials tables
 *
 * Rollback Steps (down):
 * - Recreate shared_workflow and shared_credentials tables
 * - Migrate data back from workflow_entity.projectId and credentials_entity.projectId
 * - Remove projectId columns from workflow_entity and credentials_entity
 */

const table = {
	workflow: 'workflow_entity',
	credentials: 'credentials_entity',
	sharedWorkflow: 'shared_workflow',
	sharedCredentials: 'shared_credentials',
	project: 'project',
} as const;

function escapeNames(escape: MigrationContext['escape']) {
	const t = {
		workflow: escape.tableName(table.workflow),
		credentials: escape.tableName(table.credentials),
		sharedWorkflow: escape.tableName(table.sharedWorkflow),
		sharedCredentials: escape.tableName(table.sharedCredentials),
		project: escape.tableName(table.project),
	};

	const c = {
		id: escape.columnName('id'),
		projectId: escape.columnName('projectId'),
		workflowId: escape.columnName('workflowId'),
		credentialsId: escape.columnName('credentialsId'),
		role: escape.columnName('role'),
		active: escape.columnName('active'),
		createdAt: escape.columnName('createdAt'),
		updatedAt: escape.columnName('updatedAt'),
	};

	return { t, c };
}

export class MultitenantTransformation1762511301780 implements ReversibleMigration {
	/**
	 * Add projectId column to workflow_entity and migrate data from shared_workflow
	 */
	async migrateWorkflows({
		escape,
		isMysql,
		runQuery,
		logger,
		schemaBuilder: { addColumns, addForeignKey, addNotNull, createIndex, column },
	}: MigrationContext) {
		logger.info('Starting workflow migration: adding projectId column to workflow_entity');

		// Step 1: Add projectId column (nullable initially)
		const projectIdColumn = column('projectId').varchar(36);
		await addColumns(table.workflow, [projectIdColumn]);

		const { t, c } = escapeNames(escape);

		// Step 2: Check for workflows without owners
		const [{ count: orphanedWorkflows }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count
			FROM ${t.workflow} W
			WHERE NOT EXISTS (
				SELECT 1 FROM ${t.sharedWorkflow} SW
				WHERE SW.${c.workflowId} = W.${c.id}
				AND SW.${c.role} = 'workflow:owner'
			)
		`);

		if (orphanedWorkflows > 0) {
			const message = `Found ${orphanedWorkflows} workflows without an owner. Each workflow must have an owner project before migration can proceed. Please fix data integrity issues first.`;
			logger.error(message);
			throw new Error(message);
		}

		// Step 3: Migrate projectId from shared_workflow where role='workflow:owner'
		logger.info('Migrating workflow ownership data from shared_workflow');

		const subQuery = `
			SELECT SW.${c.projectId}, W.${c.id}
			FROM ${t.workflow} W
			INNER JOIN ${t.sharedWorkflow} SW
			ON W.${c.id} = SW.${c.workflowId}
			WHERE SW.${c.role} = 'workflow:owner'
		`;

		const updateQuery = isMysql
			? `UPDATE ${t.workflow}, (${subQuery}) as mapping
					SET ${t.workflow}.${c.projectId} = mapping.${c.projectId}
					WHERE ${t.workflow}.${c.id} = mapping.${c.id}`
			: `UPDATE ${t.workflow}
					SET ${c.projectId} = mapping.${c.projectId}
					FROM (${subQuery}) as mapping
					WHERE ${t.workflow}.${c.id} = mapping.${c.id}`;

		await runQuery(updateQuery);

		// Step 4: Verify all workflows have projectId set
		const [{ count: workflowsWithoutProject }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count
			FROM ${t.workflow}
			WHERE ${c.projectId} IS NULL
		`);

		if (workflowsWithoutProject > 0) {
			const message = `Migration failed: ${workflowsWithoutProject} workflows still have NULL projectId after migration`;
			logger.error(message);
			throw new Error(message);
		}

		// Step 5: Make projectId NOT NULL
		await addNotNull(table.workflow, 'projectId');

		// Step 6: Add foreign key constraint with CASCADE DELETE
		await addForeignKey(table.workflow, 'projectId', [table.project, 'id'], undefined, 'CASCADE');

		// Step 7: Create indexes for performance
		await createIndex(table.workflow, ['projectId'], false, 'idx_workflow_project_id');
		await createIndex(
			table.workflow,
			['projectId', 'active'],
			false,
			'idx_workflow_project_active',
		);

		logger.info('Workflow migration completed successfully');
	}

	/**
	 * Add projectId column to credentials_entity and migrate data from shared_credentials
	 */
	async migrateCredentials({
		escape,
		isMysql,
		runQuery,
		logger,
		schemaBuilder: { addColumns, addForeignKey, addNotNull, createIndex, column },
	}: MigrationContext) {
		logger.info('Starting credentials migration: adding projectId column to credentials_entity');

		// Step 1: Add projectId column (nullable initially)
		const projectIdColumn = column('projectId').varchar(36);
		await addColumns(table.credentials, [projectIdColumn]);

		const { t, c } = escapeNames(escape);

		// Step 2: Check for credentials without owners
		const [{ count: orphanedCredentials }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count
			FROM ${t.credentials} C
			WHERE NOT EXISTS (
				SELECT 1 FROM ${t.sharedCredentials} SC
				WHERE SC.${c.credentialsId} = C.${c.id}
				AND SC.${c.role} = 'credential:owner'
			)
		`);

		if (orphanedCredentials > 0) {
			const message = `Found ${orphanedCredentials} credentials without an owner. Each credential must have an owner project before migration can proceed. Please fix data integrity issues first.`;
			logger.error(message);
			throw new Error(message);
		}

		// Step 3: Migrate projectId from shared_credentials where role='credential:owner'
		logger.info('Migrating credential ownership data from shared_credentials');

		const subQuery = `
			SELECT SC.${c.projectId}, C.${c.id}
			FROM ${t.credentials} C
			INNER JOIN ${t.sharedCredentials} SC
			ON C.${c.id} = SC.${c.credentialsId}
			WHERE SC.${c.role} = 'credential:owner'
		`;

		const updateQuery = isMysql
			? `UPDATE ${t.credentials}, (${subQuery}) as mapping
					SET ${t.credentials}.${c.projectId} = mapping.${c.projectId}
					WHERE ${t.credentials}.${c.id} = mapping.${c.id}`
			: `UPDATE ${t.credentials}
					SET ${c.projectId} = mapping.${c.projectId}
					FROM (${subQuery}) as mapping
					WHERE ${t.credentials}.${c.id} = mapping.${c.id}`;

		await runQuery(updateQuery);

		// Step 4: Verify all credentials have projectId set
		const [{ count: credentialsWithoutProject }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count
			FROM ${t.credentials}
			WHERE ${c.projectId} IS NULL
		`);

		if (credentialsWithoutProject > 0) {
			const message = `Migration failed: ${credentialsWithoutProject} credentials still have NULL projectId after migration`;
			logger.error(message);
			throw new Error(message);
		}

		// Step 5: Make projectId NOT NULL
		await addNotNull(table.credentials, 'projectId');

		// Step 6: Add foreign key constraint with CASCADE DELETE
		await addForeignKey(
			table.credentials,
			'projectId',
			[table.project, 'id'],
			undefined,
			'CASCADE',
		);

		// Step 7: Create index for performance
		await createIndex(table.credentials, ['projectId'], false, 'idx_credentials_project_id');

		logger.info('Credentials migration completed successfully');
	}

	/**
	 * Execute the forward migration
	 */
	async up(context: MigrationContext) {
		const { logger, schemaBuilder } = context;

		logger.info('Starting MultitenantTransformation migration (up)');

		// Step 1: Migrate workflows
		await this.migrateWorkflows(context);

		// Step 2: Migrate credentials
		await this.migrateCredentials(context);

		// Step 3: Drop shared_workflow table (no longer needed)
		logger.info('Dropping shared_workflow table');
		await schemaBuilder.dropTable(table.sharedWorkflow);

		// Step 4: Drop shared_credentials table (no longer needed)
		logger.info('Dropping shared_credentials table');
		await schemaBuilder.dropTable(table.sharedCredentials);

		logger.info('MultitenantTransformation migration (up) completed successfully');
	}

	/**
	 * Rollback the migration
	 */
	async down({
		escape,
		runQuery,
		logger,
		schemaBuilder: { createTable, column, dropColumns, dropForeignKey, dropIndex },
	}: MigrationContext) {
		const { t, c } = escapeNames(escape);

		logger.info('Starting MultitenantTransformation migration rollback (down)');

		// Step 1: Recreate shared_workflow table
		logger.info('Recreating shared_workflow table');
		await createTable(table.sharedWorkflow)
			.withColumns(
				column('workflowId').varchar(36).notNull.primary,
				column('projectId').varchar(36).notNull.primary,
				column('role').text.notNull,
			)
			.withForeignKey('workflowId', {
				tableName: table.workflow,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: table.project,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		// Step 2: Migrate workflow data back to shared_workflow
		logger.info('Migrating workflow data back to shared_workflow');
		await runQuery(`
			INSERT INTO ${t.sharedWorkflow} (${c.workflowId}, ${c.projectId}, ${c.role}, ${c.createdAt}, ${c.updatedAt})
			SELECT ${c.id}, ${c.projectId}, 'workflow:owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
			FROM ${t.workflow}
			WHERE ${c.projectId} IS NOT NULL
		`);

		// Step 3: Drop workflow foreign key, indexes, and projectId column
		logger.info('Removing projectId column from workflow_entity');
		await dropIndex(table.workflow, ['projectId', 'active'], {
			customIndexName: 'idx_workflow_project_active',
			skipIfMissing: true,
		});
		await dropIndex(table.workflow, ['projectId'], {
			customIndexName: 'idx_workflow_project_id',
			skipIfMissing: true,
		});
		await dropForeignKey(table.workflow, 'projectId', [table.project, 'id']);
		await dropColumns(table.workflow, ['projectId']);

		// Step 4: Recreate shared_credentials table
		logger.info('Recreating shared_credentials table');
		await createTable(table.sharedCredentials)
			.withColumns(
				column('credentialsId').varchar(36).notNull.primary,
				column('projectId').varchar(36).notNull.primary,
				column('role').text.notNull,
			)
			.withForeignKey('credentialsId', {
				tableName: table.credentials,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: table.project,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		// Step 5: Migrate credentials data back to shared_credentials
		logger.info('Migrating credentials data back to shared_credentials');
		await runQuery(`
			INSERT INTO ${t.sharedCredentials} (${c.credentialsId}, ${c.projectId}, ${c.role}, ${c.createdAt}, ${c.updatedAt})
			SELECT ${c.id}, ${c.projectId}, 'credential:owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
			FROM ${t.credentials}
			WHERE ${c.projectId} IS NOT NULL
		`);

		// Step 6: Drop credentials foreign key, index, and projectId column
		logger.info('Removing projectId column from credentials_entity');
		await dropIndex(table.credentials, ['projectId'], {
			customIndexName: 'idx_credentials_project_id',
			skipIfMissing: true,
		});
		await dropForeignKey(table.credentials, 'projectId', [table.project, 'id']);
		await dropColumns(table.credentials, ['projectId']);

		logger.info('MultitenantTransformation migration rollback (down) completed successfully');
	}
}
