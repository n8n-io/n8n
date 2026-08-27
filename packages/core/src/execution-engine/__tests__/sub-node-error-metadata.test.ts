import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	IConnections,
	IExecuteFunctions,
	INode,
	INodeParameters,
	INodeType,
	INodeTypeData,
	IRun,
	ISourceData,
	ISupplyDataFunctions,
	ITaskMetadata,
	NodeConnectionType,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ErrorReporter } from '@/errors/error-reporter';
import * as Helpers from '@test/helpers';

import { WorkflowExecute } from '../workflow-execute';

/**
 * End-to-end coverage for the `executionData.metadata` staging done by the
 * supplyData error path (CAT-3665). The real engine drives everything; the only
 * authored parts are the node types below, whose behaviour is parameter-driven.
 */

const triggerNodeType: INodeType = {
	description: {
		displayName: 'Test Trigger',
		name: 'testTrigger',
		group: ['trigger'],
		version: 1,
		description: '',
		defaults: { name: 'Test Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
	async execute() {
		return [[{ json: {} }]];
	},
};

const agentNodeType: INodeType = {
	description: {
		displayName: 'Test Agent',
		name: 'testAgent',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Test Agent' },
		inputs: [
			NodeConnectionTypes.Main,
			{ type: NodeConnectionTypes.AiLanguageModel, required: true, maxConnections: 1 },
			{ type: NodeConnectionTypes.AiTool },
		],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{ displayName: 'Tool Invocations', name: 'toolInvocations', type: 'number', default: 0 },
		],
	},
	async execute(this: IExecuteFunctions) {
		await this.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, 0);

		const invocations = this.getNodeParameter('toolInvocations', 0, 0) as number;
		if (invocations > 0) {
			const tools = (await this.getInputConnectionData(NodeConnectionTypes.AiTool, 0)) as Array<{
				invoke: (args: object) => Promise<unknown>;
			}>;
			for (let i = 0; i < invocations; i++) {
				for (const tool of tools) {
					try {
						await tool.invoke({});
					} catch {
						// A real agent absorbs a failed tool call as an observation
					}
				}
			}
		}

		return [[{ json: { done: true } }]];
	},
};

const modelNodeType: INodeType = {
	description: {
		displayName: 'Test Model',
		name: 'testModel',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Test Model' },
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		properties: [
			{ displayName: 'Fail Supply Data', name: 'failSupplyData', type: 'boolean', default: false },
		],
	},
	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		if (this.getNodeParameter('failSupplyData', itemIndex, false) === true) {
			throw new Error('Invalid API key');
		}
		return { response: {} };
	},
};

/** No `supplyData`, so the engine wraps it with the real `createNodeAsTool`. */
const toolPlainNodeType: INodeType = {
	description: {
		displayName: 'Test Tool',
		name: 'testToolPlain',
		group: ['transform'],
		version: 1,
		description: 'A test tool',
		defaults: { name: 'Test Tool' },
		inputs: [{ type: NodeConnectionTypes.AiLanguageModel, required: true, maxConnections: 1 }],
		outputs: [NodeConnectionTypes.AiTool],
		properties: [],
	},
	async execute(this: IExecuteFunctions) {
		await this.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, 0);
		return [[{ json: { response: 'ok' } }]];
	},
};

/** Mirrors `createVectorStoreNode`/`ToolVectorStore`: its setup eagerly fetches its sub-nodes. */
const toolWithSetupNodeType: INodeType = {
	description: {
		displayName: 'Test Tool With Setup',
		name: 'testToolWithSetup',
		group: ['transform'],
		version: 1,
		description: 'A test tool that sets up its own sub-nodes',
		defaults: { name: 'Test Tool With Setup' },
		inputs: [
			{ type: NodeConnectionTypes.AiLanguageModel, maxConnections: 1 },
			{ type: NodeConnectionTypes.AiTool },
		],
		outputs: [NodeConnectionTypes.AiTool],
		properties: [],
	},
	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		await this.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, 0);
		await this.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
		// Never reached in this suite: every case using it fails during the setup above
		return { response: {} };
	},
};

