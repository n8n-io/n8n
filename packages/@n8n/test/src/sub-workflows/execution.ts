import { UnexpectedError } from '@n8n/errors';
import {
	inheritSubWorkflowContext,
	resolveSubWorkflowOutput,
	startPreparedWorkflow,
} from 'n8n/dist/testing.js';
import type {
	ExecuteWorkflowData,
	ExecuteWorkflowOptions,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
	IRun,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import {
	createRunExecutionData,
	EXECUTE_WORKFLOW_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	getSubWorkflowOutputPolicy,
	MANUAL_TRIGGER_NODE_TYPE,
	NodeOperationError,
} from 'n8n-workflow';

import { WorkflowTestError } from '../errors';
import type { Redaction } from '../http/redact';
import { failExecution, type ExecutionContext, type ExecutionSetup } from '../execution-context';
import { WorkflowTestResult, type NodeResult } from '../result';
import { WorkflowHandle, type NodeReference } from '../workflow-set';
import { missingChildMessage, subWorkflowCall } from './contract';

export interface CalledBy {
	workflow: string;
	node: string;
}

export interface ChildRunner {
	createContext(handle: WorkflowHandle, executionId: string): ExecutionContext;
	toFailure(context: ExecutionContext, run: IRun): WorkflowTestError | undefined;
}

type CallerOutput = ExecuteWorkflowData['data'];

type ChildOutcome = { output: CallerOutput } | { failure: WorkflowTestError; fatal: boolean };

export class SubWorkflowRun {
	constructor(
		readonly workflow: string,
		readonly calledBy: CalledBy,
		private readonly result: WorkflowTestResult,
	) {}

	node(node: string | NodeReference): NodeResult {
		return this.result.node(node);
	}

	get output() {
		return this.result.output;
	}
}

export class SubWorkflowState {
	readonly runs: SubWorkflowRun[] = [];

	readonly redactions: Redaction[] = [];

	readonly executionData = new Map<string, IRunExecutionData>();

	private readonly active: ExecutionSetup[] = [];

	private executionCount = 0;

	private readonly detached: Array<Promise<void>> = [];

	private detachedFailure?: Error;

	private readonly failedCalls = new Map<string, WorkflowTestError>();

	constructor(readonly runner: ChildRunner) {}

	nextExecutionId() {
		this.executionCount += 1;
		return `test-execution-${this.executionCount}`;
	}

	detach(execution: Promise<ChildOutcome>) {
		this.detached.push(
			execution.then(
				(outcome) => {
					if ('failure' in outcome) this.detachedFailure ??= outcome.failure;
				},
				(error: unknown) => {
					this.detachedFailure ??=
						error instanceof Error
							? error
							: new UnexpectedError('A sub-workflow failed with no error');
				},
			),
		);
	}

	running(root: ExecutionSetup): ExecutionSetup {
		return this.active.at(-1) ?? root;
	}

	async runInside<T>(context: ExecutionSetup, run: () => Promise<T>): Promise<T> {
		this.active.push(context);
		try {
			return await run();
		} finally {
			this.active.splice(this.active.lastIndexOf(context), 1);
		}
	}

	recordFailedCall(caller: ExecutionSetup, node: string, failure: WorkflowTestError) {
		this.failedCalls.set(`${caller.executionId}/${node}`, failure);
	}

	failedCall(caller: ExecutionSetup, node: string | undefined) {
		return node === undefined ? undefined : this.failedCalls.get(`${caller.executionId}/${node}`);
	}

	async settle(root: ExecutionSetup) {
		while (this.detached.length > 0) await Promise.all(this.detached.splice(0));
		if (this.detachedFailure === undefined) return;
		if (!(this.detachedFailure instanceof WorkflowTestError)) throw this.detachedFailure;
		root.fatalError ??= this.detachedFailure;
	}
}

export async function executeSubWorkflow(
	context: ExecutionSetup,
	info: IExecuteWorkflowInfo,
	options: ExecuteWorkflowOptions,
	parentData: IWorkflowExecuteAdditionalData,
): Promise<ExecuteWorkflowData> {
	const { node } = options;
	if (!node) throw new UnexpectedError('The engine called a sub-workflow without the calling node');

	const child = resolveChild(context, info, node);
	const executionId = context.subWorkflows.nextExecutionId();
	const items = options.inputData ?? [{ json: {} }];
	const execution = runChild(context, node, child, executionId, items, options, parentData);

	if (options.doNotWaitToFinish) {
		context.subWorkflows.detach(execution);
		return { executionId, data: [null] };
	}
	const outcome = await execution;
	if ('failure' in outcome) failCall(context, node, outcome);
	return { executionId, data: outcome.output };
}

function failCall(
	context: ExecutionSetup,
	node: INode,
	{ failure, fatal }: { failure: WorkflowTestError; fatal: boolean },
): never {
	if (fatal) failExecution(context, failure);
	context.subWorkflows.recordFailedCall(context, node.name, failure);
	throw new NodeOperationError(node, failure);
}

export function refuseUnsupportedSource(context: ExecutionSetup, node: INode) {
	const { source } = node.parameters;
	if (node.type !== EXECUTE_WORKFLOW_NODE_TYPE) return;
	if (source !== 'localFile' && source !== 'url') return;
	failExecution(
		context,
		new WorkflowTestError(
			'SUB_WORKFLOW_SOURCE_NOT_SUPPORTED',
			`Node "${node.name}" loads its sub-workflow from the source "${source}". Use the source "database" or "parameter", or mock the node with mockNode().`,
			{ workflow: context.handle.name, node: node.name },
		),
	);
}

function resolveChild(context: ExecutionSetup, info: IExecuteWorkflowInfo, node: INode) {
	if (info.id === undefined) return inlineChild(context, info, node);

	const child = context.set.workflows.find((workflow) => workflow.id === info.id);
	const call = { ...subWorkflowCall(node), node, childId: info.id };
	const parent = context.handle.name;
	if (!child) {
		const names = context.set.workflows.map((workflow) => workflow.name);
		return failExecution(
			context,
			new WorkflowTestError('SUB_WORKFLOW_NOT_IN_SET', missingChildMessage(parent, call, names), {
				workflow: parent,
				node: node.name,
			}),
		);
	}
	return child;
}

function inlineChild(context: ExecutionSetup, info: IExecuteWorkflowInfo, node: INode) {
	if (!info.code) throw new UnexpectedError('The sub-workflow call has neither an ID nor code');
	const { code } = info;
	return new WorkflowHandle(
		{
			...code,
			id: context.handle.id,
			name: code.name || `${node.name} (inline)`,
			settings: { ...(code.settings ?? context.workflowData.settings) },
		},
		context.set,
	);
}

async function runChild(
	parent: ExecutionSetup,
	node: INode,
	child: WorkflowHandle,
	executionId: string,
	items: INodeExecutionData[],
	options: ExecuteWorkflowOptions,
	parentData: IWorkflowExecuteAdditionalData,
): Promise<ChildOutcome> {
	const { runner, runs } = parent.subWorkflows;
	const { context, start } = prepareChild(parent, child, executionId);
	inheritSubWorkflowContext(context.additionalData, parentData, options);
	const run = await parent.subWorkflows.runInside(
		context,
		async () => await runFromTrigger(context, start, items, options),
	);
	parent.subWorkflows.executionData.set(executionId, run.data);
	const calledBy = { workflow: parent.handle.name, node: node.name };
	runs.push(new SubWorkflowRun(child.name, calledBy, new WorkflowTestResult(context, run)));

	const failure = runner.toFailure(context, run);
	if (failure) return { failure, fatal: context.fatalError !== undefined };
	return {
		output: await resolveSubWorkflowOutput(
			run,
			context.workflow,
			options.returnLastRunOnly ?? false,
		),
	};
}

function prepareChild(parent: ExecutionSetup, child: WorkflowHandle, executionId: string) {
	try {
		const context = parent.subWorkflows.runner.createContext(child, executionId);
		return { context, start: findStart(context) };
	} catch (error) {
		if (error instanceof WorkflowTestError) failExecution(parent, error);
		throw error;
	}
}

async function runFromTrigger(
	context: ExecutionContext,
	start: INode,
	items: INodeExecutionData[],
	options: ExecuteWorkflowOptions,
) {
	const runExecutionData = createRunExecutionData({
		subWorkflowOutput: getSubWorkflowOutputPolicy(
			Object.values(context.workflow.nodes),
			options.returnLastRunOnly ?? false,
		),
		executionData: {
			nodeExecutionStack: [{ node: start, data: { main: [items] }, source: null }],
		},
	});
	const { execution } = await startPreparedWorkflow({
		workflow: context.workflow,
		additionalData: context.additionalData,
		mode: 'integrated',
		runExecutionData,
	});
	return await execution;
}

function findStart({ workflow, handle }: ExecutionContext): INode {
	const nodes = Object.values(workflow.nodes).filter((node) => !node.disabled);
	const start =
		nodes.find((node) => node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE) ??
		nodes.find((node) => node.type === MANUAL_TRIGGER_NODE_TYPE);
	if (start) return start;
	throw new WorkflowTestError(
		'INVALID_WORKFLOW',
		`Workflow "${handle.name}" has no Execute Workflow Trigger, so a sub-workflow call cannot start it.`,
		{ workflow: handle.name },
	);
}
