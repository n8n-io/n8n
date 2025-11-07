import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * CreateBillingTables Migration
 *
 * This migration creates the billing system infrastructure for multi-tenant n8n deployment.
 * It creates three core tables for managing workspace balances, usage tracking, and recharge records.
 *
 * Tables Created:
 * 1. workspace_balance: Stores balance information for each workspace
 * 2. usage_record: Tracks all service consumption (AI models, RAG services, etc.)
 * 3. recharge_record: Records all balance recharge transactions
 *
 * Migration Steps (up):
 * - Create workspace_balance table with foreign key to project.id
 * - Create usage_record table with foreign keys to project.id and user.id
 * - Create recharge_record table with foreign keys to project.id and user.id
 * - Initialize balance records for all existing workspaces with 0.00 CNY
 *
 * Rollback Steps (down):
 * - Drop all three billing tables
 *
 * Cross-Database Compatibility:
 * - Uses .double type for balance fields (PostgreSQL: double precision, MySQL: double, SQLite: real)
 * - Uses .int for counter fields (tokens_used, calls_count)
 * - Uses .json for metadata (PostgreSQL: jsonb, MySQL: json, SQLite: text)
 * - Uses .varchar(36) for UUID fields to ensure MySQL/SQLite compatibility
 */

const table = {
	workspaceBalance: 'workspace_balance',
	usageRecord: 'usage_record',
	rechargeRecord: 'recharge_record',
	project: 'project',
	user: 'user',
} as const;

function escapeNames(escape: MigrationContext['escape']) {
	const t = {
		workspaceBalance: escape.tableName(table.workspaceBalance),
		usageRecord: escape.tableName(table.usageRecord),
		rechargeRecord: escape.tableName(table.rechargeRecord),
		project: escape.tableName(table.project),
		user: escape.tableName(table.user),
	};

	const c = {
		id: escape.columnName('id'),
		workspaceId: escape.columnName('workspace_id'),
		userId: escape.columnName('user_id'),
		balanceCny: escape.columnName('balance_cny'),
		lowBalanceThresholdCny: escape.columnName('low_balance_threshold_cny'),
		currency: escape.columnName('currency'),
		serviceKey: escape.columnName('service_key'),
		serviceType: escape.columnName('service_type'),
		tokensUsed: escape.columnName('tokens_used'),
		callsCount: escape.columnName('calls_count'),
		amountCny: escape.columnName('amount_cny'),
		metadata: escape.columnName('metadata'),
		paymentMethod: escape.columnName('payment_method'),
		transactionId: escape.columnName('transaction_id'),
		status: escape.columnName('status'),
		completedAt: escape.columnName('completed_at'),
		createdAt: escape.columnName('createdAt'),
		updatedAt: escape.columnName('updatedAt'),
	};

	return { t, c };
}

