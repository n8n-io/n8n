import type { InstanceAiEvalSeedDataTable, InstanceAiEvalSeedWorkflow } from '@n8n/api-types';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, type IConnections, type INode } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { DataTableService } from '@/modules/data-table/data-table.service';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkflowNode(value: unknown): value is INode {
	if (!isRecord(value)) return false;
	return (
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		typeof value.type === 'string' &&
		typeof value.typeVersion === 'number' &&
		Array.isArray(value.position) &&
		value.position.length === 2 &&
		value.position.every((coordinate) => typeof coordinate === 'number') &&
		isRecord(value.parameters)
	);
}

function isConnections(value: unknown): value is IConnections {
	return isRecord(value);
}

/**
 * Recreates the artifacts a conversation seed references — data tables and
 * workflows — so a restored message history's ids resolve on this instance.
 * Used by the eval restore-thread endpoint.
 */
@Service()
export class EvalThreadRestoreService {
	constructor(
		private readonly workflowRepo: WorkflowRepository,
		private readonly sharedWorkflowRepo: SharedWorkflowRepository,
		private readonly dataTableService: DataTableService,
	) {}

	/**
	 * Recreate each seed data table (schema only — no rows) in the project and
	 * return a map from the seed's (source-instance) table id to the freshly
	 * created one. A data table's id is server-generated (not pinnable) and its
	 * name is unique per project, so the table is created under a uniquified
	 * name and the seed workflows' references are rewritten to the new id by
	 * `restoreWorkflows`. An empty table is all the workflow node needs to
	 * resolve; rows are deliberately never sent here (see the seed schema).
	 */
	async restoreDataTables(
		dataTables: InstanceAiEvalSeedDataTable[],
		projectId: string,
	): Promise<{ idMap: Map<string, string>; createdIds: string[] }> {
		const idMap = new Map<string, string>();
		const createdIds: string[] = [];
		for (const table of dataTables) {
			// Keep names unique across parallel iterations sharing this project
			// (creation rejects duplicate names). The id, not the name, is what
			// the workflow references, so the suffix is cosmetic.
			const suffix = ` [seed ${randomUUID().slice(0, 8)}]`;
			const name = `${table.name.slice(0, 128 - suffix.length)}${suffix}`;
			const created = await this.dataTableService.createDataTable(projectId, {
				name,
				columns: table.columns,
			});
			idMap.set(table.id, created.id);
			createdIds.push(created.id);
		}
		return { idMap, createdIds };
	}

	async restoreWorkflows(
		workflows: InstanceAiEvalSeedWorkflow[],
		projectId: string,
		dataTableIdMap: Map<string, string> = new Map(),
	): Promise<void> {
		for (const workflow of workflows) {
			await this.createWorkflowPinnedToId(workflow, projectId, dataTableIdMap);
		}
	}

	/**
	 * Insert a workflow at its seeded id (the BeforeInsert hook only generates
	 * an id when unset) and make the project its owner so the agent can find and
	 * edit it. Idempotent: `save` upserts at the pinned id, and ownership is
	 * only granted on first create to avoid a duplicate shared-workflow row.
	 *
	 * Node credentials are stripped: the eval credential pin only filters
	 * `list()`, so a pre-attached credential id would bypass the thread's
	 * pinned credential view (and dangle anyway — the source instance's
	 * credentials don't exist here).
	 *
	 * Data-table references are rewritten from the seed's ids to the recreated
	 * tables' ids (see `restoreDataTables`). The ids are long random tokens, so
	 * a whole-document string replace can't corrupt unrelated values; the result
	 * is re-validated as a node before persisting.
	 */
	private async createWorkflowPinnedToId(
		workflow: InstanceAiEvalSeedWorkflow,
		projectId: string,
		dataTableIdMap: Map<string, string>,
	): Promise<void> {
		const remapDataTableIds = (value: unknown): unknown => {
			if (dataTableIdMap.size === 0) return value;
			let serialized = JSON.stringify(value);
			for (const [oldId, newId] of dataTableIdMap) {
				serialized = serialized.replaceAll(oldId, newId);
			}
			return jsonParse<unknown>(serialized);
		};

		const nodes: INode[] = workflow.nodes.map((node, index) => {
			if (!isWorkflowNode(node)) {
				throw new BadRequestError(
					`Seed workflow ${workflow.id} node at index ${index} is not a valid workflow node`,
				);
			}
			const { credentials: _stripped, ...rest } = node;
			const remapped = remapDataTableIds(rest);
			if (!isWorkflowNode(remapped)) {
				throw new BadRequestError(
					`Seed workflow ${workflow.id} node at index ${index} became invalid after data-table id remap`,
				);
			}
			return remapped;
		});

		const connections = remapDataTableIds(workflow.connections);
		if (!isConnections(connections)) {
			throw new BadRequestError(`Seed workflow ${workflow.id} connections must be an object`);
		}

		const alreadyExists = await this.workflowRepo.existsBy({ id: workflow.id });
		await this.workflowRepo.save(
			this.workflowRepo.create({
				id: workflow.id,
				name: workflow.name,
				nodes,
				connections,
				active: false,
				versionId: randomUUID(),
			}),
		);
		if (!alreadyExists) {
			await this.sharedWorkflowRepo.makeOwner([workflow.id], projectId);
		}
	}
}
