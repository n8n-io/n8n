import { Logger, safeJoinPath } from '@n8n/backend-common';
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

import { replaceInvalidCredentials } from '@/workflow-helpers';
import { validateDbTypeForImportEntities } from '@/utils/validate-database-type';
import { Cipher } from 'n8n-core';
import { decompressFolder } from '@/utils/compression.util';
import { z } from 'zod';
import { ActiveWorkflowManager } from '@/active-workflow-manager';

@Service()
export class ImportService {
	private dbCredentials: ICredentialsDb[] = [];

	private dbTags: TagEntity[] = [];

	private foreignKeyCommands: Record<'enable' | 'disable', Record<string, string>> = {
		disable: {
			sqlite: 'PRAGMA defer_foreign_keys = ON;',
			'sqlite-pooled': 'PRAGMA defer_foreign_keys = ON;',
			'sqlite-memory': 'PRAGMA defer_foreign_keys = ON;',
			postgres: 'SET session_replication_role = replica;',
			postgresql: 'SET session_replication_role = replica;',
		},
		enable: {
			sqlite: 'PRAGMA defer_foreign_keys = OFF;',
			'sqlite-pooled': 'PRAGMA defer_foreign_keys = OFF;',
			'sqlite-memory': 'PRAGMA defer_foreign_keys = OFF;',
			postgres: 'SET session_replication_role = DEFAULT;',
			postgresql: 'SET session_replication_role = DEFAULT;',
		},
	};

