import type {
	INodeType,
	IConnections,
	IDataObject,
	INode,
	INodeParameters,
	IPinData,
	NodeParameterValue,
	INodeTypes,
} from 'n8n-workflow';
import { jsonParse, Workflow } from 'n8n-workflow';
import type { IExecutionResponse, IWorkflowDb } from '@/Interface';
import { useSQLite } from '@/workers/expressions/database/useSQLite';
import { createNodeTypes, resolveParameterImpl } from '@/workers/expressions/resolveParameter';
import * as Comlink from 'comlink';
import type { DbId } from '@sqlite.org/sqlite-wasm';
import * as workflowsApi from '@/api/workflows';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { parse } from 'flatted';
import type { ExpressionLocalResolveContext } from '@/types/expressions';
import type { ResolveParameterOptions } from '@/composables/useWorkflowHelpers';

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
	executionsMap: Map<string, IExecutionResponse>;
	executionsPromiseMap: Map<string, Promise<IExecutionResponse>>;
} = {
	initialized: false,
	executionsMap: new Map(),
	executionsPromiseMap: new Map(),
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

		let existingExecution;
		if (state.executionsMap.has(executionId)) {
			existingExecution = state.executionsMap.get(executionId);

			console.log('Execution found in local map', existingExecution);
		} else {
			const queryResult = await actions.executeQuery(
				'SELECT * FROM executions WHERE id = ? LIMIT 1',
				[executionId],
			);

			if (queryResult.result.resultRows && queryResult.result.resultRows.length > 0) {
				const row = queryResult.result.resultRows[0] as unknown as ExecutionDb;
				const rowParsed = {} as ExecutionDbParsed;

				rowParsed.data = parse(row.data) as IExecutionResponse['data'];
				rowParsed.id = row.id;
				rowParsed.workflow_id = row.workflow_id;
				rowParsed.workflow = jsonParse<IWorkflowDb>(row.workflow);

				existingExecution = rowParsed as unknown as IExecutionResponse;
				state.executionsMap.set(executionId, existingExecution);

				console.log('Execution found in local database', existingExecution);
			}
		}

		if (existingExecution) {
			console.log('Execution already exists in worker', existingExecution);
			return existingExecution;
		}

		console.log('Fetching execution from API', executionId);

		const fetchExecutionPromise = async () => {
			const execution = await workflowsApi.getExecutionData(state.restApiContext, executionId);
			if (!execution) {
				throw new Error(`Execution with ID ${executionId} not found`);
			}

			await actions.insertExecution(execution);

			execution.data = parse(execution.data as unknown as string) as IExecutionResponse['data'];

			return execution;
		};

		let executionPromise;
		if (state.executionsPromiseMap.has(executionId)) {
			executionPromise = state.executionsPromiseMap.get(executionId);
		} else {
			executionPromise = fetchExecutionPromise();
			state.executionsPromiseMap.set(executionId, executionPromise);
		}

		const execution = await executionPromise;
		state.executionsMap.set(executionId, execution);

		return execution;
	},
	async insertExecution(execution: IExecutionResponse) {
		await actions.executeQuery(
			'INSERT INTO executions (id, workflow_id, data, workflow) VALUES (?, ?, ?, ?)',
			[
				execution.id,
				execution.workflowData.id,
				execution.data,
				JSON.stringify(execution.workflowData),
			],
		);
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
	async resolveLocalParameter<T = IDataObject>(
		parameter: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		options: Omit<
			ExpressionLocalResolveContext,
			'executionId' | 'connections' | 'envVars' | 'workflow' | 'execution'
		> & {
			executionId?: string;
			workflowId: string;
			nodes: string;
			pinData: string;
			connections: string;
			envVars: string;
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

		const nodes = options.nodes ? jsonParse<INode[]>(options.nodes) : [];
		const connections = options.connections ? jsonParse<IConnections>(options.connections) : {};
		const workflowObject = new Workflow({
			id: options.workflowId,
			nodes,
			connections,
			active: false,
			nodeTypes,
		});
		const pinData = options.pinData ? jsonParse<IPinData>(options.pinData) : {};
		const envVars = options.envVars
			? jsonParse<Record<string, string | number | boolean>>(options.envVars)
			: {};

		return await resolveParameterImpl(
			parameter,
			workflowObject,
			connections,
			envVars,
			workflowObject.getNode(options.nodeName),
			execution,
			true,
			pinData,
			{
				inputNodeName: options.inputNode?.name,
				inputRunIndex: options.inputNode?.runIndex,
				inputBranchIndex: options.inputNode?.branchIndex,
				additionalKeys: options.additionalKeys,
			},
		);
	},
	async resolveParameter<T = IDataObject>(
		parameter: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		options: Omit<ResolveParameterOptions, 'workflow' | 'connections' | 'additionalKeys'> & {
			executionId?: string;
			workflowId: string;
			nodes: string;
			nodeName: string;
			connections: string;
			pinData: string;
			shouldReplaceInputDataWithPinData?: boolean;
			envVars: string;
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
		const connections = options.connections ? jsonParse<IConnections>(options.connections) : {};
		const node = nodes.find((n) => n.name === nodeName) ?? null;
		const envVars = options.envVars
			? jsonParse<Record<string, string | boolean | number>>(options.envVars)
			: {};
		const pinData = options.pinData ? jsonParse<IPinData>(options.pinData) : {};

		const workflowObject = new Workflow({
			id: workflowId,
			nodes,
			connections,
			active: false,
			nodeTypes,
		});

		console.log('resolveParameter in WORKER', parameter, {
			executionId,
			nodeName,
			nodes,
			connections,
			envVars,
			pinData,
			workflowObject,
		});

		return await resolveParameterImpl(
			parameter,
			workflowObject,
			connections,
			envVars,
			node,
			execution,
			options.shouldReplaceInputDataWithPinData,
			pinData,
			options,
		);
	},
};

export type ExpressionsWorker = typeof actions;

Comlink.expose(actions);
