import { Logger } from '@n8n/backend-common';
import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { DataTableColumnType } from 'n8n-workflow';
import { readFile, readdir } from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

import { DataTableService } from './data-table.service';
import { DataTableRepository } from './data-table.repository';
import { CsvParserService } from './csv-parser.service';
import { decompressFolder } from '../../utils/compression.util';

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
}
