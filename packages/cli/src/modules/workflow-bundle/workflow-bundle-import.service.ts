import type {
	BundleDataTableSchema,
	BundleWorkflow,
	ImportBundleResult,
	WorkflowBundle,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { DATA_TABLE_NODE_TYPES, type INode } from 'n8n-workflow';

import { NamingService } from '@/services/naming.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';

import { DataTableRepository } from '../data-table/data-table.repository';
import { DataTableService } from '../data-table/data-table.service';

@Service()
export class WorkflowBundleImportService {
	constructor(
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly dataTableService: DataTableService,
		private readonly dataTableRepository: DataTableRepository,
		private readonly namingService: NamingService,
	) {}

	async importBundle(
		bundle: WorkflowBundle,
		projectId: string,
		user: User,
	): Promise<ImportBundleResult> {
		const warnings: string[] = [];
		const workflowIdMap: Record<string, string> = {};
		const dataTableIdMap: Record<string, string> = {};

		// Step 1: Create data tables
		for (const schema of bundle.dataTableSchemas) {
			try {
				const newDataTable = await this.createDataTable(schema, projectId);
				dataTableIdMap[schema.originalId] = newDataTable.id;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				warnings.push(`Failed to create data table "${schema.name}": ${message}`);
			}
		}

		// Step 2: Create sub-workflows (without remapped IDs yet)
		for (const [originalId, subWorkflow] of Object.entries(bundle.subWorkflows)) {
			try {
				const created = await this.createWorkflow(subWorkflow, projectId, user);
				workflowIdMap[originalId] = created.id;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				warnings.push(`Failed to create sub-workflow "${subWorkflow.name}": ${message}`);
			}
		}

		// Step 3: Create main workflow
		const mainOriginalId = bundle.mainWorkflow.id;
		const mainWorkflow = await this.createWorkflow(bundle.mainWorkflow, projectId, user);
		if (mainOriginalId) {
			workflowIdMap[mainOriginalId] = mainWorkflow.id;
		}

		// Step 4: Remap IDs in all created workflows
		const allCreatedWorkflowIds = Object.values(workflowIdMap);
		for (const newWorkflowId of allCreatedWorkflowIds) {
			try {
				await this.remapWorkflowReferences(newWorkflowId, workflowIdMap, dataTableIdMap);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				warnings.push(`Failed to remap references in workflow ${newWorkflowId}: ${message}`);
			}
		}

		return {
			mainWorkflowId: mainWorkflow.id,
			workflowIdMap,
			dataTableIdMap,
			warnings,
		};
	}

	private async createDataTable(schema: BundleDataTableSchema, projectId: string) {
		const uniqueName = await this.getUniqueDataTableName(schema.name, projectId);
		return await this.dataTableService.createDataTable(projectId, {
			name: uniqueName,
			columns: schema.columns.map((col) => ({
				name: col.name,
				type: col.type,
				index: col.index,
			})),
		});
	}

	private async createWorkflow(
		bundleWorkflow: BundleWorkflow,
		projectId: string,
		user: User,
	): Promise<WorkflowEntity> {
		const uniqueName = await this.namingService.getUniqueWorkflowName(bundleWorkflow.name);

		const workflowEntity = new WorkflowEntity();
		workflowEntity.name = uniqueName;
		workflowEntity.nodes = bundleWorkflow.nodes;
		workflowEntity.connections = bundleWorkflow.connections;
		workflowEntity.settings = bundleWorkflow.settings ?? {};
		workflowEntity.pinData = bundleWorkflow.pinData as WorkflowEntity['pinData'];
		workflowEntity.meta = bundleWorkflow.meta ?? {};

		return await this.workflowCreationService.createWorkflow(user, workflowEntity, { projectId });
	}

	private async remapWorkflowReferences(
		workflowId: string,
		workflowIdMap: Record<string, string>,
		dataTableIdMap: Record<string, string>,
	): Promise<void> {
		const workflow = await this.workflowRepository.findOneBy({ id: workflowId });
		if (!workflow) return;

		let changed = false;
		for (const node of workflow.nodes) {
			if (this.remapSubWorkflowId(node, workflowIdMap)) changed = true;
			if (this.remapDataTableId(node, dataTableIdMap)) changed = true;
		}

		if (changed) {
			await this.workflowRepository.update(workflowId, { nodes: workflow.nodes });
		}
	}

	private remapSubWorkflowId(node: INode, workflowIdMap: Record<string, string>): boolean {
		if (node.type !== 'n8n-nodes-base.executeWorkflow') return false;

		const workflowIdParam = node.parameters?.['workflowId'];

		// String format (v1)
		if (typeof workflowIdParam === 'string' && workflowIdMap[workflowIdParam]) {
			node.parameters['workflowId'] = workflowIdMap[workflowIdParam];
			return true;
		}

		// Object format (v1.1+)
		if (
			workflowIdParam &&
			typeof workflowIdParam === 'object' &&
			'value' in workflowIdParam &&
			typeof workflowIdParam.value === 'string' &&
			workflowIdMap[workflowIdParam.value]
		) {
			(workflowIdParam as { value: string }).value = workflowIdMap[workflowIdParam.value];
			return true;
		}

		return false;
	}

	private remapDataTableId(node: INode, dataTableIdMap: Record<string, string>): boolean {
		if (!DATA_TABLE_NODE_TYPES.includes(node.type)) return false;

		const dataTableIdParam = node.parameters?.['dataTableId'] as
			| { mode?: string; value?: string }
			| undefined;

		if (
			dataTableIdParam?.value &&
			typeof dataTableIdParam.value === 'string' &&
			dataTableIdMap[dataTableIdParam.value]
		) {
			dataTableIdParam.value = dataTableIdMap[dataTableIdParam.value];
			return true;
		}

		return false;
	}

	private async getUniqueDataTableName(name: string, projectId: string): Promise<string> {
		let candidate = name;
		let suffix = 1;

		while (await this.dataTableRepository.existsBy({ name: candidate, projectId })) {
			suffix++;
			candidate = `${name} (${suffix})`;
		}

		return candidate;
	}
}
