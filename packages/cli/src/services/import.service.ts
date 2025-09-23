import { Logger } from '@n8n/backend-common';
import type { TagEntity, ICredentialsDb, IWorkflowDb } from '@n8n/db';
import {
	Project,
	WorkflowEntity,
	SharedWorkflow,
	WorkflowTagMapping,
	CredentialsRepository,
	TagRepository,
} from '@n8n/db';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { DataSource, EntityManager } from '@n8n/typeorm';
import { Service } from '@n8n/di';
import { type INode, type INodeCredentialsDetails, type IWorkflowBase } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { replaceInvalidCredentials } from '@/workflow-helpers';

@Service()
export class ImportService {
	private dbCredentials: ICredentialsDb[] = [];

	private dbTags: TagEntity[] = [];

	constructor(
		private readonly logger: Logger,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly tagRepository: TagRepository,
		private readonly dataSource: DataSource,
	) {}

	async initRecords() {
		this.dbCredentials = await this.credentialsRepository.find();
		this.dbTags = await this.tagRepository.find();
	}

	async importWorkflows(workflows: IWorkflowDb[], projectId: string) {
		await this.initRecords();

		for (const workflow of workflows) {
			workflow.nodes.forEach((node) => {
				this.toNewCredentialFormat(node);

				if (!node.id) node.id = uuid();
			});

			const hasInvalidCreds = workflow.nodes.some((node) => !node.credentials?.id);

			if (hasInvalidCreds) await this.replaceInvalidCreds(workflow);
		}

		const { manager: dbManager } = this.credentialsRepository;
		await dbManager.transaction(async (tx) => {
			for (const workflow of workflows) {
				if (workflow.active) {
					workflow.active = false;

					this.logger.info(`Deactivating workflow "${workflow.name}". Remember to activate later.`);
				}

				const exists = workflow.id ? await tx.existsBy(WorkflowEntity, { id: workflow.id }) : false;

				// @ts-ignore CAT-957
				const upsertResult = await tx.upsert(WorkflowEntity, workflow, ['id']);
				const workflowId = upsertResult.identifiers.at(0)?.id as string;

				const personalProject = await tx.findOneByOrFail(Project, { id: projectId });

				// Create relationship if the workflow was inserted instead of updated.
				if (!exists) {
					await tx.upsert(
						SharedWorkflow,
						{ workflowId, projectId: personalProject.id, role: 'workflow:owner' },
						['workflowId', 'projectId'],
					);
				}

				if (!workflow.tags?.length) continue;

				await this.tagRepository.setTags(tx, this.dbTags, workflow);

				for (const tag of workflow.tags) {
					await tx.upsert(WorkflowTagMapping, { tagId: tag.id, workflowId }, [
						'tagId',
						'workflowId',
					]);
				}
			}
		});
	}

	async replaceInvalidCreds(workflow: IWorkflowBase) {
		try {
			await replaceInvalidCredentials(workflow);
		} catch (e) {
			this.logger.error('Failed to replace invalid credential', { error: e });
		}
	}

	/**
	 * Generate SQL command to disable foreign key constraints for the specified database type
	 * @param dbType - Database type ('sqlite' or 'postgres')
	 * @returns SQL command string to disable foreign key constraints
	 */
	generateForeignKeyDisableCommand(dbType: string): string {
		switch (dbType.toLowerCase()) {
			case 'sqlite':
			case 'sqlite-pooled':
			case 'sqlite-memory':
				return 'PRAGMA foreign_keys = OFF;';
			case 'postgres':
			case 'postgresql':
				return 'SET session_replication_role = replica;';
			default:
				throw new Error(`Unsupported database type: ${dbType}. Supported types: sqlite, postgres`);
		}
	}

	/**
	 * Generate SQL command to enable foreign key constraints for the specified database type
	 * @param dbType - Database type ('sqlite' or 'postgres')
	 * @returns SQL command string to enable foreign key constraints
	 */
	generateForeignKeyEnableCommand(dbType: string): string {
		switch (dbType.toLowerCase()) {
			case 'sqlite':
			case 'sqlite-pooled':
			case 'sqlite-memory':
				return 'PRAGMA foreign_keys = ON;';
			case 'postgres':
			case 'postgresql':
				return 'SET session_replication_role = DEFAULT;';
			default:
				throw new Error(`Unsupported database type: ${dbType}. Supported types: sqlite, postgres`);
		}
	}

	/**
	 * Check if a table is empty (has no rows)
	 * @param tableName - Name of the table to check
	 * @returns Promise that resolves to true if table is empty, false otherwise
	 */
	async isTableEmpty(tableName: string): Promise<boolean> {
		try {
			const result = await this.dataSource
				.createQueryBuilder()
				.select('COUNT(*)', 'count')
				.from(tableName, tableName)
				.getRawOne<{ count: string }>();

			this.logger.debug(`Table ${tableName} has ${result?.count} rows`);
			return result?.count === '0';
		} catch (error: unknown) {
			this.logger.error(`Failed to check if table ${tableName} is empty:`, { error });
			throw new Error(`Unable to check table ${tableName}`);
		}
	}

