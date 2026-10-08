import { isRecord } from '@n8n/utils/is-record';
import {
	Workflow,
	WorkflowDataProxy,
	createRunExecutionData,
	executeFilter,
	isFilterValue,
	jsonParse,
	mapConnectionsByDestination,
	type IDataObject,
	type IExecuteData,
	type INodeExecutionData,
	type INodeParameters,
	type INodeTypeDescription,
	type INodeTypes,
	type IRunData,
	type ITaskData,
	type IWorkflowDataProxyAdditionalKeys,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { runInNewContext } from 'node:vm';

import type { TemplateWorkflow } from './factory-pack-files';

/**
 * Runs the expressions and the Code nodes of a workflow template with the real n8n data proxy
 * and expression engine, against made-up output of earlier nodes. So `$('Node')` picks the
 * output branch, the run and the parameters exactly as n8n does at runtime.
 */

/** The data that one node of the template sees when it runs. */
export interface TemplateRun {
	/** Earlier nodes that succeeded: the item on output 0 of their last run. */
	nodes?: Record<string, IDataObject>;
	/** Earlier nodes that failed: the item on their last output, which is the error output. */
	failed?: Record<string, IDataObject>;
	/** The input item of the node: `$json` and `$input`. */
	json?: IDataObject;
	/** The node that sent the input item (`$prevNode`). The default is the first parent. */
	previousNode?: string;
	/** The run of `previousNode` that sent the input item. */
	previousNodeRun?: number;
	executionId?: string;
	/** The run index of the node (`$runIndex`). */
	runIndex?: number;
}

const MODE = 'webhook';

/** Node types made from their descriptions, so that n8n adds default parameters as at runtime. */
export function nodeTypesOf(descriptions: INodeTypeDescription[]): INodeTypes {
	const find = (type: string, version?: number) => {
		const versions = descriptions.filter((description) => description.name === type);
		const match =
			version === undefined
				? versions.at(-1)
				: versions.find((description) =>
						Array.isArray(description.version)
							? description.version.includes(version)
							: description.version === version,
					);
		if (!match) throw new Error(`Unknown node type ${type}@${version ?? 'latest'}`);
		return { description: match };
	};
	return {
		getByName: (type) => find(type),
		getByNameAndVersion: find,
		getKnownTypes: () => ({}),
	};
}

/** Values from another realm or from proxies become plain JSON values. */
const plain = (value: unknown): unknown =>
	value === undefined ? undefined : jsonParse(JSON.stringify(value));

const isParameterValue = (value: unknown): value is NodeParameterValueType =>
	value === null || ['string', 'number', 'boolean', 'object', 'undefined'].includes(typeof value);

export class TemplateRuntime {
	private readonly workflow: Workflow;

	constructor(
		private readonly template: TemplateWorkflow,
		private readonly nodeTypes: INodeTypes,
	) {
		// The Workflow class adds default parameters to the nodes that it gets, so it gets a copy.
		this.workflow = new Workflow({
			nodes: structuredClone(template.nodes),
			connections: template.connections,
			active: false,
			nodeTypes,
			settings: template.settings,
		});
	}

	/** The same template with other parameters on some nodes, for example the chosen agents. */
	withParameters(patches: Record<string, INodeParameters>): TemplateRuntime {
		const nodes = this.template.nodes.map((node) =>
			Object.hasOwn(patches, node.name)
				? { ...node, parameters: { ...node.parameters, ...patches[node.name] } }
				: node,
		);
		return new TemplateRuntime({ ...this.template, nodes }, this.nodeTypes);
	}

	/** The parameters of a node after n8n added the default values. */
	parametersOf(nodeName: string): INodeParameters {
		const node = this.workflow.getNode(nodeName);
		if (!node) throw new Error(`The template has no node "${nodeName}"`);
		return node.parameters;
	}

	/**
	 * The output of `referencedNode` that `$('referencedNode').first()` reads from `nodeName` when
	 * the expression gives no output index: the first one that a search back from the node meets.
	 */
	defaultOutputIndex(nodeName: string, referencedNode: string): number {
		return this.workflow.getNodeConnectionIndexes(nodeName, referencedNode)?.sourceIndex ?? 0;
	}

	/** Resolves a parameter value of a node, with each expression in it. */
	evaluate(nodeName: string, value: unknown, run: TemplateRun = {}): unknown {
		if (!isParameterValue(value)) throw new Error(`A ${typeof value} is not a parameter value`);
		const context = this.contextOf(nodeName, run);
		return plain(
			this.workflow.expression.getParameterValue(
				value,
				context.runExecutionData,
				context.runIndex,
				0,
				nodeName,
				context.input,
				MODE,
				context.additionalKeys,
				context.executeData,
			),
		);
	}

	/** Runs the JavaScript of a Code node (mode "Run once for all items"). */
	runCode(nodeName: string, run: TemplateRun = {}): unknown {
		const jsCode = this.parametersOf(nodeName).jsCode;
		if (typeof jsCode !== 'string') throw new Error(`"${nodeName}" is not a Code node`);
		const context = this.contextOf(nodeName, run);
		const proxy = new WorkflowDataProxy(
			this.workflow,
			context.runExecutionData,
			context.runIndex,
			0,
			nodeName,
			context.input,
			{},
			MODE,
			context.additionalKeys,
			context.executeData,
		).getDataProxy();
		// The task runner gives a Code node these globals from the same data proxy.
		const sandbox = {
			$: proxy.$,
			$input: proxy.$input,
			$json: proxy.$json,
			$execution: proxy.$execution,
			$runIndex: proxy.$runIndex,
			$prevNode: proxy.$prevNode,
		};
		return plain(runInNewContext(`(() => {\n${jsCode}\n})()`, sandbox));
	}

	/** Whether a filter value (If conditions or a Switch rule) passes, as the If node decides. */
	passesFilter(nodeName: string, filterValue: unknown, run: TemplateRun = {}): boolean {
		if (!isParameterValue(filterValue)) throw new Error('The filter is not a parameter value');
		const context = this.contextOf(nodeName, run);
		const resolved = this.workflow.expression.getParameterValue(
			filterValue,
			context.runExecutionData,
			context.runIndex,
			0,
			nodeName,
			context.input,
			MODE,
			context.additionalKeys,
			context.executeData,
		);
		if (!isFilterValue(resolved)) throw new Error(`"${nodeName}" has no filter value here`);
		return executeFilter(resolved, { itemIndex: 0 });
	}

	/** Whether an item passes an If node, so that it leaves on the true output. */
	passesIf(ifName: string, run: TemplateRun = {}): boolean {
		return this.passesFilter(ifName, this.parametersOf(ifName).conditions, run);
	}

	/** The output that a Switch node in rules mode sends an item to: a rule index or the fallback. */
	routeOf(switchName: string, run: TemplateRun = {}): number | 'fallback' {
		const rules: unknown = this.parametersOf(switchName).rules;
		const values: unknown = isRecord(rules) ? rules.values : undefined;
		if (!Array.isArray(values)) throw new Error(`"${switchName}" has no rules`);
		const index = values.findIndex((rule: unknown) =>
			this.passesFilter(switchName, isRecord(rule) ? rule.conditions : undefined, run),
		);
		return index === -1 ? 'fallback' : index;
	}

	private outputCount(nodeName: string): number {
		return Math.max(this.template.connections[nodeName]?.main?.length ?? 0, 1);
	}

	private taskOf(nodeName: string, json: IDataObject, outputIndex: number): ITaskData {
		const main = Array.from({ length: this.outputCount(nodeName) }, (_, index) =>
			index === outputIndex ? [{ json }] : [],
		);
		return { startTime: 0, executionTime: 0, executionIndex: 0, source: [], data: { main } };
	}

	private runDataOf(run: TemplateRun): IRunData {
		const runData: IRunData = {};
		for (const [name, json] of Object.entries(run.nodes ?? {})) {
			runData[name] = [this.taskOf(name, json, 0)];
		}
		for (const [name, json] of Object.entries(run.failed ?? {})) {
			const errorOutput = this.outputCount(name) - 1;
			if (errorOutput === 0) throw new Error(`"${name}" has no error output`);
			runData[name] = [this.taskOf(name, json, errorOutput)];
		}
		return runData;
	}

	private assertNodesExist(names: string[]): void {
		const missing = names.find((name) => !this.workflow.getNode(name));
		if (missing !== undefined) throw new Error(`The template has no node "${missing}"`);
	}

	/** The input item, and the node and run that sent it. */
	private executeDataOf(nodeName: string, run: TemplateRun): IExecuteData {
		const node = this.workflow.getNode(nodeName);
		if (!node) throw new Error(`The template has no node "${nodeName}"`);
		const parent = mapConnectionsByDestination(this.template.connections)[nodeName]?.main?.[0]?.[0];
		const previousNode = run.previousNode ?? parent?.node;
		const source = previousNode
			? { main: [{ previousNode, previousNodeRun: run.previousNodeRun ?? 0 }] }
			: null;
		return { node, data: { main: [[{ json: run.json ?? {} }]] }, source };
	}

	private contextOf(nodeName: string, run: TemplateRun) {
		this.assertNodesExist([nodeName, ...Object.keys(run.nodes ?? {}), ...Object.keys(run.failed ?? {})]);
		const executeData = this.executeDataOf(nodeName, run);
		const input: INodeExecutionData[] = executeData.data.main[0] ?? [];
		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
			$execution: { id: run.executionId ?? '1', mode: 'production', resumeUrl: '', resumeFormUrl: '' },
		};
		return {
			input,
			executeData,
			additionalKeys,
			runIndex: run.runIndex ?? 0,
			runExecutionData: createRunExecutionData({ resultData: { runData: this.runDataOf(run) } }),
		};
	}
}
