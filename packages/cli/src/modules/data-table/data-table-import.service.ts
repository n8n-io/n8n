import { Logger } from '@n8n/backend-common';
import {
	WorkflowEntity,
	WorkflowRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { DataTableColumnType, INode } from 'n8n-workflow';
import { readFile, readdir, rm } from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

import { DataTableService } from './data-table.service';
import { DataTableRepository } from './data-table.repository';
import { CsvParserService } from './csv-parser.service';
import { decompressFolder } from '../../utils/compression.util';
import type { BundleManifest } from '@/workflows/workflow-export.service';

export interface DataTableStructure {
	id: string;
	name: string;
	columns: Array<{
		name: string;
		type: DataTableColumnType;
		index: number;
	}>;
	createdAt: string;
	updatedAt: string;
}

export interface DataTableImportData {
	structure: DataTableStructure;
	csvPath: string;
}

@Service()
export class DataTableImportService {
	constructor(
		private readonly logger: Logger,
		private readonly dataTableService: DataTableService,
		private readonly dataTableRepository: DataTableRepository,
		private readonly csvParserService: CsvParserService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	/**
	 * Detect if a file is ZIP or JSON by checking magic number
	 */
	async detectFileType(filePath: string): Promise<'zip' | 'json'> {
		const buffer = await readFile(filePath);

		// Check for ZIP magic number: 0x504B0304 (PK..)
		if (
			buffer.length >= 4 &&
			buffer[0] === 0x50 &&
			buffer[1] === 0x4b &&
			buffer[2] === 0x03 &&
			buffer[3] === 0x04
		) {
			return 'zip';
		}

		return 'json';
	}

	/**
	 * Extract ZIP file and return workflow and data tables
	 */
	async extractWorkflowZip(zipPath: string): Promise<{
		workflow: WorkflowEntity;
		dataTables: Map<string, DataTableImportData>;
	}> {
		// Create temp directory for extraction
		// Use path.join instead of path.resolve to avoid calling process.cwd()
		const tempDir = path.join(tmpdir(), `n8n-workflow-import-${randomBytes(8).toString('hex')}`);

		this.logger.debug('Extracting workflow ZIP', { zipPath, tempDir });

		try {
			// Extract ZIP
			await decompressFolder(zipPath, tempDir);

			// Read workflow.json
			const workflowPath = path.join(tempDir, 'workflow.json');
			const workflowContent = await readFile(workflowPath, 'utf-8');
			const workflow = JSON.parse(workflowContent) as WorkflowEntity;

			// Find all data table directories
			const dataTables = new Map<string, DataTableImportData>();
			const dataTablesDir = path.join(tempDir, 'data-tables');

			try {
				const tableNames = await readdir(dataTablesDir);

				for (const tableName of tableNames) {
					const tableDir = path.join(dataTablesDir, tableName);

					// Read structure.json
					const structurePath = path.join(tableDir, 'structure.json');
					const structureContent = await readFile(structurePath, 'utf-8');
					const structure = JSON.parse(structureContent) as DataTableStructure;

					// Get CSV path
					const csvPath = path.join(tableDir, 'data.csv');

					dataTables.set(structure.id, {
						structure,
						csvPath,
					});
				}
			} catch (error) {
				// data-tables directory might not exist if no data tables in workflow
				this.logger.debug('No data tables found in ZIP', { error });
			}

			return { workflow, dataTables };
		} catch (error) {
			this.logger.error('Failed to extract workflow ZIP', { error });
			throw error;
		}
	}

	/**
	 * Generate a unique data table name if the name already exists
	 */
	async generateUniqueTableName(baseName: string, projectId: string): Promise<string> {
		// Check if base name is available
		const { data: existingTables } = await this.dataTableRepository.getManyAndCount({
			filter: { name: baseName, projectId },
			take: 1,
		});

		if (existingTables.length === 0) {
			return baseName;
		}

		// Name exists, try with numbers
		let counter = 1;
		let uniqueName = `${baseName} (${counter})`;

		while (true) {
			const { data: tables } = await this.dataTableRepository.getManyAndCount({
				filter: { name: uniqueName, projectId },
				take: 1,
			});

			if (tables.length === 0) {
				return uniqueName;
			}

			counter++;
			uniqueName = `${baseName} (${counter})`;

			// Safety check to prevent infinite loop
			if (counter > 1000) {
				throw new Error(`Could not generate unique name for data table "${baseName}"`);
			}
		}
	}

	/**
	 * Import a single data table from structure and CSV file
	 */
	async importDataTable(
		tableData: DataTableImportData,
		projectId: string,
	): Promise<{ oldId: string; newId: string; name: string }> {
		const { structure, csvPath } = tableData;

		// Generate unique name
		const uniqueName = await this.generateUniqueTableName(structure.name, projectId);

		// Create data table with columns
		const createdTable = await this.dataTableRepository.createDataTable(
			projectId,
			uniqueName,
			structure.columns.map((col) => ({
				name: col.name,
				type: col.type,
				index: col.index,
			})),
		);

		this.logger.info('Created data table during import', {
			oldId: structure.id,
			newId: createdTable.id,
			name: uniqueName,
		});

		// Import CSV data
		try {
			// Parse CSV file
			const rows = await this.csvParserService.parseFileData(csvPath, true);

			if (rows.length > 0) {
				// Remove system columns (id, createdAt, updatedAt) from CSV data if present
				const cleanedRows = rows.map((row) => {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id, createdAt, updatedAt, ...rest } = row as Record<string, unknown>;
					return rest as Record<string, string | number | boolean | Date | null>;
				});

				// Insert rows into data table
				await this.dataTableService.insertRows(createdTable.id, projectId, cleanedRows, 'count');

				this.logger.info('Imported CSV data for data table', {
					dataTableId: createdTable.id,
					name: uniqueName,
					rowCount: rows.length,
				});
			}
		} catch (error) {
			this.logger.error('Failed to import CSV data for data table', {
				dataTableId: createdTable.id,
				name: uniqueName,
				error,
			});
			// Continue without data - table structure is created
		}

		return {
			oldId: structure.id,
			newId: createdTable.id,
			name: uniqueName,
		};
	}

	/**
	 * Update workflow node parameters to reference new data table IDs
	 */
	updateWorkflowDataTableReferences(
		workflow: WorkflowEntity,
		idMapping: Map<string, { newId: string; name: string }>,
	): void {
		for (const node of workflow.nodes) {
			// Check if this is a data table node
			if (node.type !== 'n8n-nodes-base.dataTable') {
				continue;
			}

			const dataTableId = node.parameters?.dataTableId;
			if (!dataTableId || typeof dataTableId !== 'object') {
				continue;
			}

			const { mode, value } = dataTableId as {
				mode: 'list' | 'id' | 'name';
				value: string;
				cachedResultName?: string;
			};

			// Find mapping for old ID
			const mapping = idMapping.get(value);
			if (!mapping) {
				continue;
			}

			// Update the value based on mode
			const dataTableIdParam = dataTableId as unknown as Record<string, unknown>;
			if (mode === 'id' || mode === 'list') {
				// Update to new ID
				dataTableIdParam.value = mapping.newId;
			} else if (mode === 'name') {
				// Update to new name
				dataTableIdParam.value = mapping.name;
			}

			// Update cachedResultName if present
			if ('cachedResultName' in dataTableIdParam) {
				dataTableIdParam.cachedResultName = mapping.name;
			}

			this.logger.debug('Updated data table reference in workflow node', {
				nodeId: node.id,
				nodeName: node.name,
				oldId: value,
				newId: mapping.newId,
				newName: mapping.name,
			});
		}
	}

	/**
	 * Extract workflow bundle (manifest + multiple workflows + data tables)
	 */
	async extractWorkflowBundle(zipPath: string): Promise<{
		manifest: BundleManifest;
		workflows: Map<string, WorkflowEntity>;
		dataTables: Map<string, DataTableImportData>;
		tempDir: string;
	}> {
		// Create temp directory for extraction
		const tempDir = path.join(tmpdir(), `n8n-bundle-import-${randomBytes(8).toString('hex')}`);

		this.logger.debug('Extracting workflow bundle', { zipPath, tempDir });

		// Extract ZIP
		await decompressFolder(zipPath, tempDir);

		// Read manifest.json
		const manifestPath = path.join(tempDir, 'manifest.json');
		const manifestContent = await readFile(manifestPath, 'utf-8');
		const manifest = JSON.parse(manifestContent) as BundleManifest;

		// Read all workflows
		const workflows = new Map<string, WorkflowEntity>();
		const workflowsDir = path.join(tempDir, 'workflows');

		for (const workflowMeta of manifest.workflows) {
			const workflowPath = path.join(workflowsDir, workflowMeta.fileName);
			const content = await readFile(workflowPath, 'utf-8');
			const workflow = JSON.parse(content) as WorkflowEntity;

			this.logger.debug('Read workflow from bundle', {
				tempId: workflowMeta.id,
				workflowIdInFile: workflow.id,
				fileName: workflowMeta.fileName,
				name: workflow.name,
			});

			// Use the temp ID from manifest as the key (not the ID in the file)
			workflows.set(workflowMeta.id, workflow);
		}

		// Read data tables
		const dataTables = new Map<string, DataTableImportData>();
		const dataTablesDir = path.join(tempDir, 'data-tables');

		try {
			const tableNames = await readdir(dataTablesDir);

			for (const tableName of tableNames) {
				const tableDir = path.join(dataTablesDir, tableName);

				// Read structure.json
				const structurePath = path.join(tableDir, 'structure.json');
				const structureContent = await readFile(structurePath, 'utf-8');
				const structure = JSON.parse(structureContent) as DataTableStructure;

				// Get CSV path
				const csvPath = path.join(tableDir, 'data.csv');

				dataTables.set(structure.id, {
					structure,
					csvPath,
				});
			}
		} catch (error) {
			// data-tables directory might not exist if no data tables in bundle
			this.logger.debug('No data tables found in bundle', { error });
		}

		return { manifest, workflows, dataTables, tempDir };
	}

	/**
	 * Import workflow bundle with multiple workflows and data tables
	 */
	async importWorkflowBundle(
		bundleData: {
			manifest: BundleManifest;
			workflows: Map<string, WorkflowEntity>;
			dataTables: Map<string, DataTableImportData>;
			tempDir: string;
		},
		projectId: string,
	): Promise<{
		mainWorkflowId: string;
		workflowsImported: number;
		dataTablesImported: number;
		workflowIdMapping: Map<string, string>;
	}> {
		const { manifest, workflows, dataTables, tempDir } = bundleData;
		const workflowIdMapping = new Map<string, string>(); // old ID -> new ID
		const dataTableIdMapping = new Map<string, { newId: string; name: string }>();
		const importedWorkflows: WorkflowEntity[] = [];

		try {
			// Import data tables first
			for (const [oldId, tableData] of dataTables) {
				const result = await this.importDataTable(tableData, projectId);
				dataTableIdMapping.set(oldId, { newId: result.newId, name: result.name });
			}

			this.logger.info('Imported data tables from bundle', {
				count: dataTableIdMapping.size,
			});

			// Order workflows for import (dependencies first)
			const orderedWorkflows = this.orderWorkflowsForImport(manifest, workflows);

			// FIRST PASS: Save all workflows and build ID mapping
			for (const workflow of orderedWorkflows) {
				const tempId = workflow.id; // This is a temporary ID from the manifest

				try {
					this.logger.debug('Importing workflow from bundle (pass 1)', {
						tempId,
						name: workflow.name,
					});

					// Update data table references (these don't depend on other workflows)
					this.updateWorkflowDataTableReferences(workflow, dataTableIdMapping);

					// Create a new workflow entity (don't reuse the old one)
					const newWorkflowEntity = new WorkflowEntity();

					// Copy all properties except id, createdAt, updatedAt, shared, statistics, tagMappings
					newWorkflowEntity.name = workflow.name;
					newWorkflowEntity.active = workflow.active;
					newWorkflowEntity.nodes = workflow.nodes;
					newWorkflowEntity.connections = workflow.connections;
					newWorkflowEntity.settings = workflow.settings;
					newWorkflowEntity.staticData = workflow.staticData;
					newWorkflowEntity.meta = workflow.meta;
					newWorkflowEntity.pinData = workflow.pinData;
					newWorkflowEntity.versionId = workflow.versionId;
					newWorkflowEntity.tags = workflow.tags;

					// Copy optional fields
					if (workflow.description) {
						newWorkflowEntity.description = workflow.description;
					}

					this.logger.debug('Saving workflow to database', { name: newWorkflowEntity.name });

					// Save workflow
					const savedWorkflow = await this.workflowRepository.save(newWorkflowEntity);

					this.logger.debug('Creating SharedWorkflow', {
						workflowId: savedWorkflow.id,
						projectId,
					});

					// Create SharedWorkflow to associate with project
					const newSharedWorkflow = this.sharedWorkflowRepository.create({
						role: 'workflow:owner',
						projectId,
						workflow: savedWorkflow,
					});
					await this.sharedWorkflowRepository.save(newSharedWorkflow);

					workflowIdMapping.set(tempId, savedWorkflow.id);
					importedWorkflows.push(savedWorkflow);

					this.logger.info('Imported workflow from bundle (pass 1)', {
						tempId,
						newId: savedWorkflow.id,
						name: savedWorkflow.name,
					});
				} catch (workflowError) {
					this.logger.error('Failed to import workflow from bundle (pass 1)', {
						tempId,
						name: workflow.name,
						error: workflowError instanceof Error ? workflowError.message : String(workflowError),
						stack: workflowError instanceof Error ? workflowError.stack : undefined,
					});
					throw workflowError;
				}
			}

			// SECOND PASS: Update Execute Workflow node references and re-save
			// We need to re-fetch from DB to ensure TypeORM tracks changes properly
			for (const savedWorkflow of importedWorkflows) {
				try {
					// Find the original temp ID for this workflow
					let tempId: string | undefined;
					for (const [oldId, newId] of workflowIdMapping) {
						if (newId === savedWorkflow.id) {
							tempId = oldId;
							break;
						}
					}

					// Re-fetch the workflow from database to ensure proper tracking
					const freshWorkflow = await this.workflowRepository.findOne({
						where: { id: savedWorkflow.id },
					});

					if (!freshWorkflow) {
						this.logger.error('Workflow not found in pass 2', {
							workflowId: savedWorkflow.id,
						});
						continue;
					}

					// Update Execute Workflow node references
					let hasExecuteWorkflowNodes = false;
					for (const node of freshWorkflow.nodes) {
						if (node.type === 'n8n-nodes-base.executeWorkflow') {
							hasExecuteWorkflowNodes = true;
							this.updateExecuteWorkflowNode(node, tempId || freshWorkflow.id, workflowIdMapping);
						}
					}

					// Only re-save if we updated something
					if (hasExecuteWorkflowNodes) {
						await this.workflowRepository.save(freshWorkflow);
						this.logger.debug('Updated Execute Workflow references in workflow', {
							workflowId: freshWorkflow.id,
							name: freshWorkflow.name,
						});
					}
				} catch (updateError) {
					this.logger.error('Failed to update workflow references (pass 2)', {
						workflowId: savedWorkflow.id,
						name: savedWorkflow.name,
						error: updateError instanceof Error ? updateError.message : String(updateError),
						stack: updateError instanceof Error ? updateError.stack : undefined,
					});
					// Don't throw - workflow is already imported, just references might be stale
				}
			}

			const mainWorkflowId = workflowIdMapping.get(manifest.mainWorkflowId);
			if (!mainWorkflowId) {
				throw new Error(
					`Main workflow ID ${manifest.mainWorkflowId} not found in imported workflows`,
				);
			}

			return {
				mainWorkflowId,
				workflowsImported: importedWorkflows.length,
				dataTablesImported: dataTableIdMapping.size,
				workflowIdMapping,
			};
		} finally {
			// Cleanup temp directory
			try {
				await rm(tempDir, { recursive: true, force: true });
			} catch (error) {
				this.logger.error('Failed to clean up temp directory', { tempDir, error });
			}
		}
	}

	/**
	 * Order workflows for import using topological sort (dependencies first)
	 */
	private orderWorkflowsForImport(
		manifest: BundleManifest,
		workflows: Map<string, WorkflowEntity>,
	): WorkflowEntity[] {
		const ordered: WorkflowEntity[] = [];
		const visited = new Set<string>();

		// Build dependency map (workflow -> what it depends on)
		const dependsOn = new Map<string, Set<string>>();

		for (const workflowMeta of manifest.workflows) {
			if (workflowMeta.calledBy && workflowMeta.calledBy.length > 0) {
				// This workflow is called by others, so those depend on it
				for (const callerId of workflowMeta.calledBy) {
					if (!dependsOn.has(callerId)) {
						dependsOn.set(callerId, new Set());
					}
					dependsOn.get(callerId)!.add(workflowMeta.id);
				}
			}
		}

		// DFS to visit dependencies first
		const visit = (workflowId: string) => {
			if (visited.has(workflowId)) return;
			visited.add(workflowId);

			const workflow = workflows.get(workflowId);
			if (!workflow) return;

			// Visit all dependencies first (workflows this one calls)
			const deps = dependsOn.get(workflowId);
			if (deps) {
				for (const depId of deps) {
					visit(depId);
				}
			}

			ordered.push(workflow);
		};

		// Start with main workflow (it may depend on others)
		visit(manifest.mainWorkflowId);

		// Visit any remaining workflows
		for (const [workflowId] of workflows) {
			visit(workflowId);
		}

		// Reverse so dependencies are imported first
		return ordered.reverse();
	}

	/**
	 * Update Execute Workflow node to use new workflow ID
	 */
	private updateExecuteWorkflowNode(
		node: INode,
		currentWorkflowOldId: string,
		workflowIdMapping: Map<string, string>,
	): void {
		// Skip non-database sources
		if (
			node.parameters?.['source'] === 'parameter' ||
			node.parameters?.['source'] === 'localFile' ||
			node.parameters?.['source'] === 'url'
		) {
			return;
		}

		// Get old workflow ID
		let oldWorkflowId: string | undefined;

		if (typeof node.parameters?.['workflowId'] === 'string') {
			oldWorkflowId = node.parameters['workflowId'];
		} else if (
			node.parameters &&
			typeof node.parameters['workflowId'] === 'object' &&
			node.parameters['workflowId'] !== null &&
			'value' in node.parameters['workflowId']
		) {
			oldWorkflowId = (node.parameters['workflowId'] as { value: string }).value;
		}

		if (!oldWorkflowId) return;

		// Find new workflow ID (handle self-references)
		const newWorkflowId = workflowIdMapping.get(oldWorkflowId);
		if (!newWorkflowId) {
			// Workflow not in bundle - might be external reference
			this.logger.warn('Referenced workflow not found in bundle', {
				nodeId: node.id,
				referencedWorkflowId: oldWorkflowId,
			});
			return;
		}

		// Update the reference
		if (typeof node.parameters?.['workflowId'] === 'string') {
			node.parameters['workflowId'] = newWorkflowId;
		} else if (
			node.parameters &&
			typeof node.parameters['workflowId'] === 'object' &&
			node.parameters['workflowId'] !== null
		) {
			(node.parameters['workflowId'] as { value: string }).value = newWorkflowId;
		}

		this.logger.debug('Updated Execute Workflow node reference', {
			nodeId: node.id,
			oldWorkflowId,
			newWorkflowId,
			isSelfReference: oldWorkflowId === currentWorkflowOldId,
		});
	}
}