	/**
	 * Check if all tables are empty
	 * @param tableNames - Array of table names to check
	 * @returns Promise that resolves to true if all tables are empty, false if any have data
	 */
	async areAllEntityTablesEmpty(tableNames: string[]): Promise<boolean> {
		if (tableNames.length === 0) {
			this.logger.info('No table names provided, considering all tables empty');
			return true;
		}

		this.logger.info(`Checking if ${tableNames.length} tables are empty...`);

		const nonEmptyTables: string[] = [];

		for (const tableName of tableNames) {
			const isEmpty = await this.isTableEmpty(tableName);

			if (!isEmpty) {
				nonEmptyTables.push(tableName);
			}
		}

		if (nonEmptyTables.length > 0) {
			this.logger.info(
				`📊 Found ${nonEmptyTables.length} table(s) with existing data: ${nonEmptyTables.join(', ')}`,
			);
			return false;
		}

		this.logger.info('✅ All tables are empty');
		return true;
	}

	/**
	 * Truncate a specific entity table
	 * @param entityName - Name of the entity to truncate
	 * @returns Promise that resolves when the table is truncated
	 */
	async truncateEntityTable(tableName: string, transactionManager: EntityManager): Promise<void> {
		this.logger.info(`🗑️  Truncating table: ${tableName}`);

		const dbType = this.dataSource.options.type;

		if (
			['sqlite', 'sqlite-pooled', 'sqlite-memory', 'postgres', 'postgresql'].includes(
				dbType.toLowerCase(),
			)
		) {
			await transactionManager.createQueryBuilder().delete().from(tableName, tableName).execute();
		} else {
			throw new Error(`Unsupported database type: ${dbType}. Supported types: sqlite, postgres`);
		}

		this.logger.info(`   ✅ Table ${tableName} truncated successfully`);
	}

	/**
	 * Get list of table names that will be imported from the input directory
	 * @param inputDir - Directory containing exported entity files
	 * @returns Array of table names that have corresponding files
	 */
	async getTableNamesForImport(inputDir: string): Promise<string[]> {
		const files = await readdir(inputDir);
		const entityNames = new Set<string>();

		for (const file of files) {
			if (file.endsWith('.jsonl')) {
				const entityName = file.replace(/\.\d+\.jsonl$/, '.jsonl').replace('.jsonl', '');
				// Exclude migrations from regular entity import
				if (entityName !== 'migrations') {
					entityNames.add(entityName);
				}
			}
		}

		// Convert entity names to table names using entity metadata
		const tableNames: string[] = [];
		for (const entityName of entityNames) {
			const entityMetadata = this.dataSource.entityMetadatas.find(
				(meta) => meta.name.toLowerCase() === entityName,
			);

			if (entityMetadata) {
				tableNames.push(entityMetadata.tableName);
			} else {
				this.logger.warn(`⚠️  No entity metadata found for ${entityName}, skipping...`);
			}
		}

		return tableNames;
	}

