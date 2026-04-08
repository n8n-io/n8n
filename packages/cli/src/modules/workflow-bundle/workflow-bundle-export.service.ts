import type { BundleDataTableSchema, BundleWorkflow, WorkflowBundle } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { IWorkflowDb, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { DataTableColumnRepository } from '../data-table/data-table-column.repository';
import { DataTableRepository } from '../data-table/data-table.repository';
import {
	getCalledWorkflowIdFromNode,
	getDataTableIdFromNode,
} from '../workflow-index/workflow-dependency-utils';

const MAX_DEPTH = 20;
const MAX_WORKFLOWS = 100;

@Service()
export class WorkflowBundleExportService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly dataTableRepository: DataTableRepository,
		private readonly dataTableColumnRepository: DataTableColumnRepository,
		private readonly logger: Logger,
	) {}

	async exportBundle(workflowId: string, user: User, instanceId: string): Promise<WorkflowBundle> {
		const mainWorkflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!mainWorkflow) {
			throw new NotFoundError(`Workflow ${workflowId} not found`);
		}

		const subWorkflows: Record<string, BundleWorkflow> = {};
		const dataTableIds = new Set<string>();
		const warnings: string[] = [];

		// Collect data table IDs from the main workflow
		this.collectDataTableIds(mainWorkflow.nodes, dataTableIds);

		// BFS to collect all sub-workflows
		const visited = new Set<string>([workflowId]);
		const queue: string[] = this.getSubWorkflowIds(mainWorkflow.nodes);

		let depth = 0;
		let totalCollected = 0;

		while (queue.length > 0 && depth < MAX_DEPTH && totalCollected < MAX_WORKFLOWS) {
			const nextQueue: string[] = [];

			for (const subId of queue) {
				if (visited.has(subId) || totalCollected >= MAX_WORKFLOWS) continue;
				visited.add(subId);

				const subWorkflow = await this.fetchWorkflowSafe(subId, user);
				if (!subWorkflow) {
					warnings.push(`Sub-workflow ${subId} is inaccessible or does not exist`);
					continue;
				}

				subWorkflows[subId] = this.toBundleWorkflow(subWorkflow);
				totalCollected++;

				this.collectDataTableIds(subWorkflow.nodes, dataTableIds);

				for (const childId of this.getSubWorkflowIds(subWorkflow.nodes)) {
					if (!visited.has(childId)) {
						nextQueue.push(childId);
					}
				}
			}

			queue.length = 0;
			queue.push(...nextQueue);
			depth++;
		}

		if (depth >= MAX_DEPTH) {
			warnings.push(`Stopped traversing sub-workflows at depth ${MAX_DEPTH}`);
		}
		if (totalCollected >= MAX_WORKFLOWS) {
			warnings.push(`Stopped collecting after ${MAX_WORKFLOWS} sub-workflows`);
		}

		// Fetch data table schemas
		const dataTableSchemas = await this.fetchDataTableSchemas(dataTableIds, warnings);

		const bundle: WorkflowBundle = {
			bundleVersion: 1,
			mainWorkflow: this.toBundleWorkflow(mainWorkflow),
			subWorkflows,
			dataTableSchemas,
			meta: {
				exportedAt: new Date().toISOString(),
				instanceId,
			},
		};

		return bundle;
	}

	private toBundleWorkflow(workflow: IWorkflowDb): BundleWorkflow {
		return {
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
			settings: workflow.settings,
			pinData: workflow.pinData ?? undefined,
			meta: workflow.meta ?? undefined,
		};
	}

	private getSubWorkflowIds(nodes: INode[]): string[] {
		const ids: string[] = [];
		for (const node of nodes) {
			const id = getCalledWorkflowIdFromNode(node);
			if (id) ids.push(id);
		}
		return ids;
	}

	private collectDataTableIds(nodes: INode[], ids: Set<string>): void {
		for (const node of nodes) {
			const id = getDataTableIdFromNode(node);
			if (id) ids.add(id);
		}
	}

	private async fetchWorkflowSafe(
		workflowId: string,
		user: User,
	): Promise<IWorkflowDb | undefined> {
		try {
			const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
				'workflow:read',
			]);
			return workflow ?? undefined;
		} catch {
			this.logger.debug(`Could not fetch sub-workflow ${workflowId} for bundle export`);
			return undefined;
		}
	}

	private async fetchDataTableSchemas(
		dataTableIds: Set<string>,
		warnings: string[],
	): Promise<BundleDataTableSchema[]> {
		const schemas: BundleDataTableSchema[] = [];

		for (const dtId of dataTableIds) {
			try {
				const dataTable = await this.dataTableRepository.findOne({ where: { id: dtId } });
				if (!dataTable) {
					warnings.push(`Data table ${dtId} not found`);
					continue;
				}

				const columns = await this.dataTableColumnRepository.getColumns(dtId);
				schemas.push({
					originalId: dtId,
					name: dataTable.name,
					columns: columns.map((col) => ({
						name: col.name,
						type: col.type,
						index: col.index,
					})),
				});
			} catch {
				warnings.push(`Could not fetch data table ${dtId}`);
			}
		}

		return schemas;
	}
}
