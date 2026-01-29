import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddNodeGovernanceTables1768981346000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		// Create node_category table FIRST (no dependencies on new tables)
		await createTable('node_category')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('slug').varchar(100).notNull,
				column('displayName').varchar(255).notNull,
				column('description').text,
				column('color').varchar(7),
				column('createdById').uuid,
			)
			.withTimestamps.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withUniqueConstraintOn('slug');

		// Create node_governance_policy table (depends on user only)
		await createTable('node_governance_policy')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('policyType').varchar(10).notNull,
				column('scope').varchar(10).notNull.default("'global'"),
				column('targetType').varchar(20).notNull,
				column('targetValue').varchar(255).notNull,
				column('createdById').uuid,
			)
			.withTimestamps.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withIndexOn(['scope', 'targetType', 'targetValue'])
			.withEnumCheck('policyType', ['allow', 'block'])
			.withEnumCheck('scope', ['global', 'projects'])
			.withEnumCheck('targetType', ['node', 'category']);

		// Create policy_project_assignment junction table (depends on node_governance_policy, project)
		await createTable('policy_project_assignment')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('policyId').varchar(36).notNull,
				column('projectId').varchar(36).notNull,
			)
			.withTimestamps.withForeignKey('policyId', {
				tableName: 'node_governance_policy',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withUniqueConstraintOn(['policyId', 'projectId'])
			.withIndexOn(['projectId']);

		// Create node_category_assignment junction table (depends on node_category, user)
		await createTable('node_category_assignment')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('categoryId').varchar(36).notNull,
				column('nodeType').varchar(255).notNull,
				column('assignedById').uuid,
			)
			.withTimestamps.withForeignKey('categoryId', {
				tableName: 'node_category',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('assignedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withUniqueConstraintOn(['categoryId', 'nodeType'])
			.withIndexOn(['nodeType']);

		// Create node_access_request table (depends on project, user)
		await createTable('node_access_request')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('projectId').varchar(36).notNull,
				column('requestedById').uuid.notNull,
				column('nodeType').varchar(255).notNull,
				column('justification').text.notNull,
				column('workflowName').varchar(255),
				column('status').varchar(10).notNull.default("'pending'"),
				column('reviewedById').uuid,
				column('reviewComment').text,
				column('reviewedAt').timestampTimezone(),
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('requestedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('reviewedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withIndexOn(['projectId', 'status'])
			.withIndexOn(['requestedById', 'status'])
			.withEnumCheck('status', ['pending', 'approved', 'rejected']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		// Drop tables in reverse order due to foreign key dependencies
		await dropTable('node_access_request');
		await dropTable('node_category_assignment');
		await dropTable('policy_project_assignment');
		await dropTable('node_governance_policy');
		await dropTable('node_category');
	}
}
