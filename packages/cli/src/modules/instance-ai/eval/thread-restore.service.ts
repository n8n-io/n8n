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

/** Recreates the data tables and workflows a conversation seed references, so a
 *  restored message history's ids resolve. Used by the eval restore endpoint. */
@Service()
export class EvalThreadRestoreService {
	constructor(
		private readonly workflowRepo: WorkflowRepository,
		private readonly sharedWorkflowRepo: SharedWorkflowRepository,
		private readonly dataTableService: DataTableService,
	) {}

	/**
	 * Recreate each seed data table and map its seed id to the freshly created
	 * one. Tables are created under a uniquified name (names are unique per
	 * project; the id, which the workflow references, is what matters). A table
	 * declaring `rows` is seeded with them against its declared column types
	 * (TRUST-311) — free-text `dataSetup` can't declare types, so a string id
	 * like `row_001` would otherwise be rejected by a `number` column. Rolls back
	 * tables already created if a later table (or its rows) fails.
	 *
	 * `uniquifyNames` (default true) appends a unique suffix to each name to dodge
	 * the per-project unique-name constraint — safe when the seed workflow
	 * references tables by id (id-remap). Pass false to keep the EXACT declared
	 * name, so a freshly-built workflow's by-name references resolve (TRUST-311
	 * scenario seeding).
	 */
	async restoreDataTables(
		dataTables: InstanceAiEvalSeedDataTable[],
		projectId: string,
		options: { uniquifyNames?: boolean } = {},
	): Promise<Map<string, string>> {
		const uniquifyNames = options.uniquifyNames ?? true;
		const idMap = new Map<string, string>();
		try {
			for (const table of dataTables) {
				// Short ids would risk corrupting unrelated substrings in the
				// whole-document id remap below; refuse them.
				if (table.id.length < 8) {
					throw new BadRequestError(
						`Seed data table id "${table.id}" is too short to remap safely (need ≥8 chars)`,
					);
				}
				let name = table.name;
				if (uniquifyNames) {
					const suffix = ` [seed ${randomUUID().slice(0, 8)}]`;
					name = `${table.name.slice(0, 128 - suffix.length)}${suffix}`;
				}
				const created = await this.dataTableService.createDataTable(projectId, {
					name,
					columns: table.columns,
				});
				// Map before seeding rows so a row-insert failure rolls this table back too.
				idMap.set(table.id, created.id);
				if (table.rows && table.rows.length > 0) {
					await this.dataTableService.insertRows(created.id, projectId, table.rows);
				}
			}
		} catch (error) {
			await this.deleteDataTables([...idMap.values()], projectId);
			throw error;
		}
		return idMap;
	}

	/**
	 * Reset an existing data table's rows to exactly `rows` (clear-then-insert).
	 * Used for the per-scenario row seeding of a case whose tables were created
	 * empty before the build turn (TRUST-311 follow-up): the table already exists
	 * (the built workflow bound its id), so we only swap the rows a scenario
	 * declares — clearing whatever a prior scenario or a build-time execution
	 * left. Rows are validated against each column's type by `insertRows`.
	 */
	async reseedDataTableRows(
		tableId: string,
		projectId: string,
		rows: NonNullable<InstanceAiEvalSeedDataTable['rows']>,
	): Promise<void> {
		await this.dataTableService.clearRows(tableId, projectId);
		if (rows.length > 0) {
			await this.dataTableService.insertRows(tableId, projectId, rows);
		}
	}

	/** Best-effort delete (rollback of a failed restore). */
	async deleteDataTables(dataTableIds: string[], projectId: string): Promise<void> {
		for (const id of dataTableIds) {
			try {
				await this.dataTableService.deleteDataTable(id, projectId);
			} catch {
				// best-effort
			}
		}
	}

	/** Recreate the seed workflows; returns the ids actually created (newly), and
	 *  rolls them back if a later one fails. */
	async restoreWorkflows(
		workflows: InstanceAiEvalSeedWorkflow[],
		projectId: string,
		dataTableIdMap: Map<string, string> = new Map(),
	): Promise<string[]> {
		const created: string[] = [];
		try {
			for (const workflow of workflows) {
				if (await this.createWorkflowPinnedToId(workflow, projectId, dataTableIdMap)) {
					created.push(workflow.id);
				}
			}
		} catch (error) {
			await this.deleteWorkflows(created);
			throw error;
		}
		return created;
	}

	/** Best-effort delete (rollback of a failed restore). */
	async deleteWorkflows(workflowIds: string[]): Promise<void> {
		for (const id of workflowIds) {
			try {
				await this.workflowRepo.delete({ id });
			} catch {
				// best-effort
			}
		}
	}

	/**
	 * Insert a workflow at its seeded id (the BeforeInsert hook only generates an
	 * id when unset) and make the project its owner. Node credentials are stripped
	 * (the eval credential pin owns the credential view). Data-table references are
	 * rewritten to the recreated tables' ids. Returns true if newly created.
	 */
	private async createWorkflowPinnedToId(
		workflow: InstanceAiEvalSeedWorkflow,
		projectId: string,
		dataTableIdMap: Map<string, string>,
	): Promise<boolean> {
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

		// Never overwrite a workflow owned by a different project (id collision).
		const owningProject = await this.sharedWorkflowRepo.getWorkflowOwningProject(workflow.id);
		if (owningProject && owningProject.id !== projectId) {
			throw new BadRequestError(
				`Seed workflow id ${workflow.id} already exists in another project; refusing to overwrite`,
			);
		}

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
		if (!owningProject) {
			await this.sharedWorkflowRepo.makeOwner([workflow.id], projectId);
			return true;
		}
		return false;
	}
}
