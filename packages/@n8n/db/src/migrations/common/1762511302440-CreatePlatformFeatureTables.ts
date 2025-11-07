import { v4 as uuidv4 } from 'uuid';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * CreatePlatformFeatureTables Migration
 *
 * This migration implements enterprise feature management for multi-tenant n8n deployment.
 * It controls which enterprise features are enabled/disabled at the platform level and
 * extends existing tables to support user-level and workspace-level feature configurations.
 *
 * Migration Goals:
 * 1. Create platform_feature_config table to manage enterprise feature toggles
 * 2. Extend user table with admin flag and feature preferences
 * 3. Extend project (workspace) table with feature configuration
 *
 * Migration Steps (up):
 * - Create platform_feature_config table with feature_key as business key
 * - Insert initial enterprise feature configurations (10 features)
 * - Add is_admin column to user table for global admin identification
 * - Add feature_preferences column to user table for user-level settings
 * - Add feature_config column to project table for workspace-level settings
 * - Create indexes (including partial index for PostgreSQL)
 * - Verify all initial feature data was inserted successfully
 *
 * Rollback Steps (down):
 * - Drop added columns from project and user tables
 * - Drop platform_feature_config table
 *
 * Cross-Database Compatibility:
 * - Uses .varchar for feature_key (better compatibility than TEXT)
 * - Uses .json for config/preferences (PostgreSQL: jsonb, MySQL: json, SQLite: text)
 * - Uses .bool for enabled/is_admin flags (cross-database compatible)
 * - Partial indexes (WHERE clause) are PostgreSQL-only, handled with isPostgres check
 *
 * Enterprise Features Managed:
 * DISABLED (Multi-tenant SaaS doesn't need):
 * - LDAP integration (ldap)
 * - SAML integration (saml)
 * - OIDC integration (oidc)
 * - External secrets management (external_secrets)
 * - Log streaming (log_streaming) - platform internal use only
 * - Worker view (worker_view) - admin only
 *
 * ENABLED with Limits:
 * - Public API (public_api) - rate limited 1000/hour, max 5 API keys
 * - Workflow history (workflow_history) - unlimited retention
 * - Insights analytics (insights) - unlimited date range
 * - Audit logs (audit_logs) - 365 days retention
 */

const table = {
	platformFeatureConfig: 'platform_feature_config',
	user: 'user',
	project: 'project',
} as const;

function escapeNames(escape: MigrationContext['escape']) {
	const t = {
		platformFeatureConfig: escape.tableName(table.platformFeatureConfig),
		user: escape.tableName(table.user),
		project: escape.tableName(table.project),
	};

	const c = {
		// platform_feature_config columns
		id: escape.columnName('id'),
		featureKey: escape.columnName('feature_key'),
		enabled: escape.columnName('enabled'),
		config: escape.columnName('config'),
		description: escape.columnName('description'),
		updatedAt: escape.columnName('updatedAt'),
		// user table columns
		isAdmin: escape.columnName('is_admin'),
		featurePreferences: escape.columnName('feature_preferences'),
		// project table columns
		featureConfig: escape.columnName('feature_config'),
	};

	return { t, c };
}

/**
 * Initial enterprise feature configurations
 * These define which enterprise features are enabled/disabled at the platform level
 *
 * Feature Config JSON Structure:
 * {
 *   // For features with limits
 *   "rate_limit_per_hour": 1000,     // API rate limit
 *   "max_api_keys": 5,                // Max API keys per workspace
 *   "retention_days": 365,            // Data retention in days (-1 = unlimited)
 *   "date_range_limit_days": -1       // Query date range limit (-1 = unlimited)
 * }
 */
const INITIAL_FEATURE_CONFIGS = [
	// ============================================
	// DISABLED FEATURES (Multi-tenant SaaS doesn't support these)
	// ============================================
	{
		featureKey: 'ldap',
		enabled: false,
		config: JSON.stringify({}),
		description: 'LDAP 单点登录（多租户 SaaS 禁用）',
	},
	{
		featureKey: 'saml',
		enabled: false,
		config: JSON.stringify({}),
		description: 'SAML 单点登录（多租户 SaaS 禁用）',
	},
	{
		featureKey: 'oidc',
		enabled: false,
		config: JSON.stringify({}),
		description: 'OIDC 单点登录（多租户 SaaS 禁用）',
	},
	{
		featureKey: 'external_secrets',
		enabled: false,
		config: JSON.stringify({}),
		description: '外部密钥管理（多租户 SaaS 禁用）',
	},
	{
		featureKey: 'log_streaming',
		enabled: false,
		config: JSON.stringify({}),
		description: '日志流（仅平台内部使用）',
	},
	{
		featureKey: 'worker_view',
		enabled: false,
		config: JSON.stringify({}),
		description: 'Worker 监控视图（仅管理员可见）',
	},

	// ============================================
	// ENABLED FEATURES (With Limits)
	// ============================================
	{
		featureKey: 'public_api',
		enabled: true,
		config: JSON.stringify({
			rate_limit_per_hour: 1000,
			max_api_keys: 5,
		}),
		description: 'Public API（启用 + 限流：1000次/小时，最多5个API密钥）',
	},
	{
		featureKey: 'workflow_history',
		enabled: true,
		config: JSON.stringify({
			retention_days: -1, // -1 means unlimited
		}),
		description: '工作流版本历史（启用 + 无限制保留）',
	},
	{
		featureKey: 'insights',
		enabled: true,
		config: JSON.stringify({
			date_range_limit_days: -1, // -1 means unlimited
		}),
		description: 'Insights 分析（启用 + 无限制日期范围）',
	},
	{
		featureKey: 'audit_logs',
		enabled: true,
		config: JSON.stringify({
			retention_days: 365,
		}),
		description: '审计日志（启用 + 保留365天）',
	},
];

export class CreatePlatformFeatureTables1762511302440 implements ReversibleMigration {
	/**
	 * Create platform_feature_config table
	 * Stores enterprise feature toggles and configurations at platform level
	 *
	 * Table Structure:
	 * - id: UUID primary key
	 * - feature_key: Unique business identifier (e.g., 'ldap', 'saml', 'public_api')
	 * - enabled: Global feature switch (true/false)
	 * - config: JSON configuration with feature-specific parameters
	 * - description: Human-readable description (can be in Chinese)
	 * - updatedAt: Last configuration update time
	 */
	async createPlatformFeatureConfigTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(table.platformFeatureConfig)
			.withColumns(
				// Primary key - UUID for technical identity
				column('id').uuid.primary.notNull,
				// Business key - unique feature identifier
				// Examples: 'ldap', 'saml', 'oidc', 'public_api', 'workflow_history'
				column('feature_key').varchar(100).notNull,
				// Global feature switch
				column('enabled').bool.notNull.default(false),
				// Feature-specific configuration stored as JSON
				// PostgreSQL: jsonb (optimized), MySQL: json, SQLite: text
				// Example: {"rate_limit_per_hour": 1000, "max_api_keys": 5}
				column('config').json.notNull.default("'{}'"),
				// Human-readable description (supports Chinese characters)
				column('description').text,
				// Last update timestamp (auto-managed)
				column('updatedAt')
					.timestampTimezone()
					.notNull.default('CURRENT_TIMESTAMP'),
			)
			.withIndexOn('feature_key', true) // Unique index on business key
			.withIndexOn('enabled'); // Index for filtering active features
	}

	/**
	 * Insert initial enterprise feature configurations
	 * Adds 10 pre-configured features (6 disabled, 4 enabled with limits)
	 */
	async insertInitialFeatureConfigs({ escape, runQuery, logger }: MigrationContext) {
		const { t, c } = escapeNames(escape);

		logger.info('Inserting initial enterprise feature configurations');

		for (const feature of INITIAL_FEATURE_CONFIGS) {
			await runQuery(
				`INSERT INTO ${t.platformFeatureConfig}
				(${c.id}, ${c.featureKey}, ${c.enabled}, ${c.config}, ${c.description}, ${c.updatedAt})
				VALUES (:id, :featureKey, :enabled, :config, :description, CURRENT_TIMESTAMP)`,
				{
					id: uuidv4(),
					featureKey: feature.featureKey,
					enabled: feature.enabled,
					config: feature.config,
					description: feature.description,
				},
			);
		}

		logger.info(`Successfully inserted ${INITIAL_FEATURE_CONFIGS.length} feature configurations`);

		// Log which features are enabled vs disabled
		const enabledCount = INITIAL_FEATURE_CONFIGS.filter((f) => f.enabled).length;
		const disabledCount = INITIAL_FEATURE_CONFIGS.filter((f) => !f.enabled).length;
		logger.info(`Features status: ${enabledCount} enabled, ${disabledCount} disabled`);
	}

	/**
	 * Verify that all initial feature configurations were inserted successfully
	 * Also checks the count of enabled vs disabled features
	 */
	async verifyInitialFeatureData({ escape, runQuery, logger }: MigrationContext) {
		const { t, c } = escapeNames(escape);

		logger.info('Verifying initial platform feature configuration data');

		// Verify total feature count
		const [{ count: totalCount }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count FROM ${t.platformFeatureConfig}
		`);

		if (totalCount !== INITIAL_FEATURE_CONFIGS.length) {
			const message = `Feature config insertion failed: expected ${INITIAL_FEATURE_CONFIGS.length} records, got ${totalCount}`;
			logger.error(message);
			throw new Error(message);
		}

		logger.info(`Verified ${totalCount} total feature configurations`);

		// Verify enabled feature count
		const [{ count: enabledCount }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count FROM ${t.platformFeatureConfig}
			WHERE ${c.enabled} = true
		`);

		const expectedEnabledCount = INITIAL_FEATURE_CONFIGS.filter((f) => f.enabled).length;
		if (enabledCount !== expectedEnabledCount) {
			const message = `Enabled feature count mismatch: expected ${expectedEnabledCount}, got ${enabledCount}`;
			logger.error(message);
			throw new Error(message);
		}

		logger.info(`Verified ${enabledCount} enabled features`);

		// Verify disabled feature count
		const [{ count: disabledCount }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count FROM ${t.platformFeatureConfig}
			WHERE ${c.enabled} = false
		`);

		const expectedDisabledCount = INITIAL_FEATURE_CONFIGS.filter((f) => !f.enabled).length;
		if (disabledCount !== expectedDisabledCount) {
			const message = `Disabled feature count mismatch: expected ${expectedDisabledCount}, got ${disabledCount}`;
			logger.error(message);
			throw new Error(message);
		}

		logger.info(`Verified ${disabledCount} disabled features`);

		// Log specific enabled features
		const enabledFeatures = await runQuery<Array<{ feature_key: string }>>(
			`SELECT ${c.featureKey} as feature_key FROM ${t.platformFeatureConfig}
			WHERE ${c.enabled} = true
			ORDER BY ${c.featureKey}`,
		);
		logger.info(`Enabled features: ${enabledFeatures.map((f) => f.feature_key).join(', ')}`);

		// Log specific disabled features
		const disabledFeatures = await runQuery<Array<{ feature_key: string }>>(
			`SELECT ${c.featureKey} as feature_key FROM ${t.platformFeatureConfig}
			WHERE ${c.enabled} = false
			ORDER BY ${c.featureKey}`,
		);
		logger.info(`Disabled features: ${disabledFeatures.map((f) => f.feature_key).join(', ')}`);
	}

	/**
	 * Extend user table with admin flag and feature preferences
	 *
	 * New Columns:
	 * 1. is_admin: Boolean flag for global administrators
	 *    - Default: false
	 *    - Global admin can access platform-wide management features
	 *    - Different from workspace-level admin role
	 *
	 * 2. feature_preferences: JSON for user-level feature settings
	 *    - Stores user-specific feature preferences
	 *    - Example: {"language": "zh-CN", "mfaEnabled": false, "aiAssistantEnabled": true}
	 *
	 * Indexes:
	 * - Partial index on is_admin (WHERE is_admin = true) - PostgreSQL only
	 *   This optimizes queries looking for admins since there will be very few
	 */
	async extendUserTable({
		schemaBuilder: { addColumns, column },
		isPostgres,
		escape,
		runQuery,
		logger,
	}: MigrationContext) {
		logger.info('Extending user table with admin flag and feature preferences');

		const { t, c } = escapeNames(escape);

		// Add is_admin column (global administrator flag)
		await addColumns(table.user, [column('is_admin').bool.notNull.default(false)]);

		// Add feature_preferences column (user-level feature settings)
		// JSON structure: {"language": "zh-CN", "mfaEnabled": false, "mfaSecret": "xxx", ...}
		await addColumns(table.user, [column('feature_preferences').json.default("'{}'")]);

		// Create partial index for is_admin (PostgreSQL only)
		// Partial indexes are not supported in MySQL/SQLite
		// This index only includes rows where is_admin = true, making admin lookups very efficient
		if (isPostgres) {
			logger.info('Creating partial index on user.is_admin (PostgreSQL only)');
			await runQuery(
				`CREATE INDEX IF NOT EXISTS idx_user_is_admin
				ON ${t.user}(${c.isAdmin})
				WHERE ${c.isAdmin} = true`,
			);
		}

		logger.info('Successfully extended user table');
	}

	/**
	 * Extend project table with workspace-level feature configuration
	 *
	 * New Column:
	 * - feature_config: JSON for workspace-specific feature settings
	 *   - Can override platform-level settings
	 *   - Enables per-workspace feature limits
	 *   - Example: {"environmentVariables": {"enabled": true, "maxCount": 100}}
	 */
	async extendProjectTable({ schemaBuilder: { addColumns, column }, logger }: MigrationContext) {
		logger.info('Extending project table with feature configuration');

		// Add feature_config column (workspace-level feature settings)
		// JSON structure:
		// {
		//   "environmentVariables": {"enabled": true, "maxCount": 100},
		//   "customRoles": {"enabled": true, "maxCount": 10},
		//   "auditLogsEnabled": true
		// }
		await addColumns(table.project, [column('feature_config').json.default("'{}'")]);

		logger.info('Successfully extended project table');
	}

	/**
	 * Execute the forward migration
	 */
	async up(context: MigrationContext) {
		const { logger } = context;

		logger.info('Starting CreatePlatformFeatureTables migration (up)');

		// Step 1: Create platform_feature_config table
		logger.info('Creating platform_feature_config table');
		await this.createPlatformFeatureConfigTable(context);

		// Step 2: Insert initial enterprise feature configurations
		await this.insertInitialFeatureConfigs(context);

		// Step 3: Verify initial feature data
		await this.verifyInitialFeatureData(context);

		// Step 4: Extend user table with admin flag and feature preferences
		await this.extendUserTable(context);

		// Step 5: Extend project table with feature configuration
		await this.extendProjectTable(context);

		logger.info('CreatePlatformFeatureTables migration (up) completed successfully');
	}

	/**
	 * Rollback the migration
	 */
	async down({ logger, schemaBuilder: { dropTable, dropColumns } }: MigrationContext) {
		logger.info('Starting CreatePlatformFeatureTables migration rollback (down)');

		// Step 1: Drop added columns from project table
		logger.info('Dropping feature_config column from project table');
		await dropColumns(table.project, ['feature_config']);

		// Step 2: Drop added columns from user table
		logger.info('Dropping is_admin and feature_preferences columns from user table');
		await dropColumns(table.user, ['is_admin', 'feature_preferences']);

		// Note: Partial index idx_user_is_admin will be automatically dropped when column is dropped
		// No need to explicitly drop it

		// Step 3: Drop platform_feature_config table
		logger.info('Dropping platform_feature_config table');
		await dropTable(table.platformFeatureConfig);

		logger.info('CreatePlatformFeatureTables migration rollback (down) completed successfully');
	}
}
