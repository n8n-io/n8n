import { Logger } from '@n8n/backend-common';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

import { WorkflowFinderService } from './workflow-finder.service';
import { compressFolder } from '../utils/compression.util';
import type { DataTableExport } from '@/modules/data-table/data-table-export.service';

export interface SubworkflowReference {
	workflowId: string;
	calledBy: string;
	nodeId: string;
	depth: number;
}

export interface WorkflowExportGraph {
	workflows: Map<string, WorkflowEntity>;
	references: SubworkflowReference[];
	errors: Array<{ workflowId: string; error: string }>;
}

export interface WorkflowManifestEntry {
	id: string;
	name: string;
	isMain: boolean;
	fileName: string;
	calledBy?: string[];
}

export interface BundleManifest {
	version: string;
	exportDate: string;
	mainWorkflowId: string;
	workflows: WorkflowManifestEntry[];
	dataTables: Array<{ id: string; name: string }>;
}

@Service()
export class WorkflowExportService {
	private readonly maxDepth = 10;

	constructor(
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	/**
	 * Recursively collect all subworkflow dependencies using BFS
	 */
	async collectSubworkflowDependencies(
		rootWorkflowId: string,
		user: User,
	): Promise<WorkflowExportGraph> {
		const visited = new Set<string>();
		const queue: Array<{ workflowId: string; depth: number; calledBy: string | null }> = [
			{ workflowId: rootWorkflowId, depth: 0, calledBy: null },
		];

		const graph: WorkflowExportGraph = {
			workflows: new Map(),
			references: [],
			errors: [],
		};

		while (queue.length > 0) {
			const { workflowId, depth, calledBy } = queue.shift()!;

			// Check depth limit
			if (depth > this.maxDepth) {
				graph.errors.push({
					workflowId,
					error: `Max depth ${this.maxDepth} exceeded`,
				});
				this.logger.warn('Max workflow dependency depth exceeded', {
					workflowId,
					maxDepth: this.maxDepth,
				});
				continue;
			}

			// Check if already visited
			const alreadyVisited = visited.has(workflowId);
			if (alreadyVisited && calledBy) {
				// Still record the reference even if workflow is already processed
				// This handles circular dependencies and self-references
				graph.references.push({
					workflowId,
					calledBy,
					nodeId: '', // We don't need nodeId for already-visited workflows
					depth,
				});
				continue;
			}

			if (alreadyVisited) {
				continue;
			}

			visited.add(workflowId);

			// Fetch workflow with permissions check
			try {
				const workflow = await this.workflowFinderService.findWorkflowForUser(
					workflowId,
					user,
					['workflow:read'],
					{},
				);

				if (!workflow) {
					graph.errors.push({
						workflowId,
						error: 'Workflow not found or no read permission',
					});
					this.logger.warn('Workflow not found or no read permission during export', {
						workflowId,
					});
					continue;
				}

				graph.workflows.set(workflowId, workflow);

				// Find subworkflow dependencies
				const subworkflowIds = this.extractSubworkflowIds(workflow);

				for (const { workflowId: subId, nodeId } of subworkflowIds) {
					// Add to queue even if already visited (to track all references)
					queue.push({
						workflowId: subId,
						depth: depth + 1,
						calledBy: workflowId,
					});

					// Record reference
					graph.references.push({
						workflowId: subId,
						calledBy: workflowId,
						nodeId,
						depth: depth + 1,
					});
				}
			} catch (error) {
				graph.errors.push({
					workflowId,
					error: error instanceof Error ? error.message : String(error),
				});
				this.logger.error('Error collecting subworkflow dependency', {
					workflowId,
					error,
				});
			}
		}

		this.logger.info('Subworkflow dependency collection complete', {
			rootWorkflowId,
			workflowCount: graph.workflows.size,
			errorCount: graph.errors.length,
		});

		return graph;
	}

	/**
	 * Extract subworkflow IDs from Execute Workflow nodes
	 * Reuses logic from WorkflowIndexService.getCalledWorkflowIdFrom()
	 */
	private extractSubworkflowIds(
		workflow: WorkflowEntity,
	): Array<{ workflowId: string; nodeId: string }> {
		const results: Array<{ workflowId: string; nodeId: string }> = [];

		for (const node of workflow.nodes) {
			if (node.type !== 'n8n-nodes-base.executeWorkflow') {
				continue;
			}

			// Skip non-database sources
			if (
				node.parameters?.['source'] === 'parameter' ||
				node.parameters?.['source'] === 'localFile' ||
				node.parameters?.['source'] === 'url'
			) {
				continue;
			}

			const workflowId = this.getCalledWorkflowIdFrom(node);
			if (workflowId) {
				results.push({ workflowId, nodeId: node.id });
			}
		}

		return results;
	}

	/**
	 * Extract workflow ID from Execute Workflow node parameters
	 * Handles both v1.0 (string) and v1.1+ (object) formats
	 */
	private getCalledWorkflowIdFrom(node: INode): string | undefined {
		// Direct string (v1.0)
		if (typeof node.parameters?.['workflowId'] === 'string') {
			return node.parameters['workflowId'];
		}

		// Resource locator object (v1.1+)
		if (
			node.parameters &&
			typeof node.parameters['workflowId'] === 'object' &&
			node.parameters['workflowId'] !== null &&
			'value' in node.parameters['workflowId'] &&
			typeof (node.parameters['workflowId'] as { value: unknown }).value === 'string'
		) {
			return (node.parameters['workflowId'] as { value: string }).value;
		}

		this.logger.warn('Could not determine called workflow ID from executeWorkflow node', {
			nodeId: node.id,
			parameters: node.parameters,
		});

		return undefined;
	}

	/**
	 * Create a ZIP bundle containing multiple workflows and data tables
	 */
	async createWorkflowBundleZip(
		mainWorkflow: WorkflowEntity,
		workflowGraph: WorkflowExportGraph | null,
		dataTableExports: Map<string, DataTableExport>,
		outputPath: string,
	): Promise<void> {
		const tempDir = path.join(tmpdir(), `n8n-bundle-${randomBytes(8).toString('hex')}`);
		await mkdir(tempDir, { recursive: true });

		try {
			// Create workflows directory
			const workflowsDir = path.join(tempDir, 'workflows');
			await mkdir(workflowsDir, { recursive: true });

			// Create mapping from real IDs to temporary IDs for security
			// This prevents exposing real workflow IDs in public templates
			const workflowRealToTempIdMap = new Map<string, string>();
			workflowRealToTempIdMap.set(mainWorkflow.id, 'workflow_0');

			// Map all subworkflow IDs
			if (workflowGraph) {
				let tempIdCounter = 1;
				for (const [workflowId] of workflowGraph.workflows) {
					if (workflowId === mainWorkflow.id) continue; // Skip main (already mapped)
					workflowRealToTempIdMap.set(workflowId, `workflow_${tempIdCounter}`);
					tempIdCounter++;
				}
			}

			// Create mapping for data table IDs (security - same reason as workflows)
			const dataTableRealToTempIdMap = new Map<string, string>();
			let dataTableTempCounter = 0;
			for (const [realTableId] of dataTableExports) {
				dataTableRealToTempIdMap.set(realTableId, `datatable_${dataTableTempCounter}`);
				dataTableTempCounter++;
			}

			// Build manifest with temporary IDs
			const manifest: BundleManifest = {
				version: '1.0',
				exportDate: new Date().toISOString(),
				mainWorkflowId: 'workflow_0', // Use temp ID
				workflows: [],
				dataTables: [],
			};

			// Replace real IDs with temp IDs in workflows
			const replaceIds = (workflow: WorkflowEntity, workflowTempId: string): WorkflowEntity => {
				const workflowCopy = JSON.parse(JSON.stringify(workflow)) as WorkflowEntity;

				// Replace the workflow's own ID with the temp ID
				(workflowCopy as { id: string }).id = workflowTempId;

				// Update node references
				for (const node of workflowCopy.nodes) {
					// Update Execute Workflow node references
					if (node.type === 'n8n-nodes-base.executeWorkflow') {
						// Skip non-database sources
						if (
							node.parameters?.['source'] === 'parameter' ||
							node.parameters?.['source'] === 'localFile' ||
							node.parameters?.['source'] === 'url'
						) {
							continue;
						}

						// Get the workflow ID
						let realId: string | undefined;
						if (typeof node.parameters?.['workflowId'] === 'string') {
							realId = node.parameters['workflowId'];
						} else if (
							node.parameters &&
							typeof node.parameters['workflowId'] === 'object' &&
							node.parameters['workflowId'] !== null &&
							'value' in node.parameters['workflowId']
						) {
							realId = (node.parameters['workflowId'] as { value: string }).value;
						}

						// Replace with temp ID if we have a mapping
						if (realId && workflowRealToTempIdMap.has(realId)) {
							const tempId = workflowRealToTempIdMap.get(realId)!;
							if (typeof node.parameters?.['workflowId'] === 'string') {
								node.parameters['workflowId'] = tempId;
							} else if (
								node.parameters &&
								typeof node.parameters['workflowId'] === 'object' &&
								node.parameters['workflowId'] !== null
							) {
								(node.parameters['workflowId'] as { value: string }).value = tempId;
							}
						}
					}

					// Update Data Table node references
					if (node.type === 'n8n-nodes-base.dataTable') {
						const dataTableId = node.parameters?.dataTableId;
						if (dataTableId && typeof dataTableId === 'object' && 'value' in dataTableId) {
							const realTableId = (dataTableId as { value: string }).value;
							if (realTableId && dataTableRealToTempIdMap.has(realTableId)) {
								(dataTableId as { value: string }).value =
									dataTableRealToTempIdMap.get(realTableId)!;
							}
						}
					}
				}

				return workflowCopy;
			};

			// Write main workflow with temp IDs
			const mainWorkflowCopy = replaceIds(mainWorkflow, 'workflow_0');
			const mainFileName = 'workflow_0.json';
			await writeFile(
				path.join(workflowsDir, mainFileName),
				JSON.stringify(mainWorkflowCopy, null, 2),
				'utf-8',
			);

			manifest.workflows.push({
				id: 'workflow_0',
				name: mainWorkflow.name,
				isMain: true,
				fileName: mainFileName,
			});

			// Write subworkflows with temp IDs
			if (workflowGraph) {
				for (const [workflowId, workflow] of workflowGraph.workflows) {
					if (workflowId === mainWorkflow.id) continue; // Skip main

					const tempId = workflowRealToTempIdMap.get(workflowId)!;
					const workflowCopy = replaceIds(workflow, tempId);
					const fileName = `${tempId}.json`;

					await writeFile(
						path.join(workflowsDir, fileName),
						JSON.stringify(workflowCopy, null, 2),
						'utf-8',
					);

					// Collect all workflows that call this subworkflow (using temp IDs)
					const calledBy = workflowGraph.references
						.filter((ref) => ref.workflowId === workflowId)
						.map((ref) => workflowRealToTempIdMap.get(ref.calledBy)!)
						.filter((id) => id !== undefined);

					manifest.workflows.push({
						id: tempId,
						name: workflow.name,
						isMain: false,
						fileName,
						calledBy: [...new Set(calledBy)],
					});
				}
			}

			// Write data tables with temp IDs
			if (dataTableExports.size > 0) {
				for (const [realTableId, dataTableExport] of dataTableExports) {
					const { tableName, structure, csvContent } = dataTableExport;
					const tempTableId = dataTableRealToTempIdMap.get(realTableId)!;

					// Sanitize table name for filesystem
					const sanitizedName = tableName.replace(/[^a-z0-9_-]/gi, '_');
					const tableDir = path.join(tempDir, 'data-tables', sanitizedName);
					await mkdir(tableDir, { recursive: true });

					// Replace real ID with temp ID in structure
					const structureWithTempId = { ...structure, id: tempTableId };

					// Write structure.json with temp ID
					await writeFile(
						path.join(tableDir, 'structure.json'),
						JSON.stringify(structureWithTempId, null, 2),
						'utf-8',
					);

					// Write data.csv
					await writeFile(path.join(tableDir, 'data.csv'), csvContent, 'utf-8');

					// Add to manifest with temp ID
					manifest.dataTables.push({
						id: tempTableId,
						name: tableName,
					});
				}
			}

			// Write manifest
			await writeFile(
				path.join(tempDir, 'manifest.json'),
				JSON.stringify(manifest, null, 2),
				'utf-8',
			);

			// Compress to ZIP
			await compressFolder(tempDir, outputPath);

			this.logger.info('Workflow bundle created with temporary IDs', {
				mainWorkflowName: mainWorkflow.name,
				subworkflowCount: workflowGraph ? workflowGraph.workflows.size - 1 : 0,
				dataTableCount: dataTableExports.size,
				outputPath,
			});
		} finally {
			// Cleanup temp directory
			try {
				const fs = await import('fs/promises');
				await fs.rm(tempDir, { recursive: true, force: true });
			} catch (error) {
				this.logger.error('Failed to clean up temp directory', { tempDir, error });
			}
		}
	}
}
