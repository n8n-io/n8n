import { Logger } from '@n8n/backend-common';
import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { DataTableColumnType } from 'n8n-workflow';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

import { DataTableService } from './data-table.service';
import { DataTableColumnRepository } from './data-table-column.repository';
import { DataTableRepository } from './data-table.repository';
import { compressFolder } from '../../utils/compression.util';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

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

export interface DataTableExport {
	tableName: string;
	structure: DataTableStructure;
	csvContent: string;
}

@Service()
export class DataTableExportService {
	constructor(
		private readonly logger: Logger,
		private readonly dataTableService: DataTableService,
		private readonly dataTableColumnRepository: DataTableColumnRepository,
		private readonly dataTableRepository: DataTableRepository,
	) {
		console.log('=== DataTableExportService instantiated ===');
	}

	/**
	 * Extract all data table IDs from workflow nodes
	 * Handles all resourceLocator modes: 'list', 'id', 'name'
	 */
	async extractDataTableIds(workflow: WorkflowEntity, projectId: string): Promise<string[]> {
		const dataTableIds = new Set<string>();

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
			};

			if (!value) {
				continue;
			}

			let resolvedId: string;

			if (mode === 'name') {
				// Look up table by name
				try {
					const { data: tables } = await this.dataTableRepository.getManyAndCount({
						filter: { name: value, projectId },
						take: 1,
					});
					if (tables.length === 0) {
						this.logger.warn('Data table not found by name during export', {
							name: value,
							projectId,
						});
						continue;
					}
					resolvedId = tables[0].id;
				} catch (error) {
					this.logger.error('Error resolving data table by name', { name: value, error });
					continue;
				}
			} else {
				// For 'list' and 'id' modes, use the value directly as ID
				resolvedId = value;
			}

			dataTableIds.add(resolvedId);
		}

		return Array.from(dataTableIds);
	}

	/**
	 * Export a single data table with its structure and data
	 */
	async exportDataTable(dataTableId: string, projectId: string): Promise<DataTableExport> {
		// Validate table exists and get metadata
		const dataTable = await this.dataTableRepository.findOneBy({
			id: dataTableId,
			project: {
				id: projectId,
			},
		});

		if (!dataTable) {
			throw new NotFoundError(`Data table with ID "${dataTableId}" not found`);
		}

		// Get columns
		const columns = await this.dataTableColumnRepository.getColumns(dataTableId);

		// Build structure object
		const structure: DataTableStructure = {
			id: dataTable.id,
			name: dataTable.name,
			columns: columns.map((col) => ({
				name: col.name,
				type: col.type,
				index: col.index,
			})),
			createdAt: dataTable.createdAt.toISOString(),
			updatedAt: dataTable.updatedAt.toISOString(),
		};

		// Generate CSV content
		const { csvContent } = await this.dataTableService.generateDataTableCsv(dataTableId, projectId);

		return {
			tableName: dataTable.name,
			structure,
			csvContent,
		};
	}

	/**
	 * Export multiple data tables
	 */
	async exportDataTables(
		dataTableIds: string[],
		projectId: string,
	): Promise<Map<string, DataTableExport>> {
		const exports = new Map<string, DataTableExport>();

		for (const dataTableId of dataTableIds) {
			try {
				const dataTableExport = await this.exportDataTable(dataTableId, projectId);
				exports.set(dataTableId, dataTableExport);
			} catch (error) {
				if (error instanceof NotFoundError) {
					this.logger.warn('Data table not found during export, skipping', {
						dataTableId,
						projectId,
					});
					continue;
				}
				throw error;
			}
		}

		return exports;
	}

	/**
	 * Create a ZIP file containing workflow JSON and data table exports
	 */
	async createWorkflowZipExport(
		workflow: WorkflowEntity,
		dataTableExports: Map<string, DataTableExport>,
		outputPath: string,
	): Promise<void> {
		// Create temporary directory for files
		const tempDir = path.join(tmpdir(), `n8n-workflow-export-${randomBytes(8).toString('hex')}`);
		await mkdir(tempDir, { recursive: true });

		try {
			// Write workflow.json
			const workflowJson = JSON.stringify(workflow, null, 2);
			await writeFile(path.join(tempDir, 'workflow.json'), workflowJson, 'utf-8');

			// Write data tables
			for (const [, dataTableExport] of dataTableExports) {
				const { tableName, structure, csvContent } = dataTableExport;

				// Sanitize table name for filesystem
				const sanitizedName = tableName.replace(/[^a-z0-9_-]/gi, '_');
				const tableDir = path.join(tempDir, 'data-tables', sanitizedName);
				await mkdir(tableDir, { recursive: true });

				// Write structure.json
				const structureJson = JSON.stringify(structure, null, 2);
				await writeFile(path.join(tableDir, 'structure.json'), structureJson, 'utf-8');

				// Write data.csv
				await writeFile(path.join(tableDir, 'data.csv'), csvContent, 'utf-8');
			}

			// Compress folder to ZIP
			await compressFolder(tempDir, outputPath);

			this.logger.info('Workflow ZIP export created successfully', {
				workflowId: workflow.id,
				dataTableCount: dataTableExports.size,
				outputPath,
			});
		} finally {
			// Clean up temp directory
			try {
				const fs = await import('fs/promises');
				await fs.rm(tempDir, { recursive: true, force: true });
			} catch (error) {
				this.logger.error('Failed to clean up temp directory', { tempDir, error });
			}
		}
	}
}
