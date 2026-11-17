import { startPreparedWorkflow } from 'n8n/dist/testing.js';
import type { INode, IRun } from 'n8n-workflow';
import {
	createRunExecutionData,
	deepCopy,
	getLastExecutedNodeData,
	NodeHelpers,
	Workflow,
} from 'n8n-workflow';

import { createAdditionalData } from './engine/additional-data';
import { createHooks } from './engine/hooks';
import { checkNodeTypesInstalled } from './engine/node-type-check';
import { nodeTypes } from './engine/node-types';
import { toWorkflowData } from './engine/workflow-data';
import { WorkflowTestError } from './errors';
import { guardNetwork } from './http/network-guard';
import { withClockAndEnv } from './instance-state/clock-and-env';
import { checkCredentialTypes } from './instance-state/credentials';
import type {
	ExecuteWorkflowOptions,
	ExecutionContext,
	ExecutionSetup,
	NodeRunLog,
} from './execution-context';
import { WorkflowTestResult } from './result';
import { captureWebhookResponse } from './runtime/webhook-response';
import { SubWorkflowState } from './sub-workflows/execution';
import type { WorkflowHandle } from './workflow-set';

let executing = false;

export async function executeWorkflow(
	handle: WorkflowHandle,
	options: ExecuteWorkflowOptions = {},
): Promise<WorkflowTestResult> {
	if (executing) {
		throw new WorkflowTestError(
			'EXECUTION_IN_PROGRESS',
			'Another execution is in progress. Await each executeWorkflow call before you start the next.',
			{ workflow: handle.name },
		);
	}

	executing = true;
	try {
		const subWorkflows: SubWorkflowState = new SubWorkflowState({
			createContext: (child, executionId) =>
				createExecutionContext(
					child,
					{ ...options, staticData: undefined },
					subWorkflows,
					executionId,
				),
			toFailure: (child, run) => child.fatalError ?? toNodeFailure(child, run),
		});
		const context = createExecutionContext(
			handle,
			options,
			subWorkflows,
			subWorkflows.nextExecutionId(),
		);
		const run = await guardNetwork(context, async () => await runEngine(context));
		return toResult(context, run);
	} finally {
		executing = false;
	}
}

function createExecutionContext(
	handle: WorkflowHandle,
	options: ExecuteWorkflowOptions,
	subWorkflows: SubWorkflowState,
	executionId: string,
): ExecutionContext {
	if (handle.definition.settings?.engineType === 'v2') {
		throw new WorkflowTestError(
			'INVALID_WORKFLOW',
			'Engine v2 workflows require an n8n instance.',
			{
				workflow: handle.name,
			},
		);
	}
	checkNodeTypesInstalled(handle);
	const workflowData = toWorkflowData(handle.definition);
	const workflow = new Workflow({
		...workflowData,
		nodeTypes,
		staticData: deepCopy(options.staticData ?? {}),
	});
	const runs: NodeRunLog = { open: [], completed: new Map() };
	const setup: ExecutionSetup = {
		executionId,
		options,
		set: handle.set,
		handle,
		workflowData,
		workflow,
		runs,
		hooks: createHooks(executionId, workflowData, runs),
		redactions: subWorkflows.redactions,
		subWorkflows,
	};
	return Object.assign(setup, { additionalData: createAdditionalData(setup) });
}

async function runEngine(context: ExecutionContext): Promise<IRun> {
	checkCredentialTypes(context);
	const { input = {} } = context.options;
	const items = (Array.isArray(input) ? input : [input]).map((json) => ({ json: deepCopy(json) }));
	const trigger = selectTrigger(context);
	context.hooks.addHandler('workflowExecuteBefore', () => captureWebhookResponse(context, trigger));
	const runExecutionData = createRunExecutionData({
		executionData: {
			nodeExecutionStack: [{ node: trigger, data: { main: [items] }, source: null }],
		},
	});
	return await withClockAndEnv(context.options, async () => {
		const { execution } = await startPreparedWorkflow({
			workflow: context.workflow,
			additionalData: context.additionalData,
			runExecutionData,
			mode: 'trigger',
		});
		const run = await execution;
		await context.subWorkflows.settle(context);
		return run;
	});
}

function selectTrigger({ workflow, handle, options }: ExecutionContext): INode {
	const triggers = Object.values(workflow.nodes).filter(
		(node) =>
			!node.disabled &&
			NodeHelpers.isTriggerNode(
				workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description,
			),
	);
	const names = triggers.map((node) => node.name).join(', ');

	if (options.trigger !== undefined) {
		const { workflow: owner, name } =
			typeof options.trigger === 'string'
				? { workflow: handle, name: options.trigger }
				: options.trigger;
		if (owner !== handle) {
			throw triggerError(
				handle,
				`Node "${name}" belongs to workflow "${owner.name}", not to "${handle.name}"`,
			);
		}
		const trigger = triggers.find((node) => node.name === name);
		if (trigger) return trigger;
		throw triggerError(handle, `Node "${name}" is not an active trigger. Triggers: ${names}`);
	}

	if (triggers.length === 1) return triggers[0];
	if (triggers.length === 0) throw triggerError(handle, 'The workflow has no active trigger');
	throw triggerError(
		handle,
		`The workflow has more than one trigger: ${names}. Select one with the trigger option`,
	);
}

function triggerError(handle: WorkflowHandle, message: string) {
	return new WorkflowTestError('TRIGGER_NOT_FOUND', `${message}.`, { workflow: handle.name });
}

function toResult(context: ExecutionContext, run: IRun): WorkflowTestResult {
	const result = new WorkflowTestResult(context, run);
	const error = context.fatalError ?? toNodeFailure(context, run);
	if (!error) return result;
	error.result = result;
	throw error;
}

function toNodeFailure(context: ExecutionContext, run: IRun): WorkflowTestError | undefined {
	const { error } = run.data.resultData;
	if (!error) return undefined;
	const node = ('node' in error ? error.node?.name : undefined) ?? failedNode(run);
	if (node && continuesOnError(context.workflow.getNode(node))) return undefined;
	const subWorkflowFailure = context.subWorkflows.failedCall(context, node);
	if (subWorkflowFailure) return subWorkflowFailure;
	const where = node ? `Node "${node}"` : `Workflow "${context.handle.name}"`;
	return new WorkflowTestError('NODE_FAILED', `${where} failed: ${error.message}`, {
		workflow: context.handle.name,
		node,
	});
}

function failedNode(run: IRun): string | undefined {
	return getLastExecutedNodeData(run)?.error ? run.data.resultData.lastNodeExecuted : undefined;
}

// The engine marks the run as failed when the last node to run failed and continued.
function continuesOnError(node: INode | null) {
	return node?.continueOnFail === true || node?.onError?.startsWith('continue') === true;
}
