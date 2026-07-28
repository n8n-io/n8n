import type {
	GraphNode,
	IStepExecutor,
	StepExecutionRequest,
	StepExecutionResult,
} from '@n8n/engine';
import { ExecuteContext } from 'n8n-core';
import type {
	IExecuteData,
	INode,
	INodeExecutionData,
	ITaskDataConnections,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	createRunExecutionData,
	isNodeClassInstance,
	UnexpectedError,
	Workflow,
} from 'n8n-workflow';

import {
	EngineRequestNotSupportedError,
	MalformedStepConfigError,
	UnsupportedNodeTypeError,
	UnknownNodeTypeError,
	UnsupportedStepTypeError,
} from './errors';
import { isV1NodeStepConfig } from './guards';
import { fromStepInputs, toStepOutputs } from './io';
import type {
	CreateNodeExecuteContextParams,
	ExecutableNodeType,
	NodeRunResult,
	RunNodeParams,
	V1NodeStepConfig,
	V1StepExecutorDeps,
} from './types';

/**
 * Runs `v1-node` steps by adapting them to the v1 node runtime.
 *
 * A step is executable when its type is `v1-node`, its config is a valid
 * `V1NodeStepConfig`, and the config names a registered node type with an
 * `execute` method.
 */
export class V1StepExecutor implements IStepExecutor {
	constructor(private readonly deps: V1StepExecutorDeps) {}

	async execute(request: StepExecutionRequest): Promise<StepExecutionResult> {
		const stepConfig = this.validateStepConfig(request.node);
		const nodeType = this.resolveNodeType(stepConfig);

		const nodeExecuteContext = await this.createNodeExecuteContext({
			nodeId: request.node.id,
			nodeName: request.node.name,
			stepContext: request.context,
			stepConfig,
			itemsByConnection: fromStepInputs(request.inputs),
		});

		const nodeResult = await this.runNode({ nodeType, nodeExecuteContext });

		return { outputs: toStepOutputs(nodeResult) };
	}

	private validateStepConfig({ type, name, config }: GraphNode): V1NodeStepConfig {
		if (type !== 'v1-node') throw new UnsupportedStepTypeError(type);
		if (!isV1NodeStepConfig(config)) throw new MalformedStepConfigError(name);

		return config;
	}

	private resolveNodeType({
		nodeType: typeName,
		typeVersion,
	}: V1NodeStepConfig): ExecutableNodeType {
		const nodeType = this.deps.nodeTypes.getByNameAndVersion(typeName, typeVersion);
		if (!nodeType) throw new UnknownNodeTypeError(typeName);
		if (typeof nodeType.execute !== 'function') throw new UnsupportedNodeTypeError(typeName);

		return nodeType as ExecutableNodeType;
	}

	private async createNodeExecuteContext({
		nodeId,
		nodeName,
		stepConfig,
		stepContext: stepCtx,
		itemsByConnection,
	}: CreateNodeExecuteContextParams) {
		const node: INode = {
			id: nodeId,
			name: nodeName,
			type: stepConfig.nodeType,
			typeVersion: stepConfig.typeVersion,
			position: [0, 0],
			parameters: stepConfig.parameters,
			continueOnFail: stepConfig.continueOnFail,
		};

		const workflow = new Workflow({
			id: stepCtx.workflowId,
			nodes: [node],
			connections: {},
			active: false,
			nodeTypes: this.deps.nodeTypes,
		});

		const firstInput = itemsByConnection[0] ?? [];
		const connectionInputData = firstInput.length > 0 ? firstInput : [{ json: {} }];
		const inputData: ITaskDataConnections = {
			main: [connectionInputData, ...itemsByConnection.slice(1)],
		};

		const runExecutionData = createRunExecutionData({
			startData: {},
			resultData: { runData: {} },
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: null,
			},
		});

		const executeData: IExecuteData = { node, data: inputData, source: null };
		const mode: WorkflowExecuteMode = stepCtx.mode === 'production' ? 'trigger' : 'manual';
		const additionalData = await this.deps.additionalDataFactory(stepCtx.executionId);

		return new ExecuteContext(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			0,
			connectionInputData,
			inputData,
			executeData,
			[],
		);
	}

	/**
	 * Runs the node and settles its cleanup functions.
	 *
	 * Cleanup errors propagate only when the node itself succeeded. A node
	 * failure with `continueOnFail` passes the input items through as output.
	 * A null result yields no output.
	 */
	private async runNode({
		nodeType,
		nodeExecuteContext,
	}: RunNodeParams): Promise<INodeExecutionData[][]> {
		let result: NodeRunResult;
		try {
			const value = isNodeClassInstance(nodeType)
				? await nodeType.execute(nodeExecuteContext)
				: await nodeType.execute.call(nodeExecuteContext);
			result = { ok: true, value };
		} catch (error) {
			result = { ok: false, error };
		}

		const { closeFunctions } = nodeExecuteContext;
		if (closeFunctions.length > 0) {
			const closeResults = await Promise.allSettled(closeFunctions.map(async (fn) => await fn()));
			if (result.ok) {
				const rejected = closeResults.find(
					(closeResult): closeResult is PromiseRejectedResult => closeResult.status === 'rejected',
				);
				if (rejected) {
					throw rejected.reason instanceof Error
						? rejected.reason
						: new UnexpectedError("Error on node's close function", {
								extra: { nodeName: nodeExecuteContext.getNode().name },
							});
				}
			}
		}

		if (!result.ok) {
			if (!nodeExecuteContext.continueOnFail()) throw result.error;
			return [nodeExecuteContext.getInputData()];
		}

		if (result.value === null || result.value === undefined) return [];

		if (Array.isArray(result.value)) return result.value as INodeExecutionData[][];

		throw new EngineRequestNotSupportedError(nodeExecuteContext.getNode().type);
	}
}
