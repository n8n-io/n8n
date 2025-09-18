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
import { Service } from '@n8n/di';
import { type INode, type INodeCredentialsDetails, type IWorkflowBase } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { replaceInvalidCredentials } from '@/workflow-helpers';
import { DataSource } from '@n8n/db';

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
				return 'PRAGMA foreign_keys = ON;';
			case 'postgres':
			case 'postgresql':
				return 'SET session_replication_role = DEFAULT;';
			default:
				throw new Error(`Unsupported database type: ${dbType}. Supported types: sqlite, postgres`);
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

			// Skip empty lines
			if (!line) {
				continue;
			}

			try {
				const entity = JSON.parse(line);
				entities.push(entity);
			} catch (error) {
				// If parsing fails, it might be because the JSON spans multiple lines
				// This shouldn't happen in proper JSONL, but let's handle it gracefully
				this.logger.error(`Failed to parse JSON on line ${i + 1} in ${filePath}`, error);
				this.logger.error(`Line content (first 200 chars): ${line.substring(0, 200)}...`);
				throw new Error(
					`Invalid JSON on line ${i + 1} in file ${filePath}. JSONL format requires one complete JSON object per line.`,
				);
			}
		}

		return entities;
	}

	/**
	 * Import entities from JSONL files into the database
	 * @param inputDir - Directory containing exported entity files
	 * @returns Promise that resolves when all entities are imported
	 */
	async importEntitiesFromFiles(inputDir: string): Promise<void> {
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

		// Process each entity type
		for (const [entityName, files] of entityFiles) {
			this.logger.info(`\n📊 Importing ${entityName} entities...`);

			// Find the corresponding entity metadata
			const entityMetadata = this.dataSource.entityMetadatas.find(
				(meta) => meta.name.toLowerCase() === entityName,
			);

			if (!entityMetadata) {
				this.logger.warn(`   ⚠️  No entity metadata found for ${entityName}, skipping...`);
				continue;
			}

			const tableName = entityMetadata.tableName;
			this.logger.info(`   📋 Target table: ${tableName}`);

			// Read all files for this entity
			let entityCount = 0;
			for (const filePath of files) {
				this.logger.info(`   📁 Reading file: ${path.basename(filePath)}`);

				const entities = await this.readEntityFile(filePath);
				this.logger.info(`      Found ${entities.length} entities`);

				// Import entities in batches
				if (entities.length > 0) {
					await this.importEntityBatch(tableName, entities);
					entityCount += entities.length;
				}
			}

			this.logger.info(`   ✅ Completed ${entityName}: ${entityCount} entities imported`);
			totalEntitiesImported += entityCount;
		}

		this.logger.info(`\n📊 Import Summary:`);
		this.logger.info(`   Total entities imported: ${totalEntitiesImported}`);
		this.logger.info(`   Entity types processed: ${entityFiles.size}`);
		this.logger.info('✅ Import completed successfully!');
	}

	/**
	 * Import a batch of entities into a specific table
	 * @param tableName - Name of the target table
	 * @param entities - Array of entity objects to import
	 */
	async importEntityBatch(tableName: string, entities: unknown[]): Promise<void> {
		if (entities.length === 0) return;

		// Get column names from the first entity
		const firstEntity = entities[0] as Record<string, unknown>;
		const columns = Object.keys(firstEntity);
		const columnNames = columns.join(', ');
		const placeholders = columns.map(() => '?').join(', ');

		// Create batch insert query
		const query = `INSERT OR REPLACE INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

		// Execute batch insert
		for (const entity of entities) {
			const values = columns.map((col) => (entity as Record<string, unknown>)[col]);
			await this.dataSource.query(query, values);
		}

		this.logger.debug(`      Imported ${entities.length} entities into ${tableName}`);
	}

	/**
	 * Disable and re-enable foreign key constraints for entity import operations
	 * @param inputDir - Directory containing exported entity files
	 * @returns Promise that resolves when foreign key constraints are disabled and re-enabled
	 */
	async importEntities(inputDir: string): Promise<void> {
		if (!this.dataSource.isInitialized) {
			throw new Error('DataSource is not initialized');
		}

		// Get database type from DataSource
		const dbType = this.dataSource.options.type;
		if (!dbType) {
			throw new Error('Unable to determine database type from DataSource');
		}

		this.logger.info(`Disabling foreign key constraints for database type: ${dbType}`);

		// Disable foreign key constraints
		const disableCommand = this.generateForeignKeyDisableCommand(dbType);
		this.logger.debug(`Executing: ${disableCommand}`);
		await this.dataSource.query(disableCommand);

		this.logger.info('Foreign key constraints disabled');

		try {
			// Import entities from files
			await this.importEntitiesFromFiles(inputDir);
		} finally {
			// Re-enable foreign key constraints
			const enableCommand = this.generateForeignKeyEnableCommand(dbType);
			this.logger.debug(`Executing: ${enableCommand}`);
			await this.dataSource.query(enableCommand);

			this.logger.info('Foreign key constraints re-enabled');
		}
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
}
