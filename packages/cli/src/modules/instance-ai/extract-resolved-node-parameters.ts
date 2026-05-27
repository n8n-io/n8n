/**
 * Replays expression resolution for a node's parameters against a past
 * execution's saved data — the server-side equivalent of the editor's
 * "resolved parameters" view. Used by `executions(action="get-resolved-node-parameters")`
 * and folded into the `debug` action's failedNode payload.
 *
 * Lives in its own module to keep `instance-ai.adapter.service.ts` focused.
 */
import type { ExecutionRepository } from '@n8n/db';
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
	type IPinData,
	type IRunData,
	type IWorkflowDataProxyAdditionalKeys,
	Workflow,
	createEmptyRunExecutionData,
	HTTP_REQUEST_NODE_TYPE,
} from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';

/**
 * Maximum characters for a single resolved parameter leaf. Resolved parameter
 * values are usually compact (URLs, IDs, headers) — anything bigger is almost
 * certainly an HTTP body or a piece of input data, which the agent can fetch
 * via `get-node-output` if needed.
 */
const MAX_RESOLVED_LEAF_CHARS = 8_000;

/** Expression context variables that can't be reconstructed faithfully outside a live run. */
const UNRECONSTRUCTABLE_CONTEXT_VARS = ['$ai', '$response', '$request', '$pageCount', '$secrets'];

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
	for (const variable of UNRECONSTRUCTABLE_CONTEXT_VARS) {
		if (raw.includes(variable) || errorMessage.includes(variable)) {
			return 'unreconstructable-context';
		}
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
 * Reconstruct the `executeData` + `connectionInputData` that the expression engine
 * needs to resolve `$json` / `$input` / `$node[...]` references for a past run.
 *
 * Mirrors `executeDataImpl` from the editor — see
 * `packages/frontend/editor-ui/src/app/composables/useWorkflowHelpers.ts`. Walks the
 * node's parents in order, taking the first one that has data (pinned data wins
 * over runData), and pulls the items that flowed into this node's input.
 */
function reconstructExecuteData(
	workflow: Workflow,
	currentNodeName: string,
	runIndex: number,
	pinData: IPinData | undefined,
	runData: IRunData,
): { executeData: IExecuteData; connectionInputData: INodeExecutionData[] } {
	const inputName = 'main';
	const currentNode = workflow.getNode(currentNodeName);
	const parentNodes = workflow.getParentNodes(currentNodeName, inputName, 1);

	const fallback: IExecuteData = {
		node: currentNode ?? ({ name: currentNodeName } as INode),
		data: {},
		source: null,
	};

	for (const parentNodeName of parentNodes) {
		const parentPinData = pinData?.[parentNodeName];
		if (parentPinData) {
			return {
				executeData: {
					node: currentNode ?? ({ name: currentNodeName } as INode),
					data: { main: [parentPinData] },
					source: { main: [{ previousNode: parentNodeName }] },
				},
				connectionInputData: parentPinData,
			};
		}

		const parentRuns = runData[parentNodeName];
		if (!parentRuns || parentRuns.length <= runIndex) continue;
		const parentRun = parentRuns[runIndex];
		if (!parentRun?.data?.[inputName]) continue;

		const outputIndex = findConnectionOutputIndex(workflow, parentNodeName, currentNodeName);
		const currentNodeRun = runData[currentNodeName]?.[runIndex];
		const source: IExecuteData['source'] = currentNodeRun?.source
			? { [inputName]: currentNodeRun.source }
			: {
					[inputName]: [
						{
							previousNode: parentNodeName,
							previousNodeOutput: outputIndex,
							previousNodeRun: runIndex,
						},
					],
				};

		return {
			executeData: {
				node: currentNode ?? ({ name: currentNodeName } as INode),
				data: parentRun.data,
				source,
			},
			connectionInputData: parentRun.data[inputName]?.[outputIndex] ?? [],
		};
	}

	return { executeData: fallback, connectionInputData: [] };
}

/**
 * Replays expression resolution for a node's parameters against a past execution's
 * data, mirroring the editor's resolved-parameter view. Returns the resolved
 * parameter tree (same shape as `node.parameters`) plus a flat list of expressions
 * that failed to resolve, with `unreconstructable-context` tagged on failures
 * stemming from variables that only exist during a live run (e.g. `$response`).
 */
export async function extractResolvedNodeParameters(
	executionRepository: ExecutionRepository,
	nodeTypes: NodeTypes,
	executionId: string,
	nodeName: string,
	options?: { itemIndex?: number; runIndex?: number },
): Promise<ResolvedNodeParametersResult> {
	const execution = await executionRepository.findSingleExecution(executionId, {
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
		workflowData.pinData,
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
					emptyResolutions.push({ path, raw: value, resolved: resolvedValue });
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
	const resolvedTree = walk(parameters, '') as Record<string, unknown>;

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
