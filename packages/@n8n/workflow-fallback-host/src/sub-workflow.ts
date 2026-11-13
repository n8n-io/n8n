/**
 * Runs a sub-workflow for a node in the fallback host, such as a workflow tool
 * (`toolWorkflow`) of an AI agent.
 *
 * The callee runs on n8n's v1 engine (`WorkflowExecute` of n8n-core) inside
 * the host process, not as compiled code. The converter embeds the callee
 * workflow JSON in the tool parameters (`source: 'parameter'`), so the host
 * gets it as `workflowInfo.code`. The callee nodes name credential slots,
 * which the credentials helper of the step reads.
 *
 * The result is the data of the last node that ran, as n8n's `executeWorkflow`
 * gives it.
 */
import { ExecutionLifecycleHooks, WorkflowExecute } from 'n8n-core';
import type {
	ExecuteWorkflowData,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
	IRun,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createRunExecutionData, Workflow } from 'n8n-workflow';

import type { HostNodeTypes } from './node-types';

/** The deepest chain of sub-workflow calls. */
const MAX_DEPTH = 10;

const START_TYPES = [
	'n8n-nodes-base.executeWorkflowTrigger',
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.start',
];

export class SubWorkflowError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SubWorkflowError';
	}
}

function isWorkflowBase(value: unknown): value is IWorkflowBase {
	return (
		typeof value === 'object' &&
		value !== null &&
		Array.isArray(Reflect.get(value, 'nodes')) &&
		typeof Reflect.get(value, 'connections') === 'object'
	);
}

/** The start node of a callee, as `findSubworkflowStart` of n8n's CLI picks it. */
function startNode(nodes: INode[]): INode {
	for (const type of START_TYPES) {
		const found = nodes.find((n) => n.type === type && n.disabled !== true);
		if (found) return found;
	}
	throw new SubWorkflowError(
		'Missing node to start execution: the called workflow needs an Execute Workflow Trigger node',
	);
}

/** The items of the last node that ran, with every run when the trigger asks for it. */
function resultOf(run: IRun, callee: IWorkflowBase): INodeExecutionData[][] {
	const result = run.data.resultData;
	if (result.error) throw new SubWorkflowError(result.error.message);
	const last = result.lastNodeExecuted;
	const runs = last ? (result.runData[last] ?? []) : [];
	const trigger = callee.nodes.find((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
	const allRuns =
		(trigger?.typeVersion ?? 1) >= 1.2 || trigger?.parameters?.returnOutput === 'allRuns';
	const picked = allRuns ? runs : runs.slice(-1);
	const data: INodeExecutionData[][] = [];
	for (const task of picked) {
		(task.data?.main ?? []).forEach((list, k) => {
			data[k] = [...(data[k] ?? []), ...(list ?? [])];
		});
	}
	return data;
}

export interface SubWorkflowDeps {
	nodeTypes: HostNodeTypes;
	/** The additional data of a callee run: the same helpers as the caller. */
	additionalData: (executionId: string) => IWorkflowExecuteAdditionalData;
}

let runs = 0;

/** Makes the `executeWorkflow` of `additionalData`. */
export function subWorkflowRunner(deps: SubWorkflowDeps, depth = 0) {
	return async (
		info: IExecuteWorkflowInfo,
		_caller: IWorkflowExecuteAdditionalData,
		options: { inputData?: INodeExecutionData[] },
	): Promise<ExecuteWorkflowData> => {
		if (depth >= MAX_DEPTH) throw new SubWorkflowError('Sub-workflow calls are too deep');
		const callee: unknown = info.code;
		if (!isWorkflowBase(callee)) {
			throw new SubWorkflowError(
				`The fallback host has no JSON for workflow "${info.id ?? '?'}". The converter embeds it in the node.`,
			);
		}
		const executionId = `sub-${++runs}`;
		const workflow = new Workflow({
			id: callee.id ?? executionId,
			name: callee.name,
			nodes: callee.nodes,
			connections: callee.connections,
			active: false,
			nodeTypes: deps.nodeTypes,
			settings: { ...(callee.settings ?? {}), executionOrder: 'v1' },
			staticData: callee.staticData,
		});
		const start = startNode(callee.nodes);
		const hooks = new ExecutionLifecycleHooks('integrated', executionId, callee);
		const additionalData: IWorkflowExecuteAdditionalData = {
			...deps.additionalData(executionId),
			hooks,
			executeWorkflow: subWorkflowRunner(deps, depth + 1),
		};
		const runExecutionData = createRunExecutionData({
			executionData: {
				nodeExecutionStack: [
					{
						node: start,
						data: { main: [options.inputData ?? [{ json: {} }]] },
						source: null,
					},
				],
			},
		});
		const run = await new WorkflowExecute(
			additionalData,
			'integrated',
			runExecutionData,
		).processRunExecutionData(workflow);
		return { executionId, data: resultOf(run, callee) };
	};
}
