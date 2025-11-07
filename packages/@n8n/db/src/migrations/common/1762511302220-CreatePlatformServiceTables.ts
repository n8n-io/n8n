import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * CreatePlatformServiceTables Migration
 *
 * This migration creates the platform service infrastructure for multi-tenant n8n deployment.
 * It creates tables for managing AI model services and vertical RAG services with their pricing.
 *
 * Tables Created:
 * 1. platform_service: Stores general platform services (AI models)
 * 2. platform_rag_service: Stores vertical RAG services (domain-specific knowledge bases)
 *
 * Migration Steps (up):
 * - Create platform_service table with service_key as primary key
 * - Create platform_rag_service table with service_key as primary key
 * - Insert initial AI model services (GPT-4, GPT-3.5, Claude 3 family)
 * - Insert initial vertical RAG services (legal, medical, finance)
 * - Verify all initial data was inserted successfully
 *
 * Rollback Steps (down):
 * - Drop both platform service tables
 *
 * Cross-Database Compatibility:
 * - Uses .varchar for string keys (better compatibility than TEXT)
 * - Uses .json for pricing_config and metadata (PostgreSQL: jsonb, MySQL: json, SQLite: text)
 * - Uses .double for price fields (sufficient precision for CNY amounts)
 * - Uses .bool for is_active flags (cross-database compatible)
 */

const table = {
	platformService: 'platform_service',
	platformRagService: 'platform_rag_service',
} as const;

function escapeNames(escape: MigrationContext['escape']) {
	const t = {
		platformService: escape.tableName(table.platformService),
		platformRagService: escape.tableName(table.platformRagService),
	};

	const c = {
		serviceKey: escape.columnName('service_key'),
		serviceType: escape.columnName('service_type'),
		name: escape.columnName('name'),
		pricingConfig: escape.columnName('pricing_config'),
		domain: escape.columnName('domain'),
		pricePerQueryCny: escape.columnName('price_per_query_cny'),
		metadata: escape.columnName('metadata'),
		isActive: escape.columnName('is_active'),
		createdAt: escape.columnName('createdAt'),
		updatedAt: escape.columnName('updatedAt'),
	};

	return { t, c };
}

/**
 * Initial AI model services to be inserted
 * These are commonly used AI models with their pricing in CNY per token
 */
const INITIAL_AI_MODELS = [
	{
		serviceKey: 'gpt-4-turbo',
		serviceType: 'ai_model',
		name: 'GPT-4 Turbo',
		pricingConfig: JSON.stringify({ pricePerToken: 0.00001, currency: 'CNY' }),
		isActive: true,
	},
	{
		serviceKey: 'gpt-3.5-turbo',
		serviceType: 'ai_model',
		name: 'GPT-3.5 Turbo',
		pricingConfig: JSON.stringify({ pricePerToken: 0.000001, currency: 'CNY' }),
		isActive: true,
	},
	{
		serviceKey: 'claude-3-opus',
		serviceType: 'ai_model',
		name: 'Claude 3 Opus',
		pricingConfig: JSON.stringify({ pricePerToken: 0.000015, currency: 'CNY' }),
		isActive: true,
	},
	{
		serviceKey: 'claude-3-sonnet',
		serviceType: 'ai_model',
		name: 'Claude 3 Sonnet',
		pricingConfig: JSON.stringify({ pricePerToken: 0.000003, currency: 'CNY' }),
		isActive: true,
	},
	{
		serviceKey: 'claude-3-haiku',
		serviceType: 'ai_model',
		name: 'Claude 3 Haiku',
		pricingConfig: JSON.stringify({ pricePerToken: 0.00000025, currency: 'CNY' }),
		isActive: true,
	},
];

/**
 * Initial vertical RAG services to be inserted
 * These are domain-specific knowledge bases with pricing in CNY per query
 */
