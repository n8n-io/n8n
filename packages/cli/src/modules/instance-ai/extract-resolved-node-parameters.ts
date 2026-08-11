/**
 * Replays expression resolution for a node's parameters against a past
 * execution's saved data — the server-side equivalent of the editor's
 * "resolved parameters" view. Used by `executions(action="get-resolved-node-parameters")`
 * and folded into the `debug` action's failedNode payload.
 *
 * Lives in its own module to keep `instance-ai.adapter.service.ts` focused.
 */
import { Container } from '@n8n/di';
import {
	wrapUntrustedData,
	type EmptyExpressionResolution,
	type ResolvedExpressionFailure,
	type ResolvedNodeParametersResult,
} from '@n8n/instance-ai';
import {
	type IExecuteData,
	type INode,
	type INodeExecutionData,
	type IRunData,
	type ISourceData,
	type IWorkflowDataProxyAdditionalKeys,
	Workflow,
	createEmptyRunExecutionData,
	HTTP_REQUEST_NODE_TYPE,
} from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';

import type { NodeTypes } from '@/node-types';

/**
 * Maximum characters for a single resolved parameter leaf. Resolved parameter
 * values are usually compact (URLs, IDs, headers) — anything bigger is almost
 * certainly an HTTP body or a piece of input data, which the agent can fetch
 * via `get-node-output` if needed.
 */
const MAX_RESOLVED_LEAF_CHARS = 8_000;

/**
 * Expression context variables we don't reconstruct in the replay.
 *
 * - `$ai`, `$response`, `$request`, `$pageCount` only exist mid-execution
 *   (AI-tool call, HTTP roundtrip, pagination loop) — genuinely irreproducible
 *   outside a live run.
 * - `$secrets`, `$vars` are persisted but we deliberately don't load them
 *   here. Treating their access as "unreconstructable" tells the agent the
 *   empty/throw is expected, not a real workflow bug.
 */
const UNRECONSTRUCTABLE_CONTEXT_VARS = [
	'$ai',
	'$response',
	'$request',
	'$pageCount',
	'$secrets',
	'$vars',
];

function mentionsUnreconstructableVar(raw: string): boolean {
	return UNRECONSTRUCTABLE_CONTEXT_VARS.some((variable) => raw.includes(variable));
}

function capResolvedLeaf(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	const isComplex = typeof value === 'object';
	const serialized = isComplex ? JSON.stringify(value) : String(value);
	if (serialized.length <= MAX_RESOLVED_LEAF_CHARS) return value;
	return {
		_truncated: true,
		preview: serialized.slice(0, MAX_RESOLVED_LEAF_CHARS),
		originalLength: serialized.length,
	};
}

function classifyExpressionFailure(
	raw: string,
	errorMessage: string,
): ResolvedExpressionFailure['reason'] {
	if (mentionsUnreconstructableVar(raw)) return 'unreconstructable-context';

	for (const variable of UNRECONSTRUCTABLE_CONTEXT_VARS) {
		if (errorMessage.includes(variable)) return 'unreconstructable-context';
	}

	return 'expression-error';
}

/**
 * Find the output index of the parent node that connects to the current node's input.
 * Mirrors the editor's `executeDataImpl` connection-walking logic.
 */
function findConnectionOutputIndex(
	workflow: Workflow,
	parentNodeName: string,
	currentNodeName: string,
): number {
	const destinations = workflow.connectionsByDestinationNode[currentNodeName]?.main;
	if (!destinations) return 0;
	for (const mainConnections of destinations) {
		for (const connection of mainConnections ?? []) {
			if (connection?.node === parentNodeName) {
				return connection.index ?? 0;
			}
		}
	}
	return 0;
}

/**
 * Annotate items with `pairedItem` so expressions like `$('Trigger').item.json.x`
 * can trace back to the source item. The runtime / editor both do this on the
 * `connectionInputData` they feed into `getParameterValue` — without it,
 * `WorkflowDataProxy.getPairedItem` throws `pairedItemNoInfo` and parameter
 * resolution fails for expressions that worked fine in the live execution.
 */
function annotatePairedItem(
	items: INodeExecutionData[],
	destinationInputIndex: number,
): INodeExecutionData[] {
	return items.map((item, itemIndex) => ({
		...item,
		pairedItem: { item: itemIndex, input: destinationInputIndex },
	}));
}