/** A tool that invokes a tool of its own, so both nesting levels get real runs. */
const toolWithNestedToolNodeType: INodeType = {
	description: {
		displayName: 'Test Nesting Tool',
		name: 'testToolWithNestedTool',
		group: ['transform'],
		version: 1,
		description: 'A test tool that invokes another tool',
		defaults: { name: 'Test Nesting Tool' },
		inputs: [{ type: NodeConnectionTypes.AiTool }],
		outputs: [NodeConnectionTypes.AiTool],
		properties: [],
	},
	async execute(this: IExecuteFunctions) {
		const tools = (await this.getInputConnectionData(NodeConnectionTypes.AiTool, 0)) as Array<{
			invoke: (args: object) => Promise<unknown>;
		}>;
		// No catch: the inner failure must surface on this tool's own run too
		for (const tool of tools) await tool.invoke({});
		return [[{ json: { response: 'ok' } }]];
	},
};

const nodeTypeData: INodeTypeData = {
	'test.trigger': { type: triggerNodeType, sourcePath: '' },
	'test.agent': { type: agentNodeType, sourcePath: '' },
	'test.model': { type: modelNodeType, sourcePath: '' },
	'test.toolPlain': { type: toolPlainNodeType, sourcePath: '' },
	'test.toolWithSetup': { type: toolWithSetupNodeType, sourcePath: '' },
	'test.toolWithNestedTool': { type: toolWithNestedToolNodeType, sourcePath: '' },
};

function node(name: string, type: string, parameters: INodeParameters = {}): INode {
	return { id: name, name, type, typeVersion: 1, position: [0, 0], parameters };
}

/** `A --main--> B` style connection, keyed by source node as the engine expects. */
function connect(
	from: string,
	to: string,
	type: NodeConnectionType = NodeConnectionTypes.Main,
): IConnections {
	return { [from]: { [type]: [[{ node: to, type, index: 0 }]] } };
}

async function runWorkflow(nodes: INode[], connections: IConnections): Promise<IRun> {
	const workflow = new Workflow({
		id: 'test',
		nodes,
		connections,
		active: false,
		nodeTypes: Helpers.NodeTypes(nodeTypeData),
	});
	const waitPromise = createDeferredPromise<IRun>();
	const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
	// The fake trigger has no `trigger`/`poll` method, so name the start node explicitly
	await new WorkflowExecute(additionalData, 'manual').run({ workflow, startNode: nodes[0] });
	return await waitPromise.promise;
}

const TASKDATA_MISSING = 'Taskdata missing at the end of an execution';

/** What `makeHandleToolInvocation` reports on the tool's own run when its model fails. */
const TOOL_INVOCATION_ERROR = 'Error in sub-node Tool Model\n\nDetails: Invalid API key';

/** Same, for the nested-invocation case, where the failing model sits two tools deep. */
const NESTED_TOOL_INVOCATION_ERROR = 'Error in sub-node Inner Model\n\nDetails: Invalid API key';

type RunSummary = { status?: string; error?: string; subRun?: unknown };

/**
 * The saved execution as an API consumer sees it: `GET /rest|api/v1/executions/:id?includeData=true`
 * returns exactly this `runData`, `metadata.subRun` included.
 */
function savedExecution(result: IRun): Record<string, RunSummary[]> {
	return Object.fromEntries(
		Object.entries(result.data.resultData.runData).map(([name, runs]) => [
			name,
			Array.from(runs, (run) => ({
				status: run?.executionStatus,
				error: run?.error?.message,
				subRun: run?.metadata?.subRun,
			})),
		]),
	);
}

/**
 * The reports the engine emitted to its Sentry sink. Only the orphan report is this
 * suite's business: the engine also reports every `BaseError` a node throws
 * (`workflow-execute.ts:2014`), relying on `beforeSend`/`shouldReport` to drop it — a
 * filter the bare mock bypasses, so "never called" would be wrong.
 */
function orphanReports(): string[] {
	return vi
		.mocked(errorReporter.error)
		.mock.calls.map((call) => (call[0] as Error)?.message)
		.filter((message) => message === TASKDATA_MISSING);
}

/** What the supplyData error path staged, before `moveNodeMetadata` merges it. */
function stagedMetadata(result: IRun): Record<string, ITaskMetadata[]> {
	return result.data.executionData?.metadata ?? {};
}

/** The parent→child link the fix keeps: it lives on the child's own record, not in `subRun`. */
function sourceOf(
	result: IRun,
	nodeName: string,
	runIndex = 0,
): Array<ISourceData | null> | undefined {
	return result.data.resultData.runData[nodeName]?.[runIndex]?.source;
}

let errorReporter: ErrorReporter;

