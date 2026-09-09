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
	ITaskSubRunMetadata,
	NodeConnectionType,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, UnexpectedError, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ErrorReporter } from '@/errors/error-reporter';
import * as Helpers from '@test/helpers';

import { WorkflowExecute } from '../workflow-execute';

/**
 * When an AI sub-node fails to start, the engine records the failure on the sub-node itself
 * and also notes it against the parent — filed under the run index the parent is expected to
 * get next (`runData[parent].length`). At the end of the execution `moveNodeMetadata` merges
 * each note onto the matching run, and reports any note that has no run to merge onto.
 *
 * That expected index is right for a top-level parent: the engine appends its error run a
 * moment later. A sub-node parent never gets one, so the note is left pointing at nothing —
 * which is what CAT-3665 is about.
 *
 * The real engine drives every test. The only authored parts are the node types below, whose
 * behaviour comes from node parameters rather than mocks.
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
						// A real agent treats a failed tool call as a result and carries on
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
	// Covers the "supplyData throws" slice (missing credentials, bad config). Real chat models
	// make no network call here, so bad-key/quota errors instead surface on invoke.
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

/** Mirrors `ToolVectorStore`: its setup eagerly fetches its own sub-nodes. */
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

/** Two main outputs into the same node, so that node gets two runs. */
const branchNodeType: INodeType = {
	description: {
		displayName: 'Test Branch',
		name: 'testBranch',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Test Branch' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		properties: [],
	},
	async execute() {
		return [[{ json: {} }], [{ json: {} }]];
	},
};

