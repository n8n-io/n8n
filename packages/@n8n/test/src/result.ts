import type { IDataObject, INodeExecutionData, IRun, ITaskData, Workflow } from 'n8n-workflow';
import { deepCopy, NodeConnectionTypes } from 'n8n-workflow';

import { WorkflowTestError } from './errors';
import type { CompletedNodeRun, ExecutionContext, NodeRunRecord } from './execution-context';
import { toWebhookResponse } from './runtime/webhook-response';
import type { SubWorkflowRun } from './sub-workflows/execution';
import type { NodeReference } from './workflow-set';

export interface NodeRunError {
	message: string;
}

export interface NodeRun extends NodeRunRecord {
	input: IDataObject[];
	output: IDataObject[];
	outputs: IDataObject[][];
	error?: NodeRunError;
}

export class NodeResult {
	constructor(
		readonly name: string,
		readonly runs: NodeRun[],
	) {}

	get input() {
		return this.onlyRun().input;
	}

	get output() {
		return this.onlyRun().output;
	}

	get outputs() {
		return this.onlyRun().outputs;
	}

	get parameters() {
		return this.onlyRun().parameters;
	}

	get requests() {
		return this.onlyRun().requests;
	}

	get error() {
		return this.onlyRun().error;
	}

	private onlyRun(): NodeRun {
		if (this.runs.length === 1) return this.runs[0];
		const reason =
			this.runs.length === 0 ? 'did not run' : `ran ${this.runs.length} times. Read its runs`;
		throw new WorkflowTestError('NODE_RUN_COUNT', `Node "${this.name}" ${reason}.`, {
			node: this.name,
		});
	}
}

export class WorkflowTestResult {
	readonly staticData: IDataObject;

	readonly customData: Record<string, string>;

	constructor(
		private readonly context: ExecutionContext,
		private readonly run: IRun,
	) {
		this.staticData = deepCopy(context.workflow.staticData);
		this.customData = { ...run.data.resultData.metadata };
	}

	get response() {
		return toWebhookResponse(this.context, this.run);
	}

	get output(): IDataObject[] {
		const endNodes = this.endNodes();
		if (endNodes.length > 1) {
			throw new WorkflowTestError(
				'MULTIPLE_END_NODES',
				`More than one end node ran: ${endNodes.join(', ')}. Read the output of one with result.node().`,
				{ workflow: this.context.handle.name },
			);
		}
		return this.node(endNodes[0]).runs.at(-1)?.output ?? [];
	}

	node(node: string | NodeReference): NodeResult {
		const { name } = this.reference(node);
		const completed = this.context.runs.completed.get(name) ?? [];
		return new NodeResult(
			name,
			completed.map((run) => this.toNodeRun(run)),
		);
	}

	workflow(name: string): { runs: SubWorkflowRun[] } {
		const runs = this.context.subWorkflows.runs.filter((run) => run.workflow === name);
		const inSet = this.context.set.workflows.some((workflow) => workflow.name === name);
		if (runs.length > 0 || inSet) return { runs };
		throw new WorkflowTestError(
			'WORKFLOW_NOT_FOUND',
			`No sub-workflow named "${name}" ran, and the set holds no workflow with that name.`,
		);
	}

	private reference(node: string | NodeReference): NodeReference {
		const { handle } = this.context;
		if (typeof node === 'string') return handle.node(node);
		if (node.workflow === handle) return node;
		throw new WorkflowTestError(
			'NODE_NOT_FOUND',
			`The node "${node.name}" belongs to workflow "${node.workflow.name}", not to "${handle.name}".`,
			{ workflow: handle.name, node: node.name },
		);
	}

	private endNodes() {
		const { workflow, runs } = this.context;
		return [...runs.completed.keys()].filter(
			(name) =>
				isOnMainPath(workflow, name) &&
				workflow.getChildNodes(name, 'main', 1).every((child) => !runs.completed.has(child)),
		);
	}

	private toNodeRun({ record, task }: CompletedNodeRun): NodeRun {
		const outputs = (task.data?.main ?? []).map(toJson);
		return {
			...record,
			input: toJson(this.inputOf(task)),
			output: outputs[0] ?? [],
			outputs,
			...(task.error && { error: { message: task.error.message } }),
		};
	}

	private inputOf(task: ITaskData): INodeExecutionData[] | null {
		const source = task.source[0];
		if (!source) return [];
		const previousRun =
			this.run.data.resultData.runData[source.previousNode]?.[source.previousNodeRun ?? 0];
		return previousRun?.data?.main[source.previousNodeOutput ?? 0] ?? [];
	}
}

function isOnMainPath(workflow: Workflow, name: string) {
	const outputs = Object.keys(workflow.connectionsBySourceNode[name] ?? {});
	return outputs.length === 0 || outputs.includes(NodeConnectionTypes.Main);
}

function toJson(items: INodeExecutionData[] | null): IDataObject[] {
	return (items ?? []).map((item) => item.json);
}