beforeEach(() => {
	errorReporter = mock<ErrorReporter>();
	Container.set(ErrorReporter, errorReporter);
});

describe('sub-node error metadata', () => {
	describe('current behaviour (pinned)', () => {
		test('stages the subRun entry on a top-level parent when its model fails', async () => {
			const result = await runWorkflow(
				[
					node('Trigger', 'test.trigger'),
					node('Agent', 'test.agent'),
					node('Model', 'test.model', { failSupplyData: true }),
				],
				{
					...connect('Trigger', 'Agent'),
					...connect('Model', 'Agent', NodeConnectionTypes.AiLanguageModel),
				},
			);

			expect(result.status).toBe('error');
			expect(result.data.resultData.error?.message).toBe('Error in sub-node Model');
			expect(savedExecution(result)).toEqual({
				Trigger: [{ status: 'success', error: undefined, subRun: undefined }],
				// The anticipated index is correct here: the engine appends Agent's error run
				Agent: [
					{
						status: 'error',
						error: 'Error in sub-node Model',
						subRun: [{ node: 'Model', runIndex: 0 }],
					},
				],
				Model: [{ status: 'error', error: 'Invalid API key', subRun: undefined }],
			});
			expect(orphanReports()).toEqual([]);
		});

		test('merges the subRun entry onto a tool run when the invocation succeeds', async () => {
			const result = await runWorkflow(
				[
					node('Trigger', 'test.trigger'),
					node('Agent', 'test.agent', { toolInvocations: 1 }),
					node('Model', 'test.model'),
					node('Tool', 'test.toolPlain'),
					node('Tool Model', 'test.model'),
				],
				{
					...connect('Trigger', 'Agent'),
					...connect('Model', 'Agent', NodeConnectionTypes.AiLanguageModel),
					...connect('Tool', 'Agent', NodeConnectionTypes.AiTool),
					...connect('Tool Model', 'Tool', NodeConnectionTypes.AiLanguageModel),
				},
			);

			expect(result.status).toBe('success');
			expect(result.data.resultData.error).toBeUndefined();
			expect(savedExecution(result)).toEqual({
				Trigger: [{ status: 'success', error: undefined, subRun: undefined }],
				Agent: [{ status: 'success', error: undefined, subRun: undefined }],
				// Pins current behaviour, which looks wrong: `addOutputData` passes its own node
				// name as the subRun target, so a tool's run lists itself as its own sub-run.
				// Unrelated to this fix and invisible today — nothing reads `subRun`.
				Tool: [{ status: 'success', error: undefined, subRun: [{ node: 'Tool', runIndex: 0 }] }],
			});
			expect(orphanReports()).toEqual([]);
		});
	});

	describe('sub-node parents (nothing to attach a subRun entry to)', () => {
		test('stages nothing when a tool fails while setting up its own sub-node', async () => {
			const result = await runWorkflow(
				[
					node('Trigger', 'test.trigger'),
					node('Agent', 'test.agent', { toolInvocations: 1 }),
					node('Model', 'test.model'),
					node('Tool', 'test.toolWithSetup'),
					node('Tool Model', 'test.model', { failSupplyData: true }),
				],
				{
					...connect('Trigger', 'Agent'),
					...connect('Model', 'Agent', NodeConnectionTypes.AiLanguageModel),
					...connect('Tool', 'Agent', NodeConnectionTypes.AiTool),
					...connect('Tool Model', 'Tool', NodeConnectionTypes.AiLanguageModel),
				},
			);

			// The user-facing failure is unchanged: it names the node that actually broke
			expect(result.status).toBe('error');
			expect(result.data.resultData.error?.message).toBe('Error in sub-node Tool Model');
			expect(savedExecution(result)).toEqual({
				Trigger: [{ status: 'success', error: undefined, subRun: undefined }],
				Agent: [{ status: 'error', error: 'Error in sub-node Tool Model', subRun: undefined }],
				'Tool Model': [{ status: 'error', error: 'Invalid API key', subRun: undefined }],
			});
			// `Tool` never gets a run of its own, so nothing may be staged against it
			expect(stagedMetadata(result)).toEqual({});
			expect(sourceOf(result, 'Tool Model')).toEqual([
				{ previousNode: 'Tool', previousNodeRun: 0 },
			]);
			expect(orphanReports()).toEqual([]);
		});

		test('stages nothing when a tool fails during an invocation', async () => {
			const result = await runWorkflow(
				[
					node('Trigger', 'test.trigger'),
					node('Agent', 'test.agent', { toolInvocations: 1 }),
					node('Model', 'test.model'),
					node('Tool', 'test.toolPlain'),
					node('Tool Model', 'test.model', { failSupplyData: true }),
				],
				{
					...connect('Trigger', 'Agent'),
					...connect('Model', 'Agent', NodeConnectionTypes.AiLanguageModel),
					...connect('Tool', 'Agent', NodeConnectionTypes.AiTool),
					...connect('Tool Model', 'Tool', NodeConnectionTypes.AiLanguageModel),
				},
			);

			// The agent absorbs the failed tool call, so the execution itself succeeds
			expect(result.status).toBe('success');
			expect(savedExecution(result)).toEqual({
				Trigger: [{ status: 'success', error: undefined, subRun: undefined }],
				Agent: [{ status: 'success', error: undefined, subRun: undefined }],
				// Only the tool's own self-referential entry, written by `addOutputData`
				Tool: [
					{
						status: 'error',
						error: TOOL_INVOCATION_ERROR,
						subRun: [{ node: 'Tool', runIndex: 0 }],
					},
				],
				// Sparse on purpose: the child's error still lands at the anticipated index
				'Tool Model': [
					{ status: undefined, error: undefined, subRun: undefined },
					{ status: 'error', error: 'Invalid API key', subRun: undefined },
				],
			});
			expect(orphanReports()).toEqual([]);
		});

		test('stages nothing when the same tool fails on repeated invocations', async () => {
			const result = await runWorkflow(
				[
					node('Trigger', 'test.trigger'),
					node('Agent', 'test.agent', { toolInvocations: 2 }),
					node('Model', 'test.model'),
					node('Tool', 'test.toolPlain'),
					node('Tool Model', 'test.model', { failSupplyData: true }),
				],
				{
					...connect('Trigger', 'Agent'),
					...connect('Model', 'Agent', NodeConnectionTypes.AiLanguageModel),
					...connect('Tool', 'Agent', NodeConnectionTypes.AiTool),
					...connect('Tool Model', 'Tool', NodeConnectionTypes.AiLanguageModel),
				},
			);

			expect(result.status).toBe('success');
			expect(savedExecution(result)).toEqual({
				Trigger: [{ status: 'success', error: undefined, subRun: undefined }],
				Agent: [{ status: 'success', error: undefined, subRun: undefined }],
				// Each run carries only its own entry; today run 1 also absorbs the entry
				// the first invocation staged at the anticipated index
				Tool: [
					{
						status: 'error',
						error: TOOL_INVOCATION_ERROR,
						subRun: [{ node: 'Tool', runIndex: 0 }],
					},
					{
						status: 'error',
						error: TOOL_INVOCATION_ERROR,
						subRun: [{ node: 'Tool', runIndex: 1 }],
					},
				],
				'Tool Model': [
					{ status: undefined, error: undefined, subRun: undefined },
					{ status: 'error', error: 'Invalid API key', subRun: undefined },
					{ status: 'error', error: 'Invalid API key', subRun: undefined },
				],
			});
			expect(orphanReports()).toEqual([]);
		});

		test('stages nothing when the failure is three levels deep', async () => {
			const result = await runWorkflow(
				[
					node('Trigger', 'test.trigger'),
					node('Agent', 'test.agent', { toolInvocations: 1 }),
					node('Model', 'test.model'),
					node('Store', 'test.toolWithSetup'),
					node('Inner Store', 'test.toolWithSetup'),
					node('Inner Model', 'test.model', { failSupplyData: true }),
				],
				{
					...connect('Trigger', 'Agent'),
					...connect('Model', 'Agent', NodeConnectionTypes.AiLanguageModel),
					...connect('Store', 'Agent', NodeConnectionTypes.AiTool),
					...connect('Inner Store', 'Store', NodeConnectionTypes.AiTool),
					...connect('Inner Model', 'Inner Store', NodeConnectionTypes.AiLanguageModel),
				},
			);

			expect(result.status).toBe('error');
			expect(result.data.resultData.error?.message).toBe('Error in sub-node Inner Model');
			expect(savedExecution(result)).toEqual({
				Trigger: [{ status: 'success', error: undefined, subRun: undefined }],
				Agent: [{ status: 'error', error: 'Error in sub-node Inner Model', subRun: undefined }],
				'Inner Model': [{ status: 'error', error: 'Invalid API key', subRun: undefined }],
			});
			// Only the innermost frame stages: outer frames rethrow `configuration-node` errors first
			expect(stagedMetadata(result)).toEqual({});
			expect(sourceOf(result, 'Inner Model')).toEqual([
				{ previousNode: 'Inner Store', previousNodeRun: 0 },
			]);
			expect(orphanReports()).toEqual([]);
		});

		test('stages nothing for the failing tool and leaves its sibling intact', async () => {
			const result = await runWorkflow(
				[
					node('Trigger', 'test.trigger'),
					node('Agent', 'test.agent', { toolInvocations: 1 }),
					node('Model', 'test.model'),
					node('Tool', 'test.toolPlain'),
					node('Tool Model', 'test.model', { failSupplyData: true }),
					node('Other Tool', 'test.toolPlain'),
					node('Other Tool Model', 'test.model'),
				],
				{
					...connect('Trigger', 'Agent'),
					...connect('Model', 'Agent', NodeConnectionTypes.AiLanguageModel),
					...connect('Tool', 'Agent', NodeConnectionTypes.AiTool),
					...connect('Other Tool', 'Agent', NodeConnectionTypes.AiTool),
					...connect('Tool Model', 'Tool', NodeConnectionTypes.AiLanguageModel),
					...connect('Other Tool Model', 'Other Tool', NodeConnectionTypes.AiLanguageModel),
				},
			);

			expect(result.status).toBe('success');
			expect(savedExecution(result)).toEqual({
				Trigger: [{ status: 'success', error: undefined, subRun: undefined }],
				Agent: [{ status: 'success', error: undefined, subRun: undefined }],
				Tool: [
					{
						status: 'error',
						error: TOOL_INVOCATION_ERROR,
						subRun: [{ node: 'Tool', runIndex: 0 }],
					},
				],
				'Tool Model': [
					{ status: undefined, error: undefined, subRun: undefined },
					{ status: 'error', error: 'Invalid API key', subRun: undefined },
				],
				// The healthy sibling is untouched by its neighbour's failure
				'Other Tool': [
					{ status: 'success', error: undefined, subRun: [{ node: 'Other Tool', runIndex: 0 }] },
				],
			});
			expect(orphanReports()).toEqual([]);
		});

		test('stages nothing when a tool invokes a tool whose model fails', async () => {
			const result = await runWorkflow(
				[
					node('Trigger', 'test.trigger'),
					node('Agent', 'test.agent', { toolInvocations: 1 }),
					node('Model', 'test.model'),
					node('Outer Tool', 'test.toolWithNestedTool'),
					node('Inner Tool', 'test.toolPlain'),
					node('Inner Model', 'test.model', { failSupplyData: true }),
				],
				{
					...connect('Trigger', 'Agent'),
					...connect('Model', 'Agent', NodeConnectionTypes.AiLanguageModel),
					...connect('Outer Tool', 'Agent', NodeConnectionTypes.AiTool),
					...connect('Inner Tool', 'Outer Tool', NodeConnectionTypes.AiTool),
					...connect('Inner Model', 'Inner Tool', NodeConnectionTypes.AiLanguageModel),
				},
			);

			expect(result.status).toBe('success');
			// Both tools are invoked, so both have a real run of their own to attach to
			expect(savedExecution(result)).toEqual({
				Trigger: [{ status: 'success', error: undefined, subRun: undefined }],
				Agent: [{ status: 'success', error: undefined, subRun: undefined }],
				'Outer Tool': [
					{
						status: 'error',
						error: NESTED_TOOL_INVOCATION_ERROR,
						subRun: [{ node: 'Outer Tool', runIndex: 0 }],
					},
				],
				'Inner Tool': [
					{
						status: 'error',
						error: NESTED_TOOL_INVOCATION_ERROR,
						subRun: [{ node: 'Inner Tool', runIndex: 0 }],
					},
				],
				'Inner Model': [
					{ status: undefined, error: undefined, subRun: undefined },
					{ status: 'error', error: 'Invalid API key', subRun: undefined },
				],
			});
			expect(sourceOf(result, 'Inner Model', 1)).toEqual([
				{ previousNode: 'Inner Tool', previousNodeRun: 0 },
			]);
			expect(orphanReports()).toEqual([]);
		});
	});
});