/**
 * Reconstruct the `executeData` + `connectionInputData` that the expression engine
 * needs to resolve `$json` / `$input` / `$node[...]` references for a past run.
 *
 * Prefers `runData[currentNode][runIndex].source` — the runtime persists this
 * for every executed run, so it's the authoritative mapping of which parent,
 * which output index, and which parent run produced the items this specific
 * run consumed. That handles Switch/IF branch routing, loops (SplitInBatches),
 * and any parent/current run-index mismatch correctly.
 *
 * Falls back to walking workflow-graph parents only when the current node has
 * no recorded run (e.g., it never executed because of an upstream failure).
 *
 * This is a historical-replay lookup, so we resolve **only against the recorded
 * runData** — we never substitute in workflow-level `pinData`. Pinned nodes
 * still get a synthetic `runData` entry at execution time (that's how their
 * downstream consumers see the pinned items), so trusting runData is sufficient
 * and avoids shadowing the recorded reality with whatever `pinData` happens to
 * be on the snapshot now.
 */
function reconstructExecuteData(
	workflow: Workflow,
	currentNodeName: string,
	runIndex: number,
	runData: IRunData,
): { executeData: IExecuteData; connectionInputData: INodeExecutionData[] } {
	const inputName = 'main';
	const currentNode = workflow.getNode(currentNodeName);
	const currentNodeShim: INode = currentNode ?? ({ name: currentNodeName } as INode);

	// 1. Authoritative path: use the source the runtime recorded for this run.
	const currentNodeRun = runData[currentNodeName]?.[runIndex];
	let destinationInputIndex = 0;
	let firstSource: ISourceData | undefined;
	for (let i = 0; i < (currentNodeRun?.source?.length ?? 0); i++) {
		const entry = currentNodeRun?.source?.[i];
		if (entry !== null && entry !== undefined) {
			firstSource = entry;
			destinationInputIndex = i;
			break;
		}
	}
	if (firstSource) {
		const previousNode = firstSource.previousNode;
		const previousNodeOutput = firstSource.previousNodeOutput ?? 0;
		const previousNodeRun = firstSource.previousNodeRun ?? 0;
		const parentRun = runData[previousNode]?.[previousNodeRun];
		if (parentRun?.data?.[inputName]) {
			return {
				executeData: {
					node: currentNodeShim,
					data: parentRun.data,
					source: { [inputName]: currentNodeRun?.source ?? [] },
				},
				connectionInputData: annotatePairedItem(
					parentRun.data[inputName][previousNodeOutput] ?? [],
					destinationInputIndex,
				),
			};
		}
	}

	// 2. Fallback: current node never ran (or its source is missing). Walk graph
	// parents and use whichever has runData first. Best-effort — branches and
	// loops can't be reconstructed accurately without the runtime's source trace.
	const parentNodes = workflow.getParentNodes(currentNodeName, inputName, 1);
	for (const parentNodeName of parentNodes) {
		const parentRuns = runData[parentNodeName];
		if (!parentRuns || parentRuns.length <= runIndex) continue;
		const parentRun = parentRuns[runIndex];
		if (!parentRun?.data?.[inputName]) continue;

		const outputIndex = findConnectionOutputIndex(workflow, parentNodeName, currentNodeName);
		return {
			executeData: {
				node: currentNodeShim,
				data: parentRun.data,
				source: {
					[inputName]: [
						{
							previousNode: parentNodeName,
							previousNodeOutput: outputIndex,
							previousNodeRun: runIndex,
						},
					],
				},
			},
			connectionInputData: annotatePairedItem(parentRun.data[inputName]?.[outputIndex] ?? [], 0),
		};
	}

	return {
		executeData: { node: currentNodeShim, data: {}, source: null },
		connectionInputData: [],
	};
}

/**
 * Replays expression resolution for a node's parameters against a past execution's
 * data, mirroring the editor's resolved-parameter view. Returns the resolved
 * parameter tree (same shape as `node.parameters`) plus a flat list of expressions
 * that failed to resolve, with `unreconstructable-context` tagged on failures
 * stemming from variables that only exist during a live run (e.g. `$response`).
 */