const INITIAL_RAG_SERVICES = [
	{
		serviceKey: 'legal-rag-cn',
		name: '中国法律知识库',
		domain: 'legal',
		pricePerQueryCny: 0.5,
		metadata: JSON.stringify({
			knowledgeBaseSize: 50000,
			lastUpdated: '2025-01-01',
			coverageYears: '2020-2025',
			languages: ['zh-CN'],
		}),
		isActive: true,
	},
	{
		serviceKey: 'medical-rag-cn',
		name: '医疗健康知识库',
		domain: 'medical',
		pricePerQueryCny: 0.8,
		metadata: JSON.stringify({
			knowledgeBaseSize: 80000,
			lastUpdated: '2025-01-01',
			coverageYears: '2020-2025',
			languages: ['zh-CN'],
		}),
		isActive: true,
	},
	{
		serviceKey: 'finance-rag-cn',
		name: '金融财务知识库',
		domain: 'finance',
		pricePerQueryCny: 0.6,
		metadata: JSON.stringify({
			knowledgeBaseSize: 60000,
			lastUpdated: '2025-01-01',
			coverageYears: '2020-2025',
			languages: ['zh-CN'],
		}),
		isActive: true,
	},
];

export class CreatePlatformServiceTables1762511302220 implements ReversibleMigration {
	/**
	 * Create platform_service table
	 * Stores general platform services like AI models with flexible pricing configuration
	 */
	async createPlatformServiceTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.platformService)
			.withColumns(
				// Primary key - service identifier (e.g., 'gpt-4-turbo')
				column('service_key').varchar(100).primary,
				// Service type category (e.g., 'ai_model', 'rag_service', 'embedding')
				column('service_type').varchar(50).notNull,
				// Human-readable service name
				column('name').varchar(200).notNull,
				// Pricing configuration stored as JSON
				// Example: {"pricePerToken": 0.00001, "currency": "CNY"}
				// PostgreSQL: jsonb (optimized), MySQL: json, SQLite: text
				column('pricing_config').json.notNull,
				// Whether the service is currently available
				column('is_active').bool.notNull.default(true),
			)
			.withIndexOn('service_type') // Index for filtering by service type
			.withIndexOn('is_active').withTimestamps; // Index for filtering active services // Adds createdAt and updatedAt columns
	}

	/**
	 * Create platform_rag_service table
	 * Stores vertical RAG services with domain-specific knowledge bases
	 */
	async createPlatformRagServiceTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(table.platformRagService)
			.withColumns(
				// Primary key - service identifier (e.g., 'legal-rag-cn')
				column('service_key').varchar(100).primary,
				// Human-readable service name (can be in Chinese)
				column('name').varchar(200).notNull,
				// Domain/industry category (e.g., 'legal', 'medical', 'finance')
				column('domain').varchar(50).notNull,
				// Price per query in CNY
				// Using double type for sufficient precision (e.g., 0.50 CNY)
				column('price_per_query_cny').double.notNull,
				// Additional metadata stored as JSON
				// Example: {"knowledgeBaseSize": 50000, "lastUpdated": "2025-01-01", ...}
				// PostgreSQL: jsonb (optimized), MySQL: json, SQLite: text
				column('metadata').json,
				// Whether the service is currently available
				column('is_active').bool.notNull.default(true),
			)
			.withIndexOn('domain') // Index for filtering by domain
			.withIndexOn('is_active').withTimestamps; // Index for filtering active services // Adds createdAt and updatedAt columns
	}

	/**
	 * Insert initial AI model services
	 * Adds common AI models (GPT-4, GPT-3.5, Claude 3 family) with their pricing
	 */
	async insertInitialAiModels({ escape, runQuery, logger }: MigrationContext) {
		const { t, c } = escapeNames(escape);

		logger.info('Inserting initial AI model services');

		for (const model of INITIAL_AI_MODELS) {
			await runQuery(
				`INSERT INTO ${t.platformService}
				(${c.serviceKey}, ${c.serviceType}, ${c.name}, ${c.pricingConfig}, ${c.isActive}, ${c.createdAt}, ${c.updatedAt})
				VALUES (:serviceKey, :serviceType, :name, :pricingConfig, :isActive, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				{
					serviceKey: model.serviceKey,
					serviceType: model.serviceType,
					name: model.name,
					pricingConfig: model.pricingConfig,
					isActive: model.isActive,
				},
			);
		}

		logger.info(`Successfully inserted ${INITIAL_AI_MODELS.length} AI model services`);
	}

	/**
	 * Insert initial vertical RAG services
	 * Adds domain-specific knowledge bases (legal, medical, finance)
	 */
	async insertInitialRagServices({ escape, runQuery, logger }: MigrationContext) {
		const { t, c } = escapeNames(escape);

		logger.info('Inserting initial vertical RAG services');

		for (const ragService of INITIAL_RAG_SERVICES) {
			await runQuery(
				`INSERT INTO ${t.platformRagService}
				(${c.serviceKey}, ${c.name}, ${c.domain}, ${c.pricePerQueryCny}, ${c.metadata}, ${c.isActive}, ${c.createdAt}, ${c.updatedAt})
				VALUES (:serviceKey, :name, :domain, :pricePerQueryCny, :metadata, :isActive, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				{
					serviceKey: ragService.serviceKey,
					name: ragService.name,
					domain: ragService.domain,
					pricePerQueryCny: ragService.pricePerQueryCny,
					metadata: ragService.metadata,
					isActive: ragService.isActive,
				},
			);
		}

		logger.info(`Successfully inserted ${INITIAL_RAG_SERVICES.length} vertical RAG services`);
	}

	/**
	 * Verify that all initial services were inserted successfully
	 */
	async verifyInitialData({ escape, runQuery, logger }: MigrationContext) {
		const { t } = escapeNames(escape);

		logger.info('Verifying initial platform service data');

		// Verify AI model services
		const [{ count: aiModelCount }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count FROM ${t.platformService}
		`);

		if (aiModelCount !== INITIAL_AI_MODELS.length) {
			const message = `AI model service insertion failed: expected ${INITIAL_AI_MODELS.length} records, got ${aiModelCount}`;
			logger.error(message);
			throw new Error(message);
		}

		logger.info(`Verified ${aiModelCount} AI model services`);

		// Verify RAG services
		const [{ count: ragServiceCount }] = await runQuery<[{ count: number }]>(`
			SELECT COUNT(*) as count FROM ${t.platformRagService}
		`);

		if (ragServiceCount !== INITIAL_RAG_SERVICES.length) {
			const message = `RAG service insertion failed: expected ${INITIAL_RAG_SERVICES.length} records, got ${ragServiceCount}`;
			logger.error(message);
			throw new Error(message);
		}

		logger.info(`Verified ${ragServiceCount} vertical RAG services`);

		// Total service count
		const totalServices = aiModelCount + ragServiceCount;
		logger.info(`Total platform services initialized: ${totalServices}`);
	}

	/**
	 * Execute the forward migration
	 */
	async up(context: MigrationContext) {
		const { logger } = context;

		logger.info('Starting CreatePlatformServiceTables migration (up)');

		// Step 1: Create platform_service table
		logger.info('Creating platform_service table');
		await this.createPlatformServiceTable(context);

		// Step 2: Create platform_rag_service table
		logger.info('Creating platform_rag_service table');
		await this.createPlatformRagServiceTable(context);

		// Step 3: Insert initial AI model services
		await this.insertInitialAiModels(context);

		// Step 4: Insert initial vertical RAG services
		await this.insertInitialRagServices(context);

		// Step 5: Verify all initial data was inserted successfully
		await this.verifyInitialData(context);

		logger.info('CreatePlatformServiceTables migration (up) completed successfully');
	}

	/**
	 * Rollback the migration
	 */
	async down({ logger, schemaBuilder: { dropTable } }: MigrationContext) {
		logger.info('Starting CreatePlatformServiceTables migration rollback (down)');

		// Drop tables in reverse order (no foreign key dependencies between them)

		// Drop platform_rag_service table
		logger.info('Dropping platform_rag_service table');
		await dropTable(table.platformRagService);

		// Drop platform_service table
		logger.info('Dropping platform_service table');
		await dropTable(table.platformService);

		logger.info('CreatePlatformServiceTables migration rollback (down) completed successfully');
	}
}
