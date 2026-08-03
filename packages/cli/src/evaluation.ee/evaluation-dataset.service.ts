import type {
	AddDatasetRowDto,
	DatasetCandidateField,
	DatasetCandidateResponse,
	DatasetColumnMapping,
} from '@n8n/api-types';
import type { EvaluationConfig, User } from '@n8n/db';
import { EvaluationConfigRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { getParentNodes, jsonStringify, mapConnectionsByDestination } from 'n8n-workflow';
import type {
	DataTableColumnJsType,
	DataTableRow,
	IDataObject,
	IRunData,
	IWorkflowBase,
	JsonValue,
} from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import type { DataTableColumn } from '@/modules/data-table/data-table-column.entity';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { userHasScopes } from '@/permissions.ee/check-access';

/** First-item `json` of a node's last run output, keyed by field name. */
type FieldMap = IDataObject;

@Service()
export class EvaluationDatasetService {
	constructor(
		private readonly configRepository: EvaluationConfigRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly dataTableService: DataTableService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
	) {}

	/**
	 * Inspect a successful execution against an evaluation config and return the
	 * data table columns, the input/output fields available on the execution, and
	 * an auto-suggested column → field mapping.
	 */
	async getCandidate(
		user: User,
		workflowId: string,
		configId: string,
		executionId: string,
	): Promise<DatasetCandidateResponse> {
		const config = await this.loadDataTableConfig(workflowId, configId);
		const { workflowData, runData } = await this.loadSuccessfulExecution(workflowId, executionId);

		const dataTableId = this.dataTableId(config);
		// Workflow access alone is not enough: the config's data table may live in a
		// different project, so enforce the user's read access on that table directly.
		await this.assertDataTableAccess(user, dataTableId, 'dataTable:readRow');
		const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);
		const columns = await this.dataTableService.getColumns(dataTableId, projectId);

		const { inputs, outputs } = this.extractFields(config, workflowData, runData);

		return {
			dataTableId,
			columns: columns.map((c) => ({ name: c.name, type: c.type })),
			fields: {
				inputs: toCandidateFields(inputs),
				outputs: toCandidateFields(outputs),
			},
			suggestedMapping: this.suggestMapping(columns, inputs, outputs),
		};
	}

	/**
	 * Re-extract values from the execution per the (user-reviewed) mapping and
	 * insert a single row into the config's data table. Values are always
	 * re-read server-side from the execution — the client only sends the mapping.
	 */
	async addRow(user: User, workflowId: string, configId: string, dto: AddDatasetRowDto) {
		// This write path is workflow-scoped and so bypasses the data table
		// controller/middleware that normally blocks writes on a protected
		// (read-only) instance. Mirror that guard here.
		this.assertInstanceWriteAccess();

		const config = await this.loadDataTableConfig(workflowId, configId);
		const { workflowData, runData } = await this.loadSuccessfulExecution(
			workflowId,
			dto.executionId,
		);

		const dataTableId = this.dataTableId(config);
		// Workflow access alone is not enough: the config's data table may live in a
		// different project, so enforce the user's write access on that table directly.
		await this.assertDataTableAccess(user, dataTableId, 'dataTable:writeRow');
		const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);
		const columns = await this.dataTableService.getColumns(dataTableId, projectId);

		const { inputs, outputs } = this.extractFields(config, workflowData, runData);

		const row: DataTableRow = {};
		for (const column of columns) {
			const mapping = dto.mapping[column.name];
			if (!mapping) continue;

			const source = mapping.source === 'input' ? inputs : outputs;
			const value = source[mapping.field];
			// Field may no longer be present on the execution (stale mapping) — skip
			// rather than write a misleading value.
			if (value === undefined) continue;

			row[column.name] = toDataTableCellValue(value as JsonValue, column);
		}

		return await this.dataTableService.insertRows(dataTableId, projectId, [row], 'id');
	}

	// -------------------------------------------------------------------------
	// Internals
	// -------------------------------------------------------------------------

	/**
	 * Block Data Table writes when the instance is in source-control read-only
	 * (protected) mode, matching the canonical data table routes.
	 */
	private assertInstanceWriteAccess(): void {
		const { branchReadOnly } = this.sourceControlPreferencesService.getPreferences();
		if (branchReadOnly) {
			throw new ForbiddenError(
				'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
			);
		}
	}

	private async loadDataTableConfig(
		workflowId: string,
		configId: string,
	): Promise<EvaluationConfig> {
		const config = await this.configRepository.findByIdAndWorkflowId(configId, workflowId);
		if (!config) {
			throw new NotFoundError('Evaluation config not found');
		}
		if (config.datasetSource !== 'data_table') {
			throw new BadRequestError(
				'Only evaluation configs backed by a data table can receive executions',
			);
		}
		return config;
	}

	private async loadSuccessfulExecution(
		workflowId: string,
		executionId: string,
	): Promise<{ workflowData: IWorkflowBase; runData: IRunData }> {
		// Load via ExecutionPersistence (not the raw repository): it reads the run
		// data from the store recorded in `storedAt` (`db` or `fs`). The raw
		// repository only reads the DB blob, which is empty for fs-stored
		// executions and yields no run data.
		const execution = await this.executionPersistence.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
			where: { workflowId },
		});

		if (!execution) {
			throw new NotFoundError('Execution not found');
		}
		if (execution.status !== 'success') {
			throw new BadRequestError('Only successful executions can be added to a dataset');
		}
		if (execution.mode === 'evaluation') {
			throw new BadRequestError('Evaluation runs cannot be added to a dataset');
		}

		const runData = execution.data?.resultData?.runData;
		if (!runData) {
			throw new BadRequestError('This execution has no stored data to add to a dataset');
		}

		return {
			workflowData: execution.workflowData,
			runData,
		};
	}

	private dataTableId(config: EvaluationConfig): string {
		// Narrowed by `loadDataTableConfig` (datasetSource === 'data_table').
		return (config.datasetRef as { dataTableId: string }).dataTableId;
	}

	/**
	 * Mirror the `@ProjectScope('dataTable:*')` guard the canonical data table
	 * routes use. Our routes are workflow-scoped, so we check the user's access to
	 * the resolved data table's project explicitly. `userHasScopes` throws
	 * NotFoundError when the table no longer exists.
	 */
	private async assertDataTableAccess(
		user: User,
		dataTableId: string,
		scope: Scope,
	): Promise<void> {
		const allowed = await userHasScopes(user, [scope], false, { dataTableId });
		if (!allowed) {
			throw new ForbiddenError('You do not have access to this data table');
		}
	}

	/** The input/output fields available on the execution for the config's slice. */
	private extractFields(
		config: EvaluationConfig,
		workflow: IWorkflowBase,
		runData: IRunData,
	): { inputs: FieldMap; outputs: FieldMap } {
		return {
			inputs: this.extractInputFields(workflow, runData, config.startNodeName),
			outputs: this.extractOutputFields(runData, config.endNodeName),
		};
	}

	/**
	 * The inputs to the evaluated slice are the data that flowed into the start
	 * node — i.e. its single upstream parent's output. If the start node has no
	 * parent (it is itself the entry/trigger), fall back to its own output.
	 */
	private extractInputFields(
		workflow: IWorkflowBase,
		runData: IRunData,
		startNodeName: string,
	): FieldMap {
		const byDestination = mapConnectionsByDestination(workflow.connections);
		const parents = getParentNodes(byDestination, startNodeName, 'main', 1);

		const sourceNode = parents.length === 1 ? parents[0] : startNodeName;
		return getNodeOutputJson(runData, sourceNode);
	}

	private extractOutputFields(runData: IRunData, endNodeName: string): FieldMap {
		return getNodeOutputJson(runData, endNodeName);
	}

	private suggestMapping(
		columns: DataTableColumn[],
		inputs: FieldMap,
		outputs: FieldMap,
	): Record<string, DatasetColumnMapping> {
		const inputKeys = new Map(Object.keys(inputs).map((k) => [k.toLowerCase(), k]));
		const outputKeys = new Map(Object.keys(outputs).map((k) => [k.toLowerCase(), k]));

		const suggestion: Record<string, DatasetColumnMapping> = {};
		for (const column of columns) {
			const lookup = column.name.toLowerCase();
			// Inputs take precedence over outputs on a name clash.
			const inputMatch = inputKeys.get(lookup);
			if (inputMatch !== undefined) {
				suggestion[column.name] = { source: 'input', field: inputMatch };
				continue;
			}
			const outputMatch = outputKeys.get(lookup);
			suggestion[column.name] =
				outputMatch !== undefined ? { source: 'output', field: outputMatch } : null;
		}
		return suggestion;
	}
}

