import type {
	GraphNode,
	IStepExecutor,
	StepExecutionRequest,
	StepExecutionResult,
	StepSlots,
} from '@n8n/engine';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import type { INodeExecutionData } from 'n8n-workflow';
import {
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
	UnsupportedStepTypeError,
	UnsupportedWaitError,
	VmExpressionEngineRequiredError,
} from './errors';
import { isV1NodeStepConfig } from './guards';
import { fromStepInputs, toStepOutputs } from './io';
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
 * A v1 node asks to pause through `putExecutionToWait`, and the context records
 * the date and whether a request may end the wait. A finite date becomes a
 * deadline declaration. v1 resumes a timed wait by disabling the node and
 * running it again, and a disabled node passes its first input through, so that
 * input, not the value the node returned before pausing, is what the step emits
 * at the deadline.
 *
 * A sentinel means no deadline ends the wait. `WAIT_INDEFINITELY` waits for a
 * resume request, which nothing can deliver yet: the data plane has no resolve
 * endpoint and the control plane no resume route. `WAIT_FOR_SUB_EXECUTION`
 * waits for a child execution, and sub-workflow steps do not exist yet. Either
 * step fails rather than complete as if the wait had ended; each turns into a
 * declaration when its path lands.
 */
function toStepResult(context: DurableWaitExecuteContext, outputs: StepSlots): StepExecutionResult {
	const { waitTill } = context.runExecutionData;
	if (waitTill === undefined) return { outputs };
	if (waitTill.getTime() === WAIT_INDEFINITELY.getTime()) {
		throw new UnsupportedWaitError('a resume request');
	}
	if (waitTill.getTime() === WAIT_FOR_SUB_EXECUTION.getTime()) {
		throw new UnsupportedWaitError('a sub-execution');
	}
	// `toISOString` throws a bare RangeError on an invalid date.
	if (Number.isNaN(waitTill.getTime())) {
		throw new InvalidWaitDateError(context.getNode().name);
	}

	return {
		wait: {
			resumeAt: waitTill.toISOString(),
			outputsAtDeadline: toStepOutputs([context.getInputData()]),
			acceptsResumeRequest: context.acceptsResumeRequest,
		},
	};
}

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
		this.validateExpressionEngine();
		const stepConfig = this.validateStepConfig(request.node);
		const nodeType = this.resolveNodeType(stepConfig);
		const stepData = await this.deps.loadStepData(request.context);

		const node = toV1Node(request.node, stepConfig);
		const execution = toV1Execution(
			stepData.graph,
			stepData.outputsByNode,
			request.node.id,
			request.context.iteration,
		);
		const workflow = toV1Workflow(request.context.workflowId, node, execution, this.deps.nodeTypes);

		const additionalData = await this.deps.additionalDataFactory(
			toAdditionalDataContext(request.context),
		);

		const context = toV1ExecuteContext({
			node,
			workflow,
			execution,
			source: toV1Sources(stepData.graph).get(node.id) ?? [],
			additionalData,
			stepContext: request.context,
			itemsByConnection: fromStepInputs(request.inputs),
		});

		return await workflow.expression.withIsolate(async () => {
			const nodeResult = await this.runNode({ nodeType, context });
			return toStepResult(context, toStepOutputs(nodeResult));
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
		if (type !== 'v1-node') throw new UnsupportedStepTypeError(type);
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
	 * A null result yields no output.
	 */
	private async runNode({ nodeType, context }: RunNodeParams): Promise<INodeExecutionData[][]> {
		let result: NodeRunResult;
		try {
			const value = isNodeClassInstance(nodeType)
				? await nodeType.execute(context)
				: await nodeType.execute.call(context);
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
			if (!context.continueOnFail()) throw result.error;
			return [context.getInputData()];
		}

		if (result.value === null || result.value === undefined) return [];

		if (Array.isArray(result.value)) return result.value as INodeExecutionData[][];

		throw new EngineRequestNotSupportedError(context.getNode().type);
	}
}
