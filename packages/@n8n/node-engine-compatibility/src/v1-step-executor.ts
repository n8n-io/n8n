import type {
	GraphNode,
	IStepExecutor,
	StepExecutionRequest,
	StepExecutionResult,
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
import { attachResponseHooks } from './v1-response-hooks';
import type {
	ExecutableNodeType,
	NodeExecutionTraceContext,
	NodeRunResult,
	RunNodeParams,
	V1NodeStepConfig,
	V1StepExecutorDeps,
	V1StepExecutorInstrumentation,
	V1StepExecutorMeasurement,
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
 * Turns what the node recorded in `putExecutionToWait` into a wait declaration.
 * v1 resumes a timed wait by marking the node disabled before it re-enters it,
 * and a disabled node does not run: it passes its first input through. So the
 * step emits that input at the deadline, not what the node returned before it
 * paused.
 *
 * A sentinel wait fails the step. Engine v2 has no resume route and no
 * sub-workflow steps yet. A declaration replaces each failure when its path
 * exists.
 */
function toStepResult(
	context: DurableWaitExecuteContext,
	nodeResult: INodeExecutionData[][],
): StepExecutionResult {
	const { waitTill } = context.runExecutionData;
	if (waitTill === undefined) return { outputs: toStepOutputs(nodeResult) };
	if (waitTill.getTime() === WAIT_INDEFINITELY.getTime()) {
		throw new UnsupportedWaitError(context.getNode().name, 'a resume request');
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
		this.validateExpressionEngine(request.node);
		const stepConfig = this.validateStepConfig(request.node);
		const nodeType = this.resolveNodeType(stepConfig);
		if (this.deps.instrumentation) {
			return await this.executeInstrumented(
				request,
				stepConfig,
				nodeType,
				this.deps.instrumentation,
			);
		}
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
		attachResponseHooks(additionalData, request);

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
			const nodeResult = await this.runNode({ nodeType, context }, request);
			return toStepResult(context, nodeResult);
		});
	}

	private async executeInstrumented(
		request: StepExecutionRequest,
		stepConfig: V1NodeStepConfig,
		nodeType: ExecutableNodeType,
		hooks: V1StepExecutorInstrumentation,
	): Promise<StepExecutionResult> {
		const metadata: NodeExecutionTraceContext = {
			executionId: request.context.executionId,
			stepId: request.context.stepId,
			workflowId: request.context.workflowId,
			iteration: request.context.iteration,
			nodeId: request.node.id,
			nodeType: stepConfig.nodeType,
		};
		const stepData = await hooks.run(
			'load-data',
			metadata,
			async () => await this.deps.loadStepData(request.context),
		);
		const { node, execution, workflow } = hooks.runSync('adapter-setup', metadata, () => {
			const node = toV1Node(request.node, stepConfig);
			const execution = toV1Execution(
				stepData.graph,
				stepData.outputsByNode,
				request.node.id,
				request.context.iteration,
			);
			const workflow = toV1Workflow(
				request.context.workflowId,
				node,
				execution,
				this.deps.nodeTypes,
			);
			return { node, execution, workflow };
		});
		const additionalData = await hooks.run(
			'additional-data',
			metadata,
			async () => await this.deps.additionalDataFactory(toAdditionalDataContext(request.context)),
		);
		const context = hooks.runSync('context-setup', metadata, () => {
			attachResponseHooks(additionalData, request);
			return toV1ExecuteContext({
				node,
				workflow,
				execution,
				source: toV1Sources(stepData.graph).get(node.id) ?? [],
				additionalData,
				stepContext: request.context,
				itemsByConnection: fromStepInputs(request.inputs),
			});
		});

		// Entry stops before the callback. Neither token makes itself the body's parent.
		let entering: V1StepExecutorMeasurement | undefined = hooks.start('isolate-enter', metadata);
		let exiting: V1StepExecutorMeasurement | undefined;
		let callbackFailed = false;
		let callbackError: unknown;
		try {
			return await workflow.expression.withIsolate(async () => {
				entering?.end();
				entering = undefined;
				try {
					const nodeResult = await this.runNode({ nodeType, context }, request, {
						hooks,
						metadata,
					});
					return hooks.runSync('result-conversion', metadata, () =>
						toStepResult(context, nodeResult),
					);
				} catch (error) {
					callbackFailed = true;
					callbackError = error;
					throw error;
				} finally {
					exiting = hooks.start('isolate-exit', metadata);
				}
			});
		} catch (error) {
			if (entering) entering.fail();
			else if (!callbackFailed || error !== callbackError) exiting?.fail();
			throw error;
		} finally {
			entering?.end();
			exiting?.end();
		}
	}

	private validateExpressionEngine(node: GraphNode): void {
		if (Expression.getActiveImplementation() !== 'legacy') return;
		const config = node.config;
		if (
			this.deps.allowLegacyNoopBenchmark === true &&
			node.type === 'v1-node' &&
			isV1NodeStepConfig(config) &&
			config.nodeType === 'n8n-nodes-base.noOp' &&
			config.typeVersion === 1 &&
			// The CP adds the NoOp's hidden default when it prepares the graph.
			Object.entries(config.parameters).every(
				([name, value]) => name === 'emptyGroupAnchor' && value === false,
			) &&
			config.credentials === undefined &&
			!config.continueOnFail
		)
			return;
		throw new VmExpressionEngineRequiredError();
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
	private async runNode(
		{ nodeType, context }: RunNodeParams,
		request: StepExecutionRequest,
		measurement?: { hooks: V1StepExecutorInstrumentation; metadata: NodeExecutionTraceContext },
	): Promise<INodeExecutionData[][]> {
		let result: NodeRunResult;
		try {
			const value = this.deps.traceNodeExecution
				? await this.deps.traceNodeExecution(
						{
							executionId: request.context.executionId,
							stepId: request.context.stepId,
							workflowId: request.context.workflowId,
							iteration: request.context.iteration,
							nodeId: request.node.id,
							nodeType: context.getNode().type,
						},
						async () =>
							isNodeClassInstance(nodeType)
								? await nodeType.execute(context)
								: await nodeType.execute.call(context),
					)
				: isNodeClassInstance(nodeType)
					? await nodeType.execute(context)
					: await nodeType.execute.call(context);
			result = { ok: true, value };
		} catch (error) {
			result = { ok: false, error };
		}

		const { closeFunctions } = context;
		if (closeFunctions.length > 0 && measurement) {
			await measurement.hooks.run('cleanup', measurement.metadata, async () => {
				const closeResults = await Promise.allSettled(closeFunctions.map(async (fn) => await fn()));
				if (result.ok) {
					const rejected = closeResults.find(
						(closeResult): closeResult is PromiseRejectedResult =>
							closeResult.status === 'rejected',
					);
					if (rejected) {
						throw rejected.reason instanceof Error
							? rejected.reason
							: new UnexpectedError("Error on node's close function", {
									extra: { nodeName: context.getNode().name },
								});
					}
				}
			});
		} else if (closeFunctions.length > 0) {
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
			if (!context.continueOnFail()) throw result.error;
			return [context.getInputData()];
		}

		if (result.value === null || result.value === undefined) return [];

		if (Array.isArray(result.value)) return result.value as INodeExecutionData[][];

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