export class CreateBillingTables1762511302000 implements ReversibleMigration {
	/**
	 * Create workspace_balance table
	 * Stores balance information for each workspace (mapped to project.id)
	 */
	async createWorkspaceBalanceTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.workspaceBalance)
			.withColumns(
				// Primary key
				column('id').varchar(36).primary,
				// Foreign key to project (workspace) - UNIQUE constraint ensures one balance per workspace
				column('workspace_id').varchar(36).notNull,
				// Balance amount in CNY with 4 decimal precision
				// Using double type: PostgreSQL (double precision), MySQL (double), SQLite (real)
				column('balance_cny').double.notNull.default(0.0),
				// Low balance alert threshold in CNY
				column('low_balance_threshold_cny').double.notNull.default(10.0),
				// Currency code (ISO 4217)
				column('currency')
					.varchar(3)
					.notNull.default('CNY'),
			)
			.withForeignKey('workspace_id', {
				tableName: table.project,
				columnName: 'id',
				onDelete: 'CASCADE', // Delete balance when workspace is deleted
			})
			.withIndexOn('workspace_id', true).withTimestamps; // Unique index to enforce one balance per workspace // Adds createdAt and updatedAt columns
	}

	/**
	 * Create usage_record table
	 * Tracks all service consumption events (AI models, RAG services, etc.)
	 */
	async createUsageRecordTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.usageRecord)
			.withColumns(
				// Primary key
				column('id').varchar(36).primary,
				// Foreign key to project (workspace)
				column('workspace_id').varchar(36).notNull,
				// Foreign key to user (who triggered the consumption)
				column('user_id').varchar(36).notNull,
				// Service identifier (e.g., 'gpt-4-turbo', 'gpt-3.5-turbo', 'text-embedding-ada-002')
				column('service_key').varchar(100).notNull,
				// Service type category (e.g., 'ai_model', 'rag_service', 'embedding')
				column('service_type').varchar(50).notNull,
				// Token count for AI models (nullable for non-AI services)
				column('tokens_used').int,
				// Number of API calls (defaults to 1)
				column('calls_count').int.notNull.default(1),
				// Cost in CNY for this consumption event
				column('amount_cny').double.notNull,
				// Additional metadata stored as JSON
				// PostgreSQL: jsonb, MySQL: json, SQLite: text
				column('metadata').json,
				// Only created_at needed (consumption records are immutable)
				column('created_at').timestampTimezone(3).default('NOW()').notNull,
			)
			.withForeignKey('workspace_id', {
				tableName: table.project,
				columnName: 'id',
				onDelete: 'CASCADE', // Delete usage records when workspace is deleted
			})
			.withForeignKey('user_id', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE', // Delete usage records when user is deleted
			})
			.withIndexOn('workspace_id') // Query by workspace
			.withIndexOn(['workspace_id', 'created_at']) // Query by workspace and time range
			.withIndexOn('service_key') // Query by service type for statistics
			.withIndexOn('user_id'); // Query by user for user-level statistics
	}

	/**
	 * Create recharge_record table
	 * Tracks all balance recharge transactions
	 */
	async createRechargeRecordTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.rechargeRecord)
			.withColumns(
				// Primary key
				column('id').varchar(36).primary,
				// Foreign key to project (workspace)
				column('workspace_id').varchar(36).notNull,
				// Foreign key to user (who initiated the recharge)
				column('user_id').varchar(36).notNull,
				// Recharge amount in CNY
				column('amount_cny').double.notNull,
				// Payment method: 'alipay', 'wechat', 'admin', 'bank_transfer'
				column('payment_method').varchar(50).notNull,
				// External transaction ID from payment gateway (for idempotency)
				column('transaction_id').varchar(200),
				// Transaction status: 'pending', 'completed', 'failed', 'cancelled'
				column('status')
					.varchar(20)
					.notNull.default('pending'),
				// Timestamp when the recharge was completed (NULL for pending/failed)
				column('completed_at').timestampTimezone(3),
			)
			.withForeignKey('workspace_id', {
				tableName: table.project,
				columnName: 'id',
				onDelete: 'CASCADE', // Delete recharge records when workspace is deleted
			})
			.withForeignKey('user_id', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE', // Delete recharge records when user is deleted
			})
			.withIndexOn('workspace_id') // Query by workspace
			.withIndexOn(['workspace_id', 'status']) // Query pending/completed recharges by workspace
			.withIndexOn('transaction_id', true).withTimestamps; // Unique index for idempotency checks (optional, allows NULL) // Adds createdAt and updatedAt columns
	}

	/**
	 * Initialize balance records for all existing workspaces
	 * Each existing project gets a balance record with 0.00 CNY
	 */
	async initializeWorkspaceBalances({ escape, runQuery, runInBatches, logger }: MigrationContext) {
		const { t, c } = escapeNames(escape);

		logger.info('Initializing balance records for existing workspaces');

		// Count existing workspaces
		const [{ count: workspaceCount }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count FROM ${t.project}
		`);

		logger.info(`Found ${workspaceCount} existing workspaces to initialize`);

		if (workspaceCount === 0) {
			logger.info('No existing workspaces found, skipping initialization');
			return;
		}

		// Get all existing project IDs and create balance records
		const selectProjectsQuery = `SELECT ${c.id} FROM ${t.project}`;
		await runInBatches<{ id: string }>(selectProjectsQuery, async (projects) => {
			await Promise.all(
				projects.map(async (project) => {
					await runQuery(
						`INSERT INTO ${t.workspaceBalance}
						(${c.id}, ${c.workspaceId}, ${c.balanceCny}, ${c.lowBalanceThresholdCny}, ${c.currency}, ${c.createdAt}, ${c.updatedAt})
						VALUES (:id, :workspaceId, :balance, :threshold, :currency, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
						{
							id: project.id, // Use project id as balance record id for simplicity
							workspaceId: project.id,
							balance: 0.0,
							threshold: 10.0,
							currency: 'CNY',
						},
					);
				}),
			);
		});

		// Verify all workspaces have balance records
		const [{ count: balanceCount }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count FROM ${t.workspaceBalance}
		`);

		if (balanceCount !== workspaceCount) {
			const message = `Balance initialization failed: expected ${workspaceCount} records, got ${balanceCount}`;
			logger.error(message);
			throw new Error(message);
		}

		logger.info(`Successfully initialized ${balanceCount} balance records`);
	}

	/**
	 * Execute the forward migration
	 */
	async up(context: MigrationContext) {
		const { logger } = context;

		logger.info('Starting CreateBillingTables migration (up)');

		// Step 1: Create workspace_balance table
		logger.info('Creating workspace_balance table');
		await this.createWorkspaceBalanceTable(context);

		// Step 2: Create usage_record table
		logger.info('Creating usage_record table');
		await this.createUsageRecordTable(context);

		// Step 3: Create recharge_record table
		logger.info('Creating recharge_record table');
		await this.createRechargeRecordTable(context);

		// Step 4: Initialize balance records for existing workspaces
		await this.initializeWorkspaceBalances(context);

		logger.info('CreateBillingTables migration (up) completed successfully');
	}

	/**
	 * Rollback the migration
	 */
	async down({ logger, schemaBuilder: { dropTable } }: MigrationContext) {
		logger.info('Starting CreateBillingTables migration rollback (down)');

		// Drop tables in reverse order of foreign key dependencies
		// First drop tables that reference workspace_balance, usage_record, recharge_record
		// (none in this case, so we can drop directly)

		// Drop usage_record table (references project and user)
		logger.info('Dropping usage_record table');
		await dropTable(table.usageRecord);

		// Drop recharge_record table (references project and user)
		logger.info('Dropping recharge_record table');
		await dropTable(table.rechargeRecord);

		// Drop workspace_balance table (references project)
		logger.info('Dropping workspace_balance table');
		await dropTable(table.workspaceBalance);

		logger.info('CreateBillingTables migration rollback (down) completed successfully');
	}
}