const nodeTypeData: INodeTypeData = {
	'test.trigger': { type: triggerNodeType, sourcePath: '' },
	'test.agent': { type: agentNodeType, sourcePath: '' },
	'test.branch': { type: branchNodeType, sourcePath: '' },
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

type RunOutcome = { status?: string; error?: string };
type RunSummary = RunOutcome & { subRun?: unknown };

/**
 * The saved execution as an API consumer sees it: `GET /rest|api/v1/executions/:id?includeData=true`
 * returns exactly this `runData`, `metadata.subRun` included.
 *
 * `subRun` is written by a background promise nobody awaits, which runs after the
 * `nodeExecuteAfter` hook and currently wins the race against `moveNodeMetadata`. A slow
 * async handler on that hook would strand it unmerged instead (see CAT-4268).
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
 * The orphan reports ("Taskdata missing at the end of an execution") the engine emitted to
 * its Sentry sink. Matched by class, not message text, so rewording the message cannot
 * silently empty this list. Filtering is necessary: the engine also reports every
 * `BaseError` a node throws, relying on `beforeSend`/`shouldReport` to drop it — a filter
 * the bare mock bypasses — so "never called" would be wrong.
 */
function orphanReports(): string[] {
	return vi
		.mocked(errorReporter.error)
		.mock.calls.map((call) => call[0])
		.filter((error): error is UnexpectedError => error instanceof UnexpectedError)
		.map((error) => error.message);
}

/** The notes still waiting to be merged. */
function stagedMetadata(result: IRun): Record<string, ITaskMetadata[]> {
	return result.data.executionData?.metadata ?? {};
}

/**
 * The runs a node actually recorded, in order, ignoring which index they landed at. A failing
 * sub-node's record goes to its *parent's* expected index, so the engine leaves holes in the
 * array — an older bug this fix deliberately leaves alone, so nothing here pins it (CAT-4268).
 */
function runsOf(result: IRun, nodeName: string): RunOutcome[] {
	const runs = result.data.resultData.runData[nodeName] ?? [];
	return runs
		.filter((run) => run !== undefined)
		.map((run) => ({ status: run.executionStatus, error: run.error?.message }));
}

/** The sources of those same runs, in the same order. */
function sourcesOf(result: IRun, nodeName: string): Array<Array<ISourceData | null>> {
	const runs = result.data.resultData.runData[nodeName] ?? [];
	return runs.filter((run) => run !== undefined).map((run) => run.source);
}

/**
 * The parent → child links recorded on a run. `addOutputData` also writes an entry naming the
 * run's own node, which is noise for this fix (CAT-4268), so only cross-node entries are kept.
 */
function crossNodeSubRun(result: IRun, nodeName: string, runIndex = 0): ITaskSubRunMetadata[] {
	const subRun = result.data.resultData.runData[nodeName]?.[runIndex]?.metadata?.subRun ?? [];
	return subRun.filter((entry) => entry.node !== nodeName);
}

let errorReporter: ErrorReporter;

beforeEach(() => {
	errorReporter = mock<ErrorReporter>();
	Container.set(ErrorReporter, errorReporter);
});

afterEach(() => {
	Container.reset();
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
				// Right target: the engine appends Agent's error run at exactly this index a moment later
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

		test('stages the subRun entry at a top-level parent run index above zero', async () => {
			const result = await runWorkflow(
				[
					node('Trigger', 'test.trigger'),
					node('Branch', 'test.branch'),
					node('Agent', 'test.agent'),
					// Succeeds on the agent's first run, fails on its second
					node('Model', 'test.model', { failSupplyData: '={{ $runIndex >= 1 }}' }),
				],
				{
					...connect('Trigger', 'Branch'),
					Branch: {
						main: [
							[{ node: 'Agent', type: NodeConnectionTypes.Main, index: 0 }],
							[{ node: 'Agent', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					...connect('Model', 'Agent', NodeConnectionTypes.AiLanguageModel),
				},
			);

			expect(result.status).toBe('error');
			const saved = savedExecution(result);
			expect(Object.keys(saved).sort()).toEqual(['Agent', 'Branch', 'Model', 'Trigger']);
			expect(saved.Trigger).toEqual([{ status: 'success', error: undefined, subRun: undefined }]);
			expect(saved.Branch).toEqual([{ status: 'success', error: undefined, subRun: undefined }]);
			// The target follows the parent's real run count — here run 1, not 0. The entry's own
			// `runIndex` reuses that same number, which CAT-4268 may change.
			expect(saved.Agent).toEqual([
				{ status: 'success', error: undefined, subRun: undefined },
				{
					status: 'error',
					error: 'Error in sub-node Model',
					subRun: [{ node: 'Model', runIndex: 1 }],
				},
			]);

			expect(runsOf(result, 'Model')).toEqual([{ status: 'error', error: 'Invalid API key' }]);
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
			expect(runsOf(result, 'Tool Model')).toEqual([{ status: 'error', error: 'Invalid API key' }]);
			// `Tool` never gets a run of its own, so there must be nothing noted against it
			expect(runsOf(result, 'Tool')).toEqual([]);
			expect(stagedMetadata(result)).toEqual({});
			expect(sourcesOf(result, 'Tool Model')).toEqual([
				[{ previousNode: 'Tool', previousNodeRun: 0 }],
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
			expect(runsOf(result, 'Tool')).toEqual([
				{ status: 'error', error: expect.stringContaining('Error in sub-node Tool Model') },
			]);
			expect(runsOf(result, 'Tool Model')).toEqual([{ status: 'error', error: 'Invalid API key' }]);
			// The tool is mid-run at index 0, so the note the old code filed at index 1 had
			// nothing to merge onto and was reported
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
			expect(runsOf(result, 'Tool')).toEqual([
				{ status: 'error', error: expect.stringContaining('Error in sub-node Tool Model') },
				{ status: 'error', error: expect.stringContaining('Error in sub-node Tool Model') },
			]);
			expect(runsOf(result, 'Tool Model')).toEqual([
				{ status: 'error', error: 'Invalid API key' },
				{ status: 'error', error: 'Invalid API key' },
			]);
			// Before the fix, run 1 also carried the note left by the first invocation, so it
			// listed a sub-node failure belonging to a different attempt
			expect(crossNodeSubRun(result, 'Tool', 1)).toEqual([]);
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
			expect(runsOf(result, 'Inner Model')).toEqual([
				{ status: 'error', error: 'Invalid API key' },
			]);
			// Neither store gets a run, and only the innermost failure writes a note — the
			// outer levels rethrow the error before reaching that code
			expect(runsOf(result, 'Store')).toEqual([]);
			expect(runsOf(result, 'Inner Store')).toEqual([]);
			expect(stagedMetadata(result)).toEqual({});
			expect(sourcesOf(result, 'Inner Model')).toEqual([
				[{ previousNode: 'Inner Store', previousNodeRun: 0 }],
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
			expect(runsOf(result, 'Tool')).toEqual([
				{ status: 'error', error: expect.stringContaining('Error in sub-node Tool Model') },
			]);
			expect(runsOf(result, 'Tool Model')).toEqual([{ status: 'error', error: 'Invalid API key' }]);
			// The healthy sibling is untouched by its neighbour's failure
			expect(runsOf(result, 'Other Tool')).toEqual([{ status: 'success' }]);
			expect(crossNodeSubRun(result, 'Other Tool')).toEqual([]);
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
			// Both tools are invoked, so both have a real run of their own
			expect(runsOf(result, 'Outer Tool')).toEqual([
				{ status: 'error', error: expect.stringContaining('Error in sub-node Inner Model') },
			]);
			expect(runsOf(result, 'Inner Tool')).toEqual([
				{ status: 'error', error: expect.stringContaining('Error in sub-node Inner Model') },
			]);
			expect(runsOf(result, 'Inner Model')).toEqual([
				{ status: 'error', error: 'Invalid API key' },
			]);
			expect(sourcesOf(result, 'Inner Model')).toEqual([
				[{ previousNode: 'Inner Tool', previousNodeRun: 0 }],
			]);
			expect(orphanReports()).toEqual([]);
		});
	});
});