export async function extractResolvedNodeParameters(
	nodeTypes: NodeTypes,
	executionId: string,
	nodeName: string,
	options?: { itemIndex?: number; runIndex?: number },
): Promise<ResolvedNodeParametersResult> {
	const execution = await Container.get(ExecutionPersistence).findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});

	if (!execution) {
		throw new Error(`Execution ${executionId} not found`);
	}

	// Resolve against the execution's workflow snapshot — what the user actually
	// saw at the time the run happened, not the current draft.
	const workflowData = execution.workflowData;
	const nodeJson = workflowData.nodes.find((n) => n.name === nodeName);
	if (!nodeJson) {
		throw new Error(`Node "${nodeName}" not found in execution ${executionId}`);
	}

	const runData: IRunData = execution.data?.resultData?.runData ?? {};
	const nodeRuns = runData[nodeName] ?? [];
	const itemIndex = options?.itemIndex ?? 0;
	const runIndex = options?.runIndex ?? Math.max(nodeRuns.length - 1, 0);

	const workflow = new Workflow({
		id: workflowData.id,
		name: workflowData.name,
		nodes: workflowData.nodes,
		connections: workflowData.connections,
		active: false,
		nodeTypes,
		staticData: workflowData.staticData,
		settings: workflowData.settings ?? {},
		pinData: workflowData.pinData,
	});

	const { executeData, connectionInputData } = reconstructExecuteData(
		workflow,
		nodeName,
		runIndex,
		runData,
	);

	// `$execution.mode` is `'test' | 'production'`. Map runtime modes — the editor
	// uses 'test' for manual replays, which is what an inspection like this is.
	const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
		$execution: {
			id: executionId,
			mode: execution.mode === 'manual' ? 'test' : 'production',
			resumeUrl: '',
			resumeFormUrl: '',
		},
		$vars: {},
	};

	// HTTP-Request nodes use $request/$response/$pageCount inside pagination
	// expressions — these only exist during a live HTTP roundtrip. The editor
	// stubs them too (see useWorkflowHelpers.ts). We stub the same way so
	// non-pagination expressions in the same node still resolve.
	if (nodeJson.type === HTTP_REQUEST_NODE_TYPE) {
		additionalKeys.$pageCount = 0;
		additionalKeys.$response = { statusCode: 200, headers: {}, body: {} };
		additionalKeys.$request = { headers: {}, body: {}, qs: {} };
	}

	const runExecutionData = execution.data ?? createEmptyRunExecutionData();

	const failedExpressions: ResolvedExpressionFailure[] = [];
	const emptyResolutions: EmptyExpressionResolution[] = [];

	const walk = (value: unknown, path: string): unknown => {
		if (typeof value === 'string' && value.startsWith('=')) {
			try {
				const resolvedValue = workflow.expression.getParameterValue(
					value,
					runExecutionData,
					runIndex,
					itemIndex,
					nodeName,
					connectionInputData,
					'manual',
					additionalKeys,
					executeData,
					false,
					{},
					nodeName,
				);
				// Most "empty parameter" debugging cases are not thrown errors — the
				// expression engine returns `undefined` for nullish chains (e.g. `$json.foo`
				// when `foo` is missing). Flag these explicitly so the agent doesn't have
				// to mentally diff `parameters` against `resolved` to find the cause.
				if (resolvedValue === null || resolvedValue === undefined || resolvedValue === '') {
					const entry: EmptyExpressionResolution = {
						path,
						raw: value,
						resolved: resolvedValue,
					};
					if (mentionsUnreconstructableVar(value)) {
						entry.reason = 'unreconstructable-context';
					}
					emptyResolutions.push(entry);
				}
				return capResolvedLeaf(resolvedValue);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				failedExpressions.push({
					path,
					raw: value,
					error: errorMessage,
					reason: classifyExpressionFailure(value, errorMessage),
				});
				return null;
			}
		}
		if (Array.isArray(value)) {
			return value.map((item, i) => walk(item, `${path}[${i}]`));
		}
		if (value !== null && typeof value === 'object') {
			const out: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(value)) {
				const childPath = path === '' ? k : `${path}.${k}`;
				out[k] = walk(v, childPath);
			}
			return out;
		}
		return value;
	};

	const parameters = (nodeJson.parameters ?? {}) as Record<string, unknown>;
	// When N8N_EXPRESSION_ENGINE=vm, expression evaluation runs in a V8 isolate
	// that must be acquired for this workflow's Expression instance before any
	// `getParameterValue` call — otherwise the VM bridge throws "No bridge
	// acquired". This throwaway workflow never goes through the execution engine,
	// so we acquire/release the isolate ourselves. No-op in legacy mode.
	await workflow.expression.acquireIsolate();
	let resolvedTree: Record<string, unknown>;
	try {
		resolvedTree = walk(parameters, '') as Record<string, unknown>;
	} finally {
		await workflow.expression.releaseIsolate();
	}

	// Resolved values can echo data from upstream nodes (webhook bodies, HTTP
	// responses, etc.) so they're wrapped as untrusted data — same pattern used
	// for node output items in `extractNodeOutput`. `parameters`, `failedExpressions`,
	// and `emptyResolutions` are NOT wrapped: they only contain user-authored
	// expressions and engine-generated text, never substituted upstream content.
	const resolved = wrapUntrustedData(
		JSON.stringify(resolvedTree, null, 2),
		'execution-output',
		`resolved-parameters:${nodeName}`,
	);

	return {
		nodeName,
		runIndex,
		itemIndex,
		parameters,
		resolved,
		failedExpressions,
		emptyResolutions,
	};
}
