import type {
	GraphNode,
	IStepExecutor,
	StepExecutionRequest,
	StepExecutionResult,
} from '@n8n/engine';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import type { EngineRequest, INodeExecutionData, ISourceData } from 'n8n-workflow';
import {
	CHAT_NODE_TYPE,
	Expression,
	isNodeClassInstance,
	UnexpectedError,
	WAIT_FOR_SUB_EXECUTION,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';

import {
	EngineRequestNotSupportedError,
	InvalidWaitDateError,
	MalformedStepConfigError,
	UnsupportedNodeTypeError,
	UnendingWaitError,
	UnsupportedStepTypeError,
	UnsupportedWaitError,
	VmExpressionEngineRequiredError,
} from './errors';
import { isEngineRequest, toActionsDeclaration, toEngineResponse } from './engine-actions';
import { isV1NodeStepConfig } from './guards';
import { fromStepInputs, toStepOutputs } from './io';
import {
	recordSpawnedRun,
	spawnedKind,
	toSpawnedInputItem,
	toSpawnedSource,
} from './spawned-action';
import { SubWorkflowCalls } from './sub-workflow-calls';
import { attachResponseHooks } from './v1-response-hooks';
import type {
	ExecutableNodeType,
	NodeRunResult,
	RunNodeParams,
	V1NodeStepConfig,
	V1StepExecutorDeps,
} from './types';
import type { DurableWaitExecuteContext } from './v1-adapters';
import {
	toAdditionalDataContext,
	toV1ExecuteContext,
	toV1Execution,
	toV1Node,
	toV1Sources,
	toV1Workflow,
} from './v1-adapters';

/**
 * Turns what the node recorded into a wait declaration.
 * v1 resumes a timed wait by marking the node disabled before it re-enters it,
 * and a disabled node does not run: it passes its first input through. So the
 * step emits that input at the deadline, not what the node returned before it
 * paused.
 */
function toStepResult(
	context: DurableWaitExecuteContext,
	nodeResult: INodeExecutionData[][],
): StepExecutionResult {
	// The node declared a sub-execution. Awaited, the node ran to the end on an empty
	// result and runs again once the sub-execution ends. Detached, its outputs stand.
	const { declaration } = context.subWorkflowCalls;
	if (declaration) {
		return declaration.awaited
			? { subExecution: declaration }
			: { subExecution: { ...declaration, outputs: toStepOutputs(nodeResult) } };
	}

	const { waitTill } = context.runExecutionData;
	if (waitTill === undefined) return { outputs: toStepOutputs(nodeResult) };
	if (waitTill.getTime() === WAIT_INDEFINITELY.getTime()) {
		if (!context.acceptsResumeRequest) throw new UnendingWaitError(context.getNode().name);
		return { wait: { resumeBinding: context.resumeBinding } };
	}
	if (waitTill.getTime() === WAIT_FOR_SUB_EXECUTION.getTime()) {
		throw new UnsupportedWaitError(context.getNode().name, 'a sub-execution');
	}
	// `toISOString` throws a bare RangeError on an invalid date.
	if (Number.isNaN(waitTill.getTime())) {
		throw new InvalidWaitDateError(context.getNode().name);
	}

	return {
		wait: {
			resumeAt: waitTill.toISOString(),
			outputsAtDeadline: toStepOutputs([context.getInputData()]),
			...(context.acceptsResumeRequest ? { resumeBinding: context.resumeBinding } : {}),
		},
	};
}

/**
 * Runs `v1-node` and `attached` steps by adapting them to the v1 node runtime.
 *
 * A step is executable when its type is `v1-node`, its config is a valid
 * `V1NodeStepConfig`, and the config names a registered node type with an
 * `execute` method.
 */
export class V1StepExecutor implements IStepExecutor {
	constructor(private readonly deps: V1StepExecutorDeps) {}

	async execute(request: StepExecutionRequest): Promise<StepExecutionResult> {
		this.validateExpressionEngine();
		const stepConfig = this.validateStepConfig(request.node);
		const nodeType = this.resolveNodeType(stepConfig);
		const stepData = await this.deps.loadStepData(request.context);

		const node = toV1Node(request.node, stepConfig);
		// Engine v2 cannot route a chat reply to a step yet. Fail before the node
		// sends the message. The Chat node waits in every version and operation.
		if (node.type === CHAT_NODE_TYPE) {
			throw new UnsupportedWaitError(node.name, 'an approval');
		}

		const execution = toV1Execution(
			stepData.graph,
			stepData.outputsByNode,
			request.node.id,
			request.context.iteration,
		);

		// A spawned step runs one action. Its input is the declaring step's item
		// plus the action's arguments, and it reads as a run under the node its
		// target attaches to, as in v1.
		const { spawnedAction } = request;
		let source: Array<ISourceData | null> = toV1Sources(stepData.graph).get(node.id) ?? [];
		let itemsByConnection = fromStepInputs(request.inputs);
		if (spawnedAction) {
			const spawnedSource = toSpawnedSource(
				spawnedAction,
				stepData.graph,
				request.context.iteration,
			);
			source = spawnedSource;
			itemsByConnection = [[toSpawnedInputItem(spawnedAction, stepData.graph)]];
			node.rewireOutputLogTo = spawnedKind(spawnedAction);
			recordSpawnedRun(
				execution.runData,
				node.name,
				spawnedAction,
				spawnedSource,
				request.context.iteration,
			);
		}

		const workflow = toV1Workflow(request.context.workflowId, node, execution, this.deps.nodeTypes);

		const additionalData = await this.deps.additionalDataFactory(
			toAdditionalDataContext(request.context),
		);
		attachResponseHooks(additionalData, request);

		const context = toV1ExecuteContext({
			node,
			workflow,
			execution,
			source,
			additionalData,
			stepContext: request.context,
			itemsByConnection,
			resumeToken: this.deps.resumeToken?.({ executionId: request.context.executionId }),
			subWorkflowCalls: new SubWorkflowCalls(node, request.context, this.deps.resolveSubWorkflow),
			subExecutionResume: request.resume,
			resumeMinters: {
				stepBoundResumeToken: this.deps.stepBoundResumeToken,
				approvalCallback: this.deps.approvalCallback,
			},
			subNodeExecutionResults: request.continuation
				? toEngineResponse(request.continuation, stepData.graph)
				: undefined,
		});

		const declaresActions = (request.node.actionTargetKinds?.length ?? 0) > 0;
		return await workflow.expression.withIsolate(async () => {
			const nodeResult = await this.runNode({ nodeType, context, declaresActions });
			if (isEngineRequest(nodeResult)) {
				return { actions: toActionsDeclaration(nodeResult, stepData.graph) };
			}
			return toStepResult(context, nodeResult);
		});
	}

	private validateExpressionEngine(): void {
		// Any isolated engine works here — v1 steps only need the pooled
		// evaluator that initExpressionEngine() sets up; 'legacy' has none.
		if (Expression.getActiveImplementation() === 'legacy') {
			throw new VmExpressionEngineRequiredError();
		}
	}

	private validateStepConfig({ type, name, config }: GraphNode): V1NodeStepConfig {
		// An attached node runs as a v1 node when an action targets it.
		if (type !== 'v1-node' && type !== 'attached') throw new UnsupportedStepTypeError(type);
		if (!isV1NodeStepConfig(config)) throw new MalformedStepConfigError(name);

		return config;
	}

	private resolveNodeType({
		nodeType: typeName,
		typeVersion,
	}: V1NodeStepConfig): ExecutableNodeType {
		const nodeType = this.deps.nodeTypes.getByNameAndVersion(typeName, typeVersion);

		if (!nodeType) {
			const [packageName, name = typeName] = typeName.split('.');
			throw new UnrecognizedNodeTypeError(packageName, name);
		}

		if (typeof nodeType.execute !== 'function') throw new UnsupportedNodeTypeError(typeName);

		return nodeType as ExecutableNodeType;
	}

	/**
	 * Runs the node and settles its cleanup functions.
	 *
	 * Cleanup errors propagate only when the node itself succeeded. A node
	 * failure with `continueOnFail` passes the input items through as output.
	 * A null result yields no output. An `EngineRequest` passes through only for
	 * a node that may declare actions; continueOnFail does not hide a refusal.
	 */
	private async runNode({
		nodeType,
		context,
		declaresActions,
	}: RunNodeParams): Promise<INodeExecutionData[][] | EngineRequest> {
		const response = context.subNodeExecutionResults;
		let result: NodeRunResult;
		try {
			const value = isNodeClassInstance(nodeType)
				? await nodeType.execute(context, response)
				: await nodeType.execute.call(context, response);
			result = { ok: true, value };
		} catch (error) {
			result = { ok: false, error };
		}

		const { closeFunctions } = context;
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
								extra: { nodeName: context.getNode().name },
							});
				}
			}
		}

		if (!result.ok) {
			const description = this.describeNodeError(result.error);
			try {
				await context.sendChunk('error', 0, description);
			} catch {
				// The node's own error is the one to report. The response channel
				// already tells the caller when it cannot carry the error chunk.
			}
			// The node failed, so do not start a sub-execution it may have declared
			// before failing. This holds for continueOnFail too.
			context.subWorkflowCalls.declaration = undefined;
			// SPIKE: v1 turns the error of a tool with continueOnFail into an
			// `{ error }` item. Here the tool passes its merged input through.
			if (!context.continueOnFail()) throw result.error;
			return [context.getInputData()];
		}

		if (result.value === null || result.value === undefined) return [];

		if (Array.isArray(result.value)) return result.value as INodeExecutionData[][];

		if (declaresActions && isEngineRequest(result.value)) return result.value;

		throw new EngineRequestNotSupportedError(context.getNode().type);
	}

	/**
	 * The text of the error chunk for a failed node. Only a node error's
	 * `description` goes to the caller, as in v1. The `message` can hold
	 * request details, so it stays in the logs and the execution data.
	 * Without a description, the caller gets a generic text, so the chunk
	 * always has content.
	 */
	private describeNodeError(error: unknown): string {
		if (
			typeof error === 'object' &&
			error !== null &&
			'description' in error &&
			typeof error.description === 'string' &&
			error.description !== ''
		) {
			return error.description;
		}

		return 'Node execution failed';
	}
}
