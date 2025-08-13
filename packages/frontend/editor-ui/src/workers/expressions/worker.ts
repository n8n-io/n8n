import type {
	INodeType,
	IConnections,
	IDataObject,
	INode,
	INodeParameters,
	IPinData,
	IWorkflowDataProxyAdditionalKeys,
	NodeParameterValue,
	INodeTypes,
} from 'n8n-workflow';
import { jsonParse, Workflow } from 'n8n-workflow';
import type { IExecutionResponse, IWorkflowDb, TargetItem } from '@/Interface';
import { useSQLite } from '@/workers/expressions/database/useSQLite';
import { createNodeTypes, resolveParameterImpl } from '@/workers/expressions/resolveParameter';
import * as Comlink from 'comlink';
import type { DbId } from '@sqlite.org/sqlite-wasm';
import * as workflowsApi from '@/api/workflows';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { parse } from 'flatted';

export type ResolveParameterOptions = {
	targetItem?: TargetItem;
	inputNodeName?: string;
	inputRunIndex?: number;
	inputBranchIndex?: number;
	additionalKeys?: IWorkflowDataProxyAdditionalKeys;
	isForCredential?: boolean;
	contextNodeName?: string;
	connections?: IConnections;
};

export type ExecutionDb = {
	id: string;
	workflow_id: string;
	data: string;
	workflow: string;
};

export type ExecutionDbParsed = {
	id: string;
	workflow_id: string;
	data: IExecutionResponse['data'];
	workflow: IWorkflowDb;
};

const state: {
	initialized: boolean;
	db?: Awaited<ReturnType<typeof useSQLite>>;
	restApiContext?: IRestApiContext;
	nodeTypes?: INodeTypes;
} = {
	initialized: false,
};

const actions = {
	isInitialized(rawState: typeof state): rawState is Required<typeof state> {
		return rawState.initialized;
	},
	async initialize(options: { restApiContext: IRestApiContext }) {
		state.db = await useSQLite();
		state.restApiContext = options.restApiContext;
		state.initialized = true;

		console.log('Worker initialized with database', state);
	},
	// @TODO Replace with fetch nodes.json alternative
	setNodeTypes(value: string): void {
		state.nodeTypes = createNodeTypes(jsonParse<Record<string, INodeType>>(value));

		console.log('Node types set in worker', state.nodeTypes);
	},
	async fetchExecution(executionId: string) {
		console.log('Fetching execution in worker', executionId);

		if (!actions.isInitialized(state)) {
			throw new Error('Worker not initialized.');
		}

		const queryResult = await actions.executeQuery(
			'SELECT * FROM executions WHERE id = ? LIMIT 1',
			[executionId],
		);

		console.log('Query result for execution', queryResult);

		let existingExecution;
		if (queryResult.result.resultRows && queryResult.result.resultRows.length > 0) {
			const row = queryResult.result.resultRows[0] as unknown as ExecutionDb;
			const rowParsed = {} as ExecutionDbParsed;

			rowParsed.data = parse(row.data) as IExecutionResponse['data'];
			rowParsed.id = row.id;
			rowParsed.workflow_id = row.workflow_id;
			rowParsed.workflow = jsonParse<IWorkflowDb>(row.workflow);

			existingExecution = rowParsed as unknown as IExecutionResponse;
		}

		if (existingExecution) {
			console.log('Execution already exists in worker', existingExecution);
			return existingExecution;
		}

		console.log('Fetching execution from API', executionId);

		const execution = await workflowsApi.getExecutionData(state.restApiContext, executionId);
		if (!execution) {
			throw new Error(`Execution with ID ${executionId} not found`);
		}

		await actions.executeQuery(
			'INSERT INTO executions (id, workflow_id, data, workflow) VALUES (?, ?, ?, ?)',
			[
				execution.id,
				execution.workflowData.id,
				execution.data,
				JSON.stringify(execution.workflowData),
			],
		);

		return execution;
	},
	async executeQuery(sql: string, params: unknown[] = []) {
		if (!actions.isInitialized(state)) {
			throw new Error('Worker not initialized.');
		}

		const { db } = state;
		try {
			const result = await db.promiser('exec', {
				dbId: db.dbId as DbId,
				sql,
				bind: params,
				returnValue: 'resultRows',
				// @ts-expect-error
				rowMode: 'object',
			});

			if (result.type === 'error') {
				throw new Error(result.result.message);
			}

			return result;
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Query execution failed');
			throw error;
		}
	},
	async resolveParameter<T = IDataObject>(
		parameter: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		options: {
			executionId?: string;
			workflowId: string;
			nodeName?: string;
			nodes: string;
			connectionsBySourceNode: string;
			envVars: string;
			pinData: string;
			inputNode?: string;
			additionalKeys: string;
		},
	): Promise<T | null> {
		if (!actions.isInitialized(state)) {
			throw new Error('Worker not initialized.');
		}

		const { nodeTypes } = state;

		const executionId = options.executionId ?? null;
		let execution = null;
		if (executionId) {
			execution = await actions.fetchExecution(executionId);
		}

		const workflowId = options.workflowId;
		const nodeName = options.nodeName ?? null;
		const nodes = options.nodes ? jsonParse<INode[]>(options.nodes) : [];
		const node = nodes.find((n) => n.name === nodeName) ?? null;
		const connectionsBySourceNode = options.connectionsBySourceNode
			? jsonParse<IConnections>(options.connectionsBySourceNode)
			: {};
		const envVars = options.envVars
			? jsonParse<Record<string, string | boolean | number>>(options.envVars)
			: {};
		const pinData = options.pinData ? jsonParse<IPinData>(options.pinData) : {};
		const inputNode = options.inputNode
			? jsonParse<{ name: string; runIndex: number; branchIndex: number }>(options.inputNode)
			: null;
		const additionalKeys = options.additionalKeys
			? jsonParse<IDataObject>(options.additionalKeys)
			: {};

		const workflowObject = new Workflow({
			id: workflowId,
			nodes,
			connections: connectionsBySourceNode,
			active: false,
			nodeTypes,
		});

		console.log('resolveParameter in WORKER', parameter, {
			executionId,
			nodeName,
			nodes,
			connectionsBySourceNode,
			envVars,
			pinData,
			inputNode,
			additionalKeys,
			workflowObject,
		});

		return await resolveParameterImpl(
			parameter,
			workflowObject,
			connectionsBySourceNode,
			envVars,
			node,
			execution,
			true,
			pinData,
			{
				inputNodeName: inputNode?.name,
				inputRunIndex: inputNode?.runIndex,
				inputBranchIndex: inputNode?.branchIndex,
				additionalKeys,
			},
		);
	},
};

export type ExpressionsWorker = typeof actions;

Comlink.expose(actions);