	constructor(
		private readonly logger: Logger,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly tagRepository: TagRepository,
		private readonly dataSource: DataSource,
		private readonly cipher: Cipher,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
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

			// Remove workflows from ActiveWorkflowManager BEFORE transaction to prevent orphaned trigger listeners
			if (workflow.id) {
				await this.activeWorkflowManager.remove(workflow.id);
			}
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
	 * Check if a table is empty (has no rows)
	 * @param tableName - Name of the table to check
	 * @returns Promise that resolves to true if table is empty, false otherwise
	 */
	async isTableEmpty(tableName: string): Promise<boolean> {
		try {
			const result = await this.dataSource
				.createQueryBuilder()
				.select('1')
				.from(tableName, tableName)
				.limit(1)
				.getRawMany();

			this.logger.debug(`Table ${tableName} has ${result.length} rows`);
			return result.length === 0;
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

		await transactionManager.createQueryBuilder().delete().from(tableName, tableName).execute();

		this.logger.info(`   ✅ Table ${tableName} truncated successfully`);
	}

	/**
	 * Get import metadata including table names and entity files
	 * @param inputDir - Directory containing exported entity files
	 * @returns Object containing table names and entity files grouped by entity name
	 */
	async getImportMetadata(inputDir: string): Promise<{
		tableNames: string[];
		entityFiles: Record<string, string[]>;
	}> {
		const files = await readdir(inputDir);
		const entityTableNamesMap: Record<string, string> = {};
		const entityFiles: Record<string, string[]> = {};

		for (const file of files) {
			if (file.endsWith('.jsonl')) {
				const entityName = file.replace(/\.\d+\.jsonl$/, '.jsonl').replace('.jsonl', '');
				// Exclude migrations from regular entity import
				if (entityName === 'migrations') {
					continue;
				}

				// Build table names map (only need to do this once per entity)
				if (!entityTableNamesMap[entityName]) {
					const entityMetadata = this.dataSource.entityMetadatas.find(
						(meta) => meta.name.toLowerCase() === entityName,
					);

					if (!entityMetadata) {
						this.logger.warn(`⚠️  No entity metadata found for ${entityName}, skipping...`);
						continue;
					}

					entityTableNamesMap[entityName] = entityMetadata.tableName;
				}

				// Build entity files map (only for entities with valid metadata)
				if (!entityFiles[entityName]) {
					entityFiles[entityName] = [];
				}
				entityFiles[entityName].push(safeJoinPath(inputDir, file));
			}
		}

		return {
			tableNames: Object.values(entityTableNamesMap),
			entityFiles,
		};
	}

	/**
	 * Read and parse JSONL file content
	 * @param filePath - Path to the JSONL file
	 * @returns Array of parsed entity objects
	 */
	async readEntityFile(filePath: string): Promise<Array<Record<string, unknown>>> {
		const content = await readFile(filePath, 'utf8');
		const entities: Record<string, unknown>[] = [];
		const entitySchema = z.record(z.string(), z.unknown());

		for (const block of content.split('\n')) {
			const lines = this.cipher.decrypt(block).split(/\r?\n/);

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();

				if (!line) continue;

				try {
					entities.push(entitySchema.parse(JSON.parse(line)));
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
		}

		return entities;
	}

	private async decompressEntitiesZip(inputDir: string): Promise<void> {
		const entitiesZipPath = safeJoinPath(inputDir, 'entities.zip');
		const { existsSync } = await import('fs');

		if (!existsSync(entitiesZipPath)) {
			throw new Error(`entities.zip file not found in ${inputDir}.`);
		}

		this.logger.info(`\n🗜️  Found entities.zip file, decompressing to ${inputDir}...`);
		await decompressFolder(entitiesZipPath, inputDir);
		this.logger.info('✅ Successfully decompressed entities.zip');
	}

	async importEntities(inputDir: string, truncateTables: boolean) {
		validateDbTypeForImportEntities(this.dataSource.options.type);

		await this.decompressEntitiesZip(inputDir);
		await this.validateMigrations(inputDir);

		await this.dataSource.transaction(async (transactionManager: EntityManager) => {
			await this.disableForeignKeyConstraints(transactionManager);

			// Get import metadata after migration validation
			const importMetadata = await this.getImportMetadata(inputDir);
			const { tableNames, entityFiles } = importMetadata;
			const entityNames = Object.keys(entityFiles);

			if (truncateTables) {
				this.logger.info('\n🗑️  Truncating tables before import...');

				this.logger.info(`Found ${tableNames.length} tables to truncate: ${tableNames.join(', ')}`);

				await Promise.all(
					tableNames.map(
						async (tableName) => await this.truncateEntityTable(tableName, transactionManager),
					),
				);

				this.logger.info('✅ All tables truncated successfully');
			}

			if (!truncateTables && !(await this.areAllEntityTablesEmpty(tableNames))) {
				this.logger.info(
					'\n🗑️  Not all tables are empty, skipping import, you can use --truncateTables to truncate tables before import if needed',
				);
				return;
			}

			// Import entities from the specified directory
			await this.importEntitiesFromFiles(inputDir, transactionManager, entityNames, entityFiles);

			await this.enableForeignKeyConstraints(transactionManager);
		});

		// Cleanup decompressed files after import
		const { readdir, rm } = await import('fs/promises');
		const files = await readdir(inputDir);
		for (const file of files) {
			if (file.endsWith('.jsonl') && file !== 'entities.zip') {
				await rm(safeJoinPath(inputDir, file));
				this.logger.info(`   Removed: ${file}`);
			}
		}
		this.logger.info(`\n🗑️  Cleaned up decompressed files in ${inputDir}`);
	}

	/**
	 * Import entities from JSONL files into the database
	 * @param inputDir - Directory containing exported entity files
	 * @param transactionManager - TypeORM transaction manager
	 * @param entityNames - Array of entity names to import
	 * @param entityFiles - Record of entity names to their file paths
	 * @returns Promise that resolves when all entities are imported
	 */
	async importEntitiesFromFiles(
		inputDir: string,
		transactionManager: EntityManager,
		entityNames: string[],
		entityFiles: Record<string, string[]>,
	): Promise<void> {
		this.logger.info(`\n🚀 Starting entity import from directory: ${inputDir}`);

		if (entityNames.length === 0) {
			this.logger.warn('No entity files found in input directory');
			return;
		}

		this.logger.info(`📋 Found ${entityNames.length} entity types to import:`);

		let totalEntitiesImported = 0;

		await Promise.all(
			entityNames.map(async (entityName) => {
				const files = entityFiles[entityName];
				this.logger.info(`   • ${entityName}: ${files.length} file(s)`);
				this.logger.info(`\n📊 Importing ${entityName} entities...`);

				const entityMetadata = this.dataSource.entityMetadatas.find(
					(meta) => meta.name.toLowerCase() === entityName,
				);

				if (!entityMetadata) {
					this.logger.warn(`   ⚠️  No entity metadata found for ${entityName}, skipping...`);
					return;
				}

				const tableName = this.dataSource.driver.escape(entityMetadata.tableName);
				this.logger.info(`   📋 Target table: ${tableName}`);

				let entityCount = 0;
				await Promise.all(
					files.map(async (filePath) => {
						this.logger.info(`   📁 Reading file: ${filePath}`);

						const entities: Array<Record<string, unknown>> = await this.readEntityFile(filePath);
						this.logger.info(`      Found ${entities.length} entities`);

						await Promise.all(
							entities.map(async (entity) => {
								const columns = Object.keys(entity);
								const columnNames = columns.map(this.dataSource.driver.escape).join(', ');
								const columnValues = columns.map((key) => `:${key}`).join(', ');

								const [query, parameters] = this.dataSource.driver.escapeQueryWithParameters(
									`INSERT INTO ${tableName} (${columnNames}) VALUES (${columnValues})`,
									entity,
									{},
								);

								await transactionManager.query(query, parameters);
							}),
						);

						entityCount += entities.length;
					}),
				);

				this.logger.info(`   ✅ Completed ${entityName}: ${entityCount} entities imported`);
				totalEntitiesImported += entityCount;
			}),
		);

		this.logger.info('\n📊 Import Summary:');
		this.logger.info(`   Total entities imported: ${totalEntitiesImported}`);
		this.logger.info(`   Entity types processed: ${entityNames.length}`);
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
		const disableCommand = this.foreignKeyCommands.disable[this.dataSource.options.type];

		if (!disableCommand) {
			throw new Error(
				`Unsupported database type: ${this.dataSource.options.type}. Supported types: sqlite, postgres`,
			);
		}

		this.logger.debug(`Executing: ${disableCommand}`);
		await transactionManager.query(disableCommand);
		this.logger.info('✅ Foreign key constraints disabled');
	}

	async enableForeignKeyConstraints(transactionManager: EntityManager) {
		const enableCommand = this.foreignKeyCommands.enable[this.dataSource.options.type];

		if (!enableCommand) {
			throw new Error(
				`Unsupported database type: ${this.dataSource.options.type}. Supported types: sqlite, postgres`,
			);
		}

		this.logger.debug(`Executing: ${enableCommand}`);
		await transactionManager.query(enableCommand);
		this.logger.info('✅ Foreign key constraints re-enabled');
	}

	/**
	 * Validates that the migrations in the import data match the target database
	 * @param inputDir - Directory containing exported entity files
	 * @returns Promise that resolves if migrations match, throws error if they don't
	 */
	async validateMigrations(inputDir: string): Promise<void> {
		const migrationsFilePath = safeJoinPath(inputDir, 'migrations.jsonl');

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
		const importMigrations = this.cipher
			.decrypt(migrationsFileContent)
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
				`Migration timestamp mismatch. Import data: ${String(importName)} (${String(importTimestamp)}) does not match target database ${String(dbName)} (${String(dbTimestamp)}). Cannot import data from different migration states.`,
			);
		}

		// Check name match
		if (importName !== dbName) {
			throw new Error(
				`Migration name mismatch. Import data: ${String(importName)} does not match target database ${String(dbName)}. Cannot import data from different migration states.`,
			);
		}

		// Check ID match (if both have IDs)
		if (importId && dbId && importId !== dbId) {
			throw new Error(
				`Migration ID mismatch. Import data: ${String(importName)} (id: ${String(importId)}) does not match target database ${String(dbName)} (id: ${String(dbId)}). Cannot import data from different migration states.`,
			);
		}

		this.logger.info(
			'✅ Migration validation passed - import data matches target database migration state',
		);
	}
}