	/**
	 * Validates that the migrations in the import data match the target database
	 * @param inputDir - Directory containing exported entity files
	 * @returns Promise that resolves if migrations match, throws error if they don't
	 */
	async validateMigrations(inputDir: string): Promise<void> {
		const migrationsFilePath = path.join(inputDir, 'migrations.jsonl');

		try {
			// Check if migrations file exists
			await readFile(migrationsFilePath, 'utf8');
		} catch (error) {
			throw new Error(
				'Migrations file not found. Cannot proceed with import without migration validation.',
			);
		}

		// Read and parse migrations from file
		const migrationsFileContent = await readFile(migrationsFilePath, 'utf8');
		const importMigrations = migrationsFileContent
			.trim()
			.split('\n')
			.filter((line) => line.trim())
			.map((line) => {
				try {
					return JSON.parse(line) as Record<string, unknown>;
				} catch (error) {
					throw new Error(
						`Invalid JSON in migrations file: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
				}
			});

		if (importMigrations.length === 0) {
			this.logger.info('No migrations found in import data');
			return;
		}

		// Find the latest migration in import data
		const latestImportMigration = importMigrations.reduce((latest, current) => {
			const currentTimestamp = parseInt(String(current.timestamp || current.id || '0'));
			const latestTimestamp = parseInt(String(latest.timestamp || latest.id || '0'));
			return currentTimestamp > latestTimestamp ? current : latest;
		});

		this.logger.info(
			`Latest migration in import data: ${String(latestImportMigration.name)} (timestamp: ${String(latestImportMigration.timestamp || latestImportMigration.id)}, id: ${String(latestImportMigration.id)})`,
		);

		// Get migrations from target database
		const tablePrefix = this.dataSource.options.entityPrefix || '';
		const migrationsTableName = `${tablePrefix}migrations`;

		try {
			const dbMigrations = await this.dataSource.query(
				`SELECT * FROM ${this.dataSource.driver.escape(migrationsTableName)} ORDER BY timestamp DESC LIMIT 1`,
			);

			if (dbMigrations.length === 0) {
				throw new Error(
					'Target database has no migrations. Cannot import data from a different migration state.',
				);
			}

			const latestDbMigration = dbMigrations[0];
			this.logger.info(
				`Latest migration in target database: ${latestDbMigration.name} (timestamp: ${latestDbMigration.timestamp}, id: ${latestDbMigration.id})`,
			);

			// Compare timestamps, names, and IDs for comprehensive validation
			const importTimestamp = parseInt(
				String(latestImportMigration.timestamp || latestImportMigration.id || '0'),
			);
			const dbTimestamp = parseInt(String(latestDbMigration.timestamp || '0'));
			const importName = latestImportMigration.name;
			const dbName = latestDbMigration.name;
			const importId = latestImportMigration.id;
			const dbId = latestDbMigration.id;

			// Check timestamp match
			if (importTimestamp !== dbTimestamp) {
				throw new Error(
					'Migration timestamp mismatch. Import data: ' +
						String(importName) +
						' (' +
						String(importTimestamp) +
						') ' +
						'does not match target database: ' +
						String(dbName) +
						' (' +
						String(dbTimestamp) +
						'). ' +
						'Cannot import data from different migration states.',
				);
			}

			// Check name match
			if (importName !== dbName) {
				throw new Error(
					'Migration name mismatch. Import data: ' +
						String(importName) +
						' ' +
						'does not match target database: ' +
						String(dbName) +
						'. ' +
						'Cannot import data from different migration states.',
				);
			}

			// Check ID match (if both have IDs)
			if (importId && dbId && importId !== dbId) {
				throw new Error(
					'Migration ID mismatch. Import data: ' +
						String(importName) +
						' (id: ' +
						String(importId) +
						') ' +
						'does not match target database: ' +
						String(dbName) +
						' (id: ' +
						String(dbId) +
						'). ' +
						'Cannot import data from different migration states.',
				);
			}

			this.logger.info(
				'✅ Migration validation passed - import data matches target database migration state',
			);
		} catch (error) {
			if (
				error instanceof Error &&
				(error.message.includes('Migration timestamp mismatch') ||
					error.message.includes('Migration name mismatch') ||
					error.message.includes('Migration ID mismatch') ||
					error.message.includes('Target database has no migrations') ||
					error.message.includes('Invalid JSON in migrations file'))
			) {
				throw error;
			}
			// If we can't query the migrations table, abort the import to prevent schema/data mismatch
			throw new Error(
				'Could not validate migrations against target database. Cannot proceed with import without migration validation to prevent schema/data mismatch.',
			);
		}
	}

	/**
	 * Get list of entity files from the input directory
	 * @param inputDir - Directory containing exported entity files
	 * @returns Array of entity file paths grouped by entity name
	 */
	async getEntityFiles(inputDir: string): Promise<Map<string, string[]>> {
		const files = await readdir(inputDir);
		const entityFiles = new Map<string, string[]>();

		// Group files by entity name (e.g., "user.jsonl", "user.2.jsonl" -> "user")
		for (const file of files) {
			if (file.endsWith('.jsonl')) {
				const entityName = file.replace(/\.\d+\.jsonl$/, '.jsonl').replace('.jsonl', '');
				if (!entityFiles.has(entityName)) {
					entityFiles.set(entityName, []);
				}

				entityFiles.get(entityName)!.push(path.join(inputDir, file));
			}
		}

		return entityFiles;
	}

	/**
	 * Read and parse JSONL file content
	 * @param filePath - Path to the JSONL file
	 * @returns Array of parsed entity objects
	 */
	async readEntityFile(filePath: string): Promise<unknown[]> {
		const content = await readFile(filePath, 'utf8');

		// For JSONL, we need to split by actual line endings (\n or \r\n)
		// Each line should contain exactly one complete JSON object
		const lines = content.split(/\r?\n/);
		const entities: unknown[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (!line) continue;

			try {
				entities.push(JSON.parse(line));
			} catch (error: unknown) {
				// If parsing fails, it might be because the JSON spans multiple lines
				// This shouldn't happen in proper JSONL, but let's handle it gracefully
				this.logger.error(`Failed to parse JSON on line ${i + 1} in ${filePath}`, { error });
				this.logger.error(`Line content (first 200 chars): ${line.substring(0, 200)}...`);
				throw new Error(
					`Invalid JSON on line ${i + 1} in file ${filePath}. JSONL format requires one complete JSON object per line.`,
				);
			}
		}

		return entities;
	}

	async importEntities(inputDir: string, truncateTables: boolean) {
		// Validate migrations before starting the import process
		await this.validateMigrations(inputDir);

		await this.dataSource.transaction(async (transactionManager: EntityManager) => {
			await this.disableForeignKeyConstraints(transactionManager);

			const tableNames = await this.getTableNamesForImport(inputDir);

			if (truncateTables) {
				this.logger.info('\n🗑️  Truncating tables before import...');

				this.logger.info(`Found ${tableNames.length} tables to truncate: ${tableNames.join(', ')}`);

				for (const tableName of tableNames) {
					await this.truncateEntityTable(tableName, transactionManager);
				}

				this.logger.info('✅ All tables truncated successfully');
			}

			if (!truncateTables) {
				if (!(await this.areAllEntityTablesEmpty(tableNames))) {
					this.logger.info(
						'\n🗑️  Not all tables are empty, skipping import, you can use --truncateTables to truncate tables before import if needed',
					);
					return;
				}
			}

			// Import entities from the specified directory
			await this.importEntitiesFromFiles(inputDir, transactionManager);

			await this.enableForeignKeyConstraints(transactionManager);
		});
	}

	/**
	 * Import entities from JSONL files into the database
	 * @param inputDir - Directory containing exported entity files
	 * @returns Promise that resolves when all entities are imported
	 */
	async importEntitiesFromFiles(
		inputDir: string,
		transactionManager: EntityManager,
	): Promise<void> {
		this.logger.info(`\n🚀 Starting entity import from directory: ${inputDir}`);

		const entityFiles = await this.getEntityFiles(inputDir);

		if (entityFiles.size === 0) {
			this.logger.warn('No entity files found in input directory');
			return;
		}

		this.logger.info(`📋 Found ${entityFiles.size} entity types to import:`);
		for (const [entityName, files] of entityFiles) {
			this.logger.info(`   • ${entityName}: ${files.length} file(s)`);
		}

		let totalEntitiesImported = 0;

		for (const [entityName, files] of entityFiles) {
			this.logger.info(`\n📊 Importing ${entityName} entities...`);

			const entityMetadata = this.dataSource.entityMetadatas.find(
				(meta) => meta.name.toLowerCase() === entityName,
			);

			if (!entityMetadata) {
				this.logger.warn(`   ⚠️  No entity metadata found for ${entityName}, skipping...`);
				continue;
			}

			const tableName = entityMetadata.tableName;
			this.logger.info(`   📋 Target table: ${tableName}`);

			let entityCount = 0;
			for (const filePath of files) {
				this.logger.info(`   📁 Reading file: ${path.basename(filePath)}`);

				const entities = await this.readEntityFile(filePath);
				this.logger.info(`      Found ${entities.length} entities`);

				if (entities.length > 0) {
					await transactionManager.insert(tableName, entities);
					entityCount += entities.length;
				}
			}

			this.logger.info(`   ✅ Completed ${entityName}: ${entityCount} entities imported`);
			totalEntitiesImported += entityCount;
		}

		this.logger.info('\n📊 Import Summary:');
		this.logger.info(`   Total entities imported: ${totalEntitiesImported}`);
		this.logger.info(`   Entity types processed: ${entityFiles.size}`);
		this.logger.info('✅ Import completed successfully!');
	}

	/**
	 * Convert a node's credentials from old format `{ <nodeType>: <credentialName> }`
	 * to new format: `{ <nodeType>: { id: string | null, name: <credentialName> } }`
	 */
	private toNewCredentialFormat(node: INode) {
		if (!node.credentials) return;

		for (const [type, name] of Object.entries(node.credentials)) {
			if (typeof name !== 'string') continue;

			const nodeCredential: INodeCredentialsDetails = { id: null, name };

			const match = this.dbCredentials.find((c) => c.name === name && c.type === type);

			if (match) nodeCredential.id = match.id;

			node.credentials[type] = nodeCredential;
		}
	}

	async disableForeignKeyConstraints(transactionManager: EntityManager) {
		const disableCommand = this.generateForeignKeyDisableCommand(this.dataSource.options.type);
		this.logger.debug(`Executing: ${disableCommand}`);
		await transactionManager.query(disableCommand);
		this.logger.info('✅ Foreign key constraints disabled');
	}

	async enableForeignKeyConstraints(transactionManager: EntityManager) {
		const enableCommand = this.generateForeignKeyEnableCommand(this.dataSource.options.type);
		this.logger.debug(`Executing: ${enableCommand}`);
		await transactionManager.query(enableCommand);
		this.logger.info('✅ Foreign key constraints re-enabled');
	}
}
