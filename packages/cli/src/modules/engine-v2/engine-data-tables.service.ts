import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { ForbiddenError, NotFoundError } from '@n8n/errors';
import {
	DataTableProxyService,
	dataTableNotFoundInProject,
	isAllowedNode,
} from '@/modules/data-table/data-table-proxy.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { OwnershipService } from '@/services/ownership.service';

import type {
	DataTableCall,
	DataTableCallOutcome,
	DataTableCallRequest,
} from './engine-data-tables.contract';

/** What the node says when its helpers are missing. The data plane raises the same text. */
const MODULE_DISABLED_MESSAGE = 'Attempted to use Data table node but the module is disabled';

/**
 * Runs one data table operation for the engine v2 data plane. The data plane
 * has no control plane database, so every read and write of a data table
 * lands here.
 *
 * Access follows the v1 proxy: the node type must be one of the data table
 * nodes, and the project is the workflow's home project. The token proves the
 * caller is the engine, not which project it may touch, so the project is
 * resolved here on every call and never read from the request.
 *
 * The workflow id itself is trusted from the data plane, as the credentials
 * route trusts it: an engine execution has no control plane row to check it
 * against, and the data plane holds the shared secret, so it is trusted with
 * every workflow it runs. Binding a token to one execution is a change to the
 * action token model, not to this route.
 */
@Service()
export class EngineDataTablesService {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	/**
	 * Returns the operation's result, or a refusal the data plane turns into the
	 * error a v1 execution would see. Throws `ForbiddenError` for a node type
	 * outside the allow list. Any other failure is passed on as a server error.
	 */
	async call({ execution, consumer, call }: DataTableCallRequest): Promise<DataTableCallOutcome> {
		if (!this.moduleRegistry.isActive('data-table')) {
			return { error: { kind: 'node-operation', message: MODULE_DISABLED_MESSAGE } };
		}

		if (!isAllowedNode(consumer.nodeType)) {
			this.logger.warn(
				`Refused data table access to node type "${consumer.nodeType}" in workflow "${execution.workflowId}"`,
			);
			throw new ForbiddenError('Data tables are not available to this node type');
		}

		const { id: projectId } = await this.ownershipService.getWorkflowProjectCached(
			execution.workflowId,
		);

		try {
			return { data: await this.run(projectId, call) };
		} catch (error) {
			if (error instanceof DataTableNotFoundError && 'dataTableId' in call) {
				return {
					error: { kind: 'node-operation', ...dataTableNotFoundInProject(call.dataTableId) },
				};
			}
			// The service's own refusals. Their messages are what the node shows.
			if (error instanceof UserError || error instanceof NotFoundError) {
				return { error: { kind: 'user', message: error.message } };
			}
			throw error;
		}
	}

	private async run(projectId: string, call: DataTableCall): Promise<unknown> {
		// Resolved per call: the module is active, so the proxy and its store exist.
		const proxy = Container.get(DataTableProxyService);

		switch (call.kind) {
			case 'getProjectId':
				return projectId;
			case 'getManyAndCount':
				return await proxy.makeAggregateOperations(projectId).getManyAndCount(call.options);
			case 'createDataTable':
				return await proxy.makeAggregateOperations(projectId).createDataTable(call.options);
		}

		const table = proxy.makeDataTableOperations(projectId, call.dataTableId);

		switch (call.kind) {
			case 'updateDataTable':
				return await table.updateDataTable(call.options);
			case 'deleteDataTable':
				return await table.deleteDataTable();
			case 'getColumns':
				return await table.getColumns();
			case 'addColumn':
				return await table.addColumn(call.options);
			case 'moveColumn':
				return await table.moveColumn(call.columnId, call.options);
			case 'deleteColumn':
				return await table.deleteColumn(call.columnId);
			case 'getManyRowsAndCount':
				return await table.getManyRowsAndCount(call.options);
			case 'insertRows':
				return await table.insertRows(call.rows, call.returnType);
			case 'updateRows':
				return await table.updateRows(call.options);
			case 'upsertRow':
				return await table.upsertRow(call.options);
			case 'deleteRows':
				return await table.deleteRows(call.options);
			case 'clearRows':
				return await table.clearRows();
		}
	}
}
