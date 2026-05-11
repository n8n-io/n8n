import { Logger, safeJoinPath } from '@n8n/backend-common';
import type { TagEntity, ICredentialsDb } from '@n8n/db';
import {
	Project,
	WorkflowEntity,
	SharedWorkflow,
	WorkflowTagMapping,
	CredentialsRepository,
	TagRepository,
	WorkflowHistory,
	WorkflowPublishHistory,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { DataSource, EntityManager, In, type EntityMetadata } from '@n8n/typeorm';
import { Service } from '@n8n/di';
import {
	ensureError,
	type INode,
	type INodeCredentialsDetails,
	type IWorkflowBase,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { readdir, readFile } from 'fs/promises';

import { replaceInvalidCredentials, validateWorkflowStructure } from '@/workflow-helpers';
import { validateDbTypeForImportEntities } from '@/utils/validate-database-type';
import { Cipher } from 'n8n-core';
import { decompressFolder } from '@/utils/compression.util';
import { z } from 'zod';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { IWorkflowWithVersionMetadata } from '@/interfaces';
import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';
import { DataTableDDLService } from '@/modules/data-table/data-table-ddl.service';
import { DataTableColumn } from '@/modules/data-table/data-table-column.entity';

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
			postgres: 'SET session_replication_role = ORIGIN;',
			postgresql: 'SET session_replication_role = ORIGIN;',
		},
	};

	constructor(
		private readonly logger: Logger,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly tagRepository: TagRepository,
		private readonly dataSource: DataSource,
		private readonly cipher: Cipher,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly workflowIndexService: WorkflowIndexService,
		private readonly dataTableDDLService: DataTableDDLService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowPublishHistoryRepository: WorkflowPublishHistoryRepository,
	) {}

	async initRecords() {
		this.dbCredentials = await this.credentialsRepository.find();
		this.dbTags = await this.tagRepository.find();
	}

	async importWorkflows(
		workflows: IWorkflowWithVersionMetadata[],
		projectId: string,
		{ activeState = 'false' }: { activeState?: 'false' | 'fromJson' } = {},
	) {
		await this.initRecords();

		const { manager: dbManager } = this.credentialsRepository;

		// Check existence and active status of all workflows
		const workflowIds = workflows.map((w) => w.id).filter((id) => !!id);
		const existingWorkflowIds = new Set<string>();
		const activeVersionIdByWorkflow = new Map<string, string>();

		if (workflowIds.length > 0) {
			const existingWorkflows = await dbManager.find(WorkflowEntity, {
				where: { id: In(workflowIds) },
				select: ['id', 'activeVersionId'],
			});

			for (const { id, activeVersionId } of existingWorkflows) {
				existingWorkflowIds.add(id);
				if (activeVersionId !== null) {
					activeVersionIdByWorkflow.set(id, activeVersionId);
				}
			}
		}

		for (const workflow of workflows) {
			workflow.nodes.forEach((node) => {
				this.toNewCredentialFormat(node);

				if (!node.id) node.id = uuid();
			});

			const hasInvalidCreds = workflow.nodes.some((node) => !node.credentials?.id);

			if (hasInvalidCreds) await this.replaceInvalidCreds(workflow, projectId);
			validateWorkflowStructure(workflow);

			// Remove workflows from ActiveWorkflowManager BEFORE transaction to prevent orphaned trigger listeners
			// Only remove if the workflow already exists in the database and is active
			if (workflow.id && activeVersionIdByWorkflow.has(workflow.id)) {
				await this.activeWorkflowManager.remove(workflow.id);
			}
		}

		const insertedWorkflows: IWorkflowWithVersionMetadata[] = [];
		const workflowsToActivate: Array<{ workflowId: string; versionId: string }> = [];
		await dbManager.transaction(async (tx) => {
			const workflowsNeedingPublishHistory: Array<{ workflowId: string; versionId: string }> = [];

			// Upsert all workflows
			for (const workflow of workflows) {
				// Always generate a new versionId on import to ensure proper history ordering
				workflow.versionId = uuid();

				// Store the old activeVersionId to record the deactivation of the old version
				const oldActiveVersionId = workflow.id ? activeVersionIdByWorkflow.get(workflow.id) : null;
				const shouldActivate = activeState === 'fromJson' && workflow.active;
				const versionIdToActivate = workflow.versionId;

				// Always upsert with active=false and activeVersionId=null.
				// Activation happens post-transaction once the new workflow_history row exists
				// (the activeVersionId FK references workflow_history.versionId).
				if (
					!shouldActivate &&
					(oldActiveVersionId || workflow.activeVersionId || workflow.active)
				) {
					this.logger.info(`Deactivating workflow "${workflow.name}".`);
				}
				workflow.active = false;
				workflow.activeVersionId = null;

				const upsertResult = await tx.upsert(WorkflowEntity, workflow, ['id']);
				const workflowId = upsertResult.identifiers.at(0)?.id as string;
				insertedWorkflows.push({ ...workflow, id: workflowId }); // Collect inserted workflow with correct ID, for indexing later.

				// Only add publish history if workflow was previously active
				if (oldActiveVersionId) {
					workflowsNeedingPublishHistory.push({ workflowId, versionId: oldActiveVersionId });
				}

				if (shouldActivate) {
					workflowsToActivate.push({ workflowId, versionId: versionIdToActivate });
				}

				const personalProject = await tx.findOneByOrFail(Project, { id: projectId });

				// Create relationship if the workflow was inserted instead of updated.
				if (!existingWorkflowIds.has(workflow.id)) {
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

			// Always create workflow history for the current version
			// This is needed to be able to activate the workflow later
			for (const workflow of insertedWorkflows) {
				const versionMetadata = workflow.versionMetadata;
				await tx.insert(WorkflowHistory, {
					versionId: workflow.versionId,
					workflowId: workflow.id,
					nodes: workflow.nodes,
					connections: workflow.connections,
					authors: 'import',
					name: versionMetadata?.name ?? null,
					description: versionMetadata?.description ?? null,
				});
			}

			// Add publish history records for workflows that were deactivated
			for (const { workflowId, versionId } of workflowsNeedingPublishHistory) {
				await tx.insert(WorkflowPublishHistory, {
					workflowId,
					versionId,
					event: 'deactivated',
					userId: null,
				});
			}
		});

		for (const { workflowId, versionId } of workflowsToActivate) {
			await this.activateWorkflow(workflowId, versionId);
		}

		// Directly update the index for the important workflows, since they don't generate
		// workflow-update events during import.
		for (const workflow of insertedWorkflows) {
			await this.workflowIndexService.updateIndexForDraft(workflow);
		}
	}

	private async activateWorkflow(workflowId: string, versionIdToActivate: string): Promise<void> {
		let didActivate = false;
		try {
			await this.workflowRepository.update(
				{ id: workflowId },
				{ activeVersionId: versionIdToActivate },
			);
			await this.workflowRepository.updateActiveState(workflowId, true);
			await this.activeWorkflowManager.add(workflowId, 'activate');
			didActivate = true;
		} catch (e) {
			const error = ensureError(e);
			this.logger.error(`Failed to activate workflow ${workflowId}`, { error });
		} finally {
			if (didActivate) {
				await this.workflowPublishHistoryRepository.addRecord({
					workflowId,
					versionId: versionIdToActivate,
					event: 'activated',
					userId: null,
				});
			}
		}
	}

	async replaceInvalidCreds(workflow: IWorkflowBase, projectId: string) {
		try {
			await replaceInvalidCredentials(workflow, projectId);
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
	 * @param customEncryptionKey - Optional custom encryption key
	 * @returns Array of parsed entity objects
	 */
	async readEntityFile(
		filePath: string,
		customEncryptionKey?: string,
	): Promise<Array<Record<string, unknown>>> {
		const content = await readFile(filePath, 'utf8');
		const entities: Record<string, unknown>[] = [];
		const entitySchema = z.record(z.string(), z.unknown());

		for (const block of content.split('\n')) {
			const lines = (await this.cipher.decryptV2(block, customEncryptionKey)).split(/\r?\n/);

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

	async importEntities(
		inputDir: string,
		truncateTables: boolean,
		keyFilePath?: string,
		skipMigrationChecks = false,
		skipTogglingForeignKeyConstraints = false,
	) {
		validateDbTypeForImportEntities(this.dataSource.options.type);

		// Read custom encryption key from file if provided
		let customEncryptionKey: string | undefined;
		if (keyFilePath) {
			try {
				const keyFileContent = await readFile(keyFilePath, 'utf8');
				customEncryptionKey = keyFileContent.trim();
				this.logger.info(`🔑 Using custom encryption key from: ${keyFilePath}`);
			} catch (error) {
				throw new Error(
					`Failed to read encryption key file at ${keyFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
				);
			}
		}

		await this.decompressEntitiesZip(inputDir);
		if (!skipMigrationChecks) {
			await this.validateMigrations(inputDir, customEncryptionKey);
		} else {
			this.logger.info('⏭️  Skipping migration validation checks');
		}

		await this.dataSource.transaction(async (transactionManager: EntityManager) => {
			if (!skipTogglingForeignKeyConstraints) {
				await this.disableForeignKeyConstraints(transactionManager);
			}

			// Get import metadata after migration validation
			const importMetadata = await this.getImportMetadata(inputDir);
			const { tableNames, entityFiles } = importMetadata;
			const entityNames = Object.keys(entityFiles);

			if (truncateTables) {
				this.logger.info('\n🗑️  Truncating tables before import...');

				// Drop dynamic data-table user tables first; once the registry is
				// truncated we have no way to enumerate them.
				await this.dropExistingDataTableUserTables(transactionManager);

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
			await this.importEntitiesFromFiles(
				inputDir,
				transactionManager,
				entityNames,
				entityFiles,
				customEncryptionKey,
			);

			// Postgres IDENTITY sequences don't auto-advance when explicit ids are
			// inserted, so subsequent implicit inserts would collide. Reset each
			// imported table's sequence to MAX(col).
			await this.advanceIdentitySequences(transactionManager, tableNames);

			// After the data_table / data_table_column registry rows are imported,
			// recreate the dynamic backing tables (empty) so the imported tables work.
			await this.recreateDataTableUserTablesFromRegistry(transactionManager);

			if (!skipTogglingForeignKeyConstraints) {
				await this.enableForeignKeyConstraints(transactionManager);
			}
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
	 * @param customEncryptionKey - Optional custom encryption key
	 * @returns Promise that resolves when all entities are imported
	 */
	async importEntitiesFromFiles(
		inputDir: string,
		transactionManager: EntityManager,
		entityNames: string[],
		entityFiles: Record<string, string[]>,
		customEncryptionKey?: string,
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

						const entities: Array<Record<string, unknown>> = await this.readEntityFile(
							filePath,
							customEncryptionKey,
						);
						this.logger.info(`      Found ${entities.length} entities`);

						await Promise.all(
							entities.map(async (entity) => {
								const normalizedEntity = this.normalizeEntityJsonColumns(entity, entityMetadata);
								const columns = Object.keys(normalizedEntity);
								const columnNames = columns.map(this.dataSource.driver.escape).join(', ');
								const columnValues = columns.map((key) => `:${key}`).join(', ');

								const [query, parameters] = this.dataSource.driver.escapeQueryWithParameters(
									`INSERT INTO ${tableName} (${columnNames}) VALUES (${columnValues})`,
									normalizedEntity,
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

	/**
	 * Normalise JSON column values to JSON strings before a raw INSERT.
	 *
	 * The export uses raw SQL (SELECT … FROM table) which bypasses TypeORM column
	 * transformers entirely. As a result, json/simple-json column values differ by
	 * source database:
	 *   - SQLite  → stored as TEXT, so SELECT returns a plain string
	 *   - Postgres → stored natively, so SELECT returns a parsed JS object/array
	 *
	 * Passing a raw string to a Postgres `json` column or a raw object to SQLite's
	 * TEXT-backed column via a parameterised INSERT produces incorrect data. This
	 * method normalises both cases to a JSON string, which both database drivers
	 * accept correctly for json/simple-json columns.
	 */
	private normalizeEntityJsonColumns(
		entity: Record<string, unknown>,
		metadata: EntityMetadata,
	): Record<string, unknown> {
		const result = { ...entity };

		for (const column of metadata.columns) {
			const { databaseName, type } = column;
			if (type !== 'json' && type !== 'simple-json') continue;

			const value = result[databaseName];
			if (value === null || value === undefined) continue;

			if (typeof value === 'string') {
				// SQLite exports json columns as serialised text — parse then re-serialise
				// to canonical JSON so both SQLite and Postgres targets receive a valid string.
				try {
					result[databaseName] = JSON.stringify(JSON.parse(value));
				} catch {
					// Not a valid JSON string; leave as-is and let the DB validate on insert.
				}
			} else if (typeof value === 'object') {
				// Postgres exports json columns as parsed objects — serialise for raw INSERT.
				result[databaseName] = JSON.stringify(value);
			}
		}

		return result;
	}

	/**
	 * Drop every dynamic data-table user backing table referenced in the destination's
	 * `data_table` registry. Called before truncating registry rows so that backing
	 * tables don't end up orphaned.
	 */
	async dropExistingDataTableUserTables(transactionManager: EntityManager): Promise<void> {
		const tablePrefix = this.dataSource.options.entityPrefix || '';
		const dataTableTableName = `${tablePrefix}data_table`;

		let existing: Array<{ id: string }>;
		try {
			existing = await transactionManager.query(
				`SELECT id FROM ${this.dataSource.driver.escape(dataTableTableName)}`,
			);
		} catch (error) {
			this.logger.info(
				`   ⚠️  ${dataTableTableName} registry not found, skipping dynamic-table cleanup...`,
				{ error },
			);
			return;
		}

		if (existing.length === 0) return;

		this.logger.info(`🗑️  Dropping ${existing.length} existing data-table backing table(s)...`);
		for (const { id } of existing) {
			await this.dataTableDDLService.dropTable(id, transactionManager);
		}
	}

	/**
	 * Recreate dynamic data-table backing tables for every entry in the imported
	 * `data_table` registry. The export bug (ADO-5143) means archives produced
	 * before this fix only contain registry rows; without recreating the backing
	 * tables the imported data tables would reference tables that don't exist on
	 * the destination.
	 *
	 * Tables are dropped before recreation so the operation is idempotent and
	 * handles stale tables left over from a partially-failed prior import.
	 */
	async recreateDataTableUserTablesFromRegistry(transactionManager: EntityManager): Promise<void> {
		const tablePrefix = this.dataSource.options.entityPrefix || '';
		const dataTableTableName = `${tablePrefix}data_table`;
		const dataTableColumnTableName = `${tablePrefix}data_table_column`;

		let dataTables: Array<{ id: string }>;
		try {
			dataTables = await transactionManager.query(
				`SELECT id FROM ${this.dataSource.driver.escape(dataTableTableName)}`,
			);
		} catch (error) {
			this.logger.info(
				`   ⚠️  ${dataTableTableName} registry not present; skipping data-table backing-table recreation.`,
				{ error },
			);
			return;
		}

		if (dataTables.length === 0) return;

		const escapedColumnTable = this.dataSource.driver.escape(dataTableColumnTableName);
		const escapedDataTableId = this.dataSource.driver.escape('dataTableId');
		const escapedIndex = this.dataSource.driver.escape('index');

		const columnRows: Array<{
			id: string;
			dataTableId: string;
			name: string;
			type: 'string' | 'number' | 'boolean' | 'date';
			index: number;
		}> = await transactionManager.query(
			`SELECT id, ${escapedDataTableId}, name, type, ${escapedIndex} FROM ${escapedColumnTable}`,
		);

		const columnsByDataTableId = new Map<string, DataTableColumn[]>();
		for (const row of columnRows) {
			const list = columnsByDataTableId.get(row.dataTableId) ?? [];
			list.push(transactionManager.create(DataTableColumn, row));
			columnsByDataTableId.set(row.dataTableId, list);
		}

		this.logger.info(`\n📚 Recreating ${dataTables.length} data-table backing table(s)...`);

		for (const { id: dataTableId } of dataTables) {
			const cols = (columnsByDataTableId.get(dataTableId) ?? [])
				.slice()
				.sort((a, b) => a.index - b.index);

			await this.dataTableDDLService.dropTable(dataTableId, transactionManager);
			await this.dataTableDDLService.createTableWithColumns(dataTableId, cols, transactionManager);
		}

		this.logger.info(`✅ Recreated ${dataTables.length} data-table backing table(s)`);
	}

	/**
	 * Advance Postgres IDENTITY sequences to MAX(col) for every identity column
	 * in the given tables. No-op on SQLite, where INTEGER PRIMARY KEY auto-bumps
	 * its rowid sequence on inserts with explicit ids.
	 */
	async advanceIdentitySequences(
		transactionManager: EntityManager,
		tableNames: string[],
	): Promise<void> {
		if (this.dataSource.options.type !== 'postgres') return;
		if (tableNames.length === 0) return;

		this.logger.info('\n🔢 Advancing Postgres IDENTITY sequences...');
		let advanced = 0;

		for (const tableName of tableNames) {
			const identityColumns: Array<{ column_name: string }> = await transactionManager.query(
				`SELECT column_name FROM information_schema.columns
					WHERE table_schema = current_schema()
						AND table_name = $1
						AND identity_generation IS NOT NULL`,
				[tableName],
			);

			if (identityColumns.length === 0) continue;

			const escapedTable = this.dataSource.driver.escape(tableName);
			for (const { column_name: columnName } of identityColumns) {
				const escapedCol = this.dataSource.driver.escape(columnName);
				await transactionManager.query(
					`SELECT setval(
						pg_get_serial_sequence($1, $2),
						COALESCE((SELECT MAX(${escapedCol}) FROM ${escapedTable}), 1),
						(SELECT MAX(${escapedCol}) FROM ${escapedTable}) IS NOT NULL
					)`,
					[escapedTable, columnName],
				);
				advanced++;
			}
		}

		this.logger.info(`✅ Advanced ${advanced} sequence(s) across ${tableNames.length} table(s)`);
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
	 * @param customEncryptionKey - Optional custom encryption key
	 * @returns Promise that resolves if migrations match, throws error if they don't
	 */
	async validateMigrations(inputDir: string, customEncryptionKey?: string): Promise<void> {
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
		const importMigrations = (
			await this.cipher.decryptV2(migrationsFileContent, customEncryptionKey)
		)
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

		this.logger.info(
			'✅ Migration validation passed - import data matches target database migration state',
		);
	}
}