/** First item's `json` of a node's last run, or `{}` when there is no output. */
function getNodeOutputJson(runData: IRunData, nodeName: string): FieldMap {
	const taskData = runData[nodeName];
	if (!taskData?.length) return {};

	const lastRun = taskData[taskData.length - 1];
	const items = lastRun?.data?.main?.[0];
	if (!items?.length) return {};

	return items[0]?.json ?? {};
}

function toCandidateFields(fields: FieldMap): DatasetCandidateField[] {
	return Object.entries(fields).map(([key, sample]) => ({ key, sample }));
}

/**
 * Coerce an execution value into a data table cell value. Primitives pass
 * through unchanged (`insertRows` applies the column's own type coercion).
 * Objects/arrays are JSON-stringified for `string` columns; for any other
 * column type a non-primitive value can never be represented, so reject it up
 * front with a clear message rather than letting it fail deep inside
 * `insertRows` with an opaque validation error.
 */
function toDataTableCellValue(value: JsonValue, column: DataTableColumn): DataTableColumnJsType {
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		value === null
	) {
		return value;
	}
	if (column.type !== 'string') {
		throw new BadRequestError(
			`The field mapped to column '${column.name}' is an object, which cannot be stored in a '${column.type}' column`,
		);
	}
	return jsonStringify(value);
}
