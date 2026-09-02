import type { EvaluationMetric } from '@n8n/api-types';
import type { EvaluationConfig } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	applyAccessPatterns,
	EVALUATION_NODE_TYPE,
	EVALUATION_TRIGGER_NODE_TYPE,
	NODES_WITH_RENAMABLE_CONTENT,
	NODES_WITH_RENAMABLE_FORM_HTML_CONTENT,
	NODES_WITH_RENAMEABLE_TOPLEVEL_HTML_CONTENT,
	NodeConnectionTypes,
	NodeHelpers,
	UserError,
	deepCopy,
} from 'n8n-workflow';
import type {
	IConnection,
	IConnections,
	INode,
	INodeParameterResourceLocator,
	INodeParameters,
	INodeTypeDescription,
	IWorkflowBase,
} from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { NodeTypes } from '@/node-types';

import { isCoercibleBooleanExpression } from '../evaluation-config-validator';
import { LlmJudgeProviderRegistry } from '../llm-judge-provider-registry';

const RESERVED_PREFIX = '__eval_';
const TRIGGER_NAME = '__eval_trigger';

// Visual layout offsets (n8n canvas uses [x, y] positions in px)
const NODE_STEP_X = 220;
const MODEL_OFFSET_Y = 220;
/** Gap between the rightmost user node and the first injected metric node. */
const METRIC_COLUMN_GAP = 440;
/** Vertical space each metric row consumes. LLM-judge rows need extra room for the sub-node. */
const EXPRESSION_ROW_HEIGHT = 140;
const LLM_JUDGE_ROW_HEIGHT = 380;

/**
 * Metric input fields (per type) whose value reads from the DATASET row, not the
 * workflow output — retargeted to the eval trigger in `buildMetricNodeParameters`.
 * Everything else stays on `$json` (the end node's output). Keyed exhaustively so
 * a new metric type must declare its inputs' provenance or the build fails.
 */
const DATASET_SOURCED_INPUTS: Record<EvaluationMetric['type'], string[]> = {
	expression: [],
	llm_judge: ['userQuery', 'expectedAnswer'],
	string_similarity: ['expectedAnswer'],
	categorization: ['expectedAnswer'],
	tools_used: ['expectedTools'],
};

type UserTriggerEdge = {
	fromNode: string;
	fromBucketIndex: number;
};

@Service()
export class WorkflowCompilerService {
	constructor(
		private readonly providerRegistry: LlmJudgeProviderRegistry,
		private readonly nodeTypes: NodeTypes,
	) {}

	compile(workflow: IWorkflowBase, config: EvaluationConfig): IWorkflowBase {
		this.assertNoReservedNames(workflow);

		const removedTriggerNames = new Set(
			workflow.nodes.filter((n) => n.type === EVALUATION_TRIGGER_NODE_TYPE).map((n) => n.name),
		);

		// `findUserTriggerEdgeTo` and `findReplacedUpstreamNode` need the graph as it
		// existed BEFORE pruning below: once a pre-existing EvaluationTrigger is removed,
		// its outgoing edge goes with it, so there'd be no incoming connection left to
		// attach the newly-injected trigger to, and no name left to rewrite stale
		// expressions from. Snapshotting the connections (rather than deferring the prune
		// itself) lets `resolveEntryNode`'s auto-detect path run against the PRUNED node
		// list, so a pre-existing EvaluationTrigger that feeds a different node than the
		// real trigger doesn't get counted as a second candidate entry point.
		const originalConnections = workflow.connections;

		// Neutralise evaluation nodes the saved workflow already had so the
		// compiled output doesn't end up with duplicate triggers / metrics.
		workflow = this.prepareExistingEvaluationNodes(workflow, removedTriggerNames);

		const entryNodeName = this.resolveEntryNode(workflow, config);
		const userTriggerEdge = this.findUserTriggerEdgeTo(
			originalConnections,
			entryNodeName,
			removedTriggerNames,
		);

		// The EvaluationTrigger is always added as a NEW node; the user's original
		// upstream node is left intact so expressions referencing it still read naturally
		// in the editor. We then rewrite any reference to it across the workflow to point
		// at the new `__eval_trigger` so it resolves at runtime. Prefers a kept
		// (non-evaluation) node when one also fed the entry node alongside a pre-existing
		// EvaluationTrigger — that trigger's own edge is being replaced regardless and
		// shouldn't count as a second "upstream node" candidate — but falls back to the
		// pre-existing trigger's name when it was the only feeder, so e.g. a metric's
		// reference to it (captured from a workflow built entirely around evaluation)
		// still gets rewritten before that node is deleted.
		const replacedNodeName = this.findReplacedUpstreamNode(
			originalConnections,
			entryNodeName,
			removedTriggerNames,
		);

		// Every removed Evaluation Trigger's name also needs retargeting, not just the
		// one that fed the entry node: a workflow can carry expressions elsewhere (e.g.
		// on a disabled Set Metrics node kept from an earlier wizard run) that reference
		// a pre-existing trigger by name regardless of where it sat in the graph.
		const rewriteTargets = new Set(removedTriggerNames);
		if (replacedNodeName) rewriteTargets.add(replacedNodeName);

		const entryPos = this.positionOf(workflow, entryNodeName) ?? [0, 0];
		const endPos = this.positionOf(workflow, config.endNodeName) ?? [
			entryPos[0] + NODE_STEP_X,
			entryPos[1],
		];

		// Anchor metric nodes clear of the user's entire workflow so they don't overlap
		// existing nodes in the execution view. Vertical spacing per row depends on the
		// metric type: LLM judges have a sub-node directly below and need extra clearance.
		const rightmostX = workflow.nodes.reduce(
			(max, n) => Math.max(max, n.position?.[0] ?? 0),
			endPos[0],
		);
		const metricColumnX = rightmostX + METRIC_COLUMN_GAP;
		const metricRowYs = this.computeMetricRowYs(config.metrics, endPos[1]);

		const triggerNode = this.buildEvaluationTriggerNode(config, entryPos);
		const metricNodes = config.metrics.map((m, i) =>
			this.buildMetricNode(m, metricColumnX, metricRowYs[i]),
		);
		const chatModelNodes = config.metrics.flatMap((m, i) =>
			this.buildChatModelNodeIfNeeded(m, metricColumnX, metricRowYs[i]),
		);

		const userNodesOut =
			rewriteTargets.size > 0
				? workflow.nodes.map((n) => this.rewriteExpressionsOnNode(n, rewriteTargets))
				: workflow.nodes;
		const metricNodesOut =
			rewriteTargets.size > 0
				? metricNodes.map((n) => this.rewriteExpressionsOnNode(n, rewriteTargets))
				: metricNodes;

		const nodes: INode[] = [...userNodesOut, triggerNode, ...metricNodesOut, ...chatModelNodes];
		const connections = this.rewireConnections({
			original: workflow.connections,
			userTriggerEdge,
			entryNodeName,
			metrics: config.metrics,
			endNodeName: config.endNodeName,
		});

		return { ...workflow, nodes, connections };
	}

	private findReplacedUpstreamNode(
		connections: IConnections,
		entryNodeName: string,
		removedTriggerNames: Set<string>,
	): string | null {
		const upstreamNames = new Set<string>();
		for (const [fromNode, conn] of Object.entries(connections)) {
			for (const bucket of conn.main ?? []) {
				for (const edge of bucket ?? []) {
					if (edge?.node === entryNodeName) upstreamNames.add(fromNode);
				}
			}
		}

		// A kept (non-evaluation) node is "the user's original upstream node" whose
		// references get rewritten; a pre-existing EvaluationTrigger feeding the same
		// entry node alongside it doesn't count towards ambiguity.
		const keptCandidates = [...upstreamNames].filter((name) => !removedTriggerNames.has(name));
		if (keptCandidates.length === 1) return keptCandidates[0];
		if (keptCandidates.length === 0 && upstreamNames.size === 1) return [...upstreamNames][0];
		return null;
	}

	private computeMetricRowYs(metrics: EvaluationMetric[], baseY: number): number[] {
		const ys: number[] = [];
		let y = baseY;
		for (const m of metrics) {
			ys.push(y);
			y += m.type === 'llm_judge' ? LLM_JUDGE_ROW_HEIGHT : EXPRESSION_ROW_HEIGHT;
		}
		return ys;
	}

	private rewriteExpressionsOnNode(node: INode, fromNames: Set<string>): INode {
		let parameters = node.parameters;
		for (const fromName of fromNames) {
			parameters = rewriteExpressionRefs(parameters, fromName, node.type);
		}
		return { ...node, parameters };
	}

	/**
	 * Neutralises evaluation nodes the saved workflow already contains so the
	 * config-compiled workflow doesn't end up with duplicates:
	 *  - Pre-existing EvaluationTrigger nodes are removed (this method injects its
	 *    own __eval_trigger; a leftover trigger would fire independently). Their
	 *    connection edges are pruned so the rest of the graph stays consistent.
	 *  - Set Metrics / Set Outputs / Set Inputs nodes are *disabled* rather than
	 *    removed, leaving the workflow structure (and any downstream wiring)
	 *    intact. The runner already ignores disabled evaluation nodes when
	 *    collecting metrics, so they can't double-count.
	 *  - "Is evaluation run" (checkIfEvaluating) nodes are left untouched so their
	 *    branch still resolves correctly during the compiled run.
	 *
	 * This assumes the saved workflow still has its own (non-evaluation) trigger
	 * feeding the entry node — the normal case for a workflow that gained eval
	 * nodes on top of a complete flow.
	 */
	private prepareExistingEvaluationNodes(
		workflow: IWorkflowBase,
		removedTriggerNames: Set<string>,
	): IWorkflowBase {
		const nodes = workflow.nodes
			.filter((n) => !removedTriggerNames.has(n.name))
			.map((n) =>
				n.type === EVALUATION_NODE_TYPE && n.parameters?.operation !== 'checkIfEvaluating'
					? { ...n, disabled: true }
					: n,
			);

		if (removedTriggerNames.size === 0) {
			return { ...workflow, nodes };
		}

		const connections = this.pruneConnectionsTo(workflow.connections, removedTriggerNames);
		return { ...workflow, nodes, connections };
	}

	/**
	 * Returns a copy of `connections` with every reference to a removed node
	 * gone: the removed node's own outgoing entry is dropped, and any edge
	 * pointing at a removed node is filtered out.
	 */
	private pruneConnectionsTo(connections: IConnections, removed: Set<string>): IConnections {
		const out: IConnections = {};
		for (const [sourceNode, byType] of Object.entries(connections)) {
			if (removed.has(sourceNode)) continue;

			const prunedByType: IConnections[string] = {};
			for (const [connType, buckets] of Object.entries(byType)) {
				prunedByType[connType] = buckets.map((bucket) =>
					bucket === null ? null : bucket.filter((edge) => !removed.has(edge.node)),
				);
			}
			out[sourceNode] = prunedByType;
		}
		return out;
	}

	private assertNoReservedNames(workflow: IWorkflowBase): void {
		const offender = workflow.nodes.find((n) => n.name.startsWith(RESERVED_PREFIX));
		if (offender) {
			throw new UserError(
				`Node name "${offender.name}" uses the reserved "${RESERVED_PREFIX}" prefix`,
			);
		}
	}

	private resolveEntryNode(workflow: IWorkflowBase, config: EvaluationConfig): string {
		if (config.startNodeName) {
			return config.startNodeName;
		}

		const triggerNames = workflow.nodes.filter((n) => this.isTrigger(n)).map((n) => n.name);
		const downstream = new Set<string>();
		for (const tName of triggerNames) {
			for (const bucket of workflow.connections[tName]?.main ?? []) {
				for (const edge of bucket ?? []) downstream.add(edge.node);
			}
		}

		if (downstream.size === 0) {
			throw new UserError(
				'Cannot determine entry node: workflow has no trigger with a downstream connection',
			);
		}
		if (downstream.size > 1) {
			throw new UserError(
				'Cannot auto-determine entry node: workflow trigger has multiple downstream nodes; set startNodeName explicitly',
			);
		}
		return [...downstream][0];
	}

	private isTrigger(node: INode): boolean {
		return /trigger|webhook|manual/i.test(node.type);
	}

	private findUserTriggerEdgeTo(
		connections: IConnections,
		entryNodeName: string,
		removedTriggerNames: Set<string>,
	): UserTriggerEdge {
		const matches: UserTriggerEdge[] = [];
		for (const [fromNode, conn] of Object.entries(connections)) {
			const buckets = conn.main ?? [];
			for (let bIdx = 0; bIdx < buckets.length; bIdx++) {
				const edges = buckets[bIdx] ?? [];
				if (edges.some((edge) => edge?.node === entryNodeName)) {
					matches.push({ fromNode, fromBucketIndex: bIdx });
				}
			}
		}
		if (matches.length === 0) {
			throw new UserError(
				`No incoming connection to entry node "${entryNodeName}"; cannot inject evaluation trigger`,
			);
		}

		// Prefer the edge from a kept (non-evaluation) node — deterministic regardless
		// of key order in `connections` — so a pre-existing EvaluationTrigger listed
		// before the real trigger doesn't have its edge spliced out in its place,
		// leaving the real trigger's edge dangling. Falls back to the Evaluation
		// Trigger's own edge when it was the sole feeder (TRUST-407).
		const nonEvalMatch = matches.find((m) => !removedTriggerNames.has(m.fromNode));
		return nonEvalMatch ?? matches[0];
	}

	private positionOf(workflow: IWorkflowBase, nodeName: string): [number, number] | undefined {
		const node = workflow.nodes.find((n) => n.name === nodeName);
		return node?.position;
	}

	private buildEvaluationTriggerNode(config: EvaluationConfig, entryPos: [number, number]): INode {
		const datasetRef =
			config.datasetSource === 'data_table'
				? (config.datasetRef as { dataTableId: string })
				: undefined;
		return {
			id: nanoid(),
			name: TRIGGER_NAME,
			type: EVALUATION_TRIGGER_NODE_TYPE,
			typeVersion: 4.7,
			position: [entryPos[0] - NODE_STEP_X, entryPos[1]],
			parameters: {
				source: 'dataTable',
				dataTableId: datasetRef?.dataTableId ?? '',
			},
		};
	}

	private buildMetricNode(metric: EvaluationMetric, x: number, y: number): INode {
		return {
			id: nanoid(),
			name: `__eval_metric_${metric.id}`,
			type: EVALUATION_NODE_TYPE,
			typeVersion: 4.7,
			position: [x, y],
			parameters: this.buildMetricNodeParameters(metric),
		};
	}

	private buildMetricNodeParameters(metric: EvaluationMetric): INodeParameters {
		const params = this.metricParametersByType(metric);
		// Dataset-row inputs are authored as `$json.<column>`, but at the metric node
		// `$json` is the end node's OUTPUT. Retarget those fields to the eval trigger.
		for (const field of DATASET_SOURCED_INPUTS[metric.type]) {
			const value = params[field];
			if (typeof value === 'string') {
				params[field] = resolveDatasetSourcedInput(value);
			}
		}
		return params;
	}

	private metricParametersByType(metric: EvaluationMetric): INodeParameters {
		if (metric.type === 'expression') {
			// The legacy aggregator only accepts numeric metric values (averaging over cases).
			// For boolean metrics, coerce true→1 / false→0 so an averaged result reads as a
			// pass rate. Numeric metrics pass through unchanged.
			if (
				metric.config.outputType === 'boolean' &&
				!isCoercibleBooleanExpression(metric.config.expression)
			) {
				throw new UserError(
					`Metric "${metric.name}" expression cannot be coerced into a boolean (multi-segment templates are not supported)`,
				);
			}
			const value =
				metric.config.outputType === 'boolean'
					? coerceBooleanExpression(metric.config.expression)
					: metric.config.expression;
			return {
				operation: 'setMetrics',
				metric: 'customMetrics',
				metrics: {
					assignments: [{ id: nanoid(), name: metric.name, value, type: 'number' }],
				},
			};
		}
		if (metric.type === 'string_similarity') {
			return {
				operation: 'setMetrics',
				metric: 'stringSimilarity',
				actualAnswer: metric.config.inputs.actualAnswer,
				expectedAnswer: metric.config.inputs.expectedAnswer,
				options: { metricName: metric.name },
			};
		}
		if (metric.type === 'categorization') {
			return {
				operation: 'setMetrics',
				metric: 'categorization',
				actualAnswer: metric.config.inputs.actualAnswer,
				expectedAnswer: metric.config.inputs.expectedAnswer,
				options: { metricName: metric.name },
			};
		}
		if (metric.type === 'tools_used') {
			return {
				operation: 'setMetrics',
				metric: 'toolsUsed',
				expectedTools: metric.config.inputs.expectedTools,
				intermediateSteps: metric.config.inputs.intermediateSteps,
				options: { metricName: metric.name },
			};
		}
		const { preset, prompt, inputs } = metric.config;
		return {
			operation: 'setMetrics',
			metric: preset,
			...(prompt !== undefined ? { prompt } : {}),
			actualAnswer: inputs.actualAnswer,
			...(preset === 'correctness' ? { expectedAnswer: inputs.expectedAnswer ?? '' } : {}),
			...(preset === 'helpfulness' ? { userQuery: inputs.userQuery ?? '' } : {}),
			options: {
				metricName: metric.name,
			},
		};
	}

	private buildChatModelNodeIfNeeded(
		metric: EvaluationMetric,
		metricX: number,
		metricY: number,
	): INode[] {
		if (metric.type !== 'llm_judge') return [];
		const { typeVersion, model } = this.resolveChatModelShape(
			metric.config.provider,
			metric.config.model,
		);
		return [
			{
				id: nanoid(),
				name: `__eval_model_${metric.id}`,
				type: metric.config.provider,
				typeVersion,
				position: [metricX, metricY + MODEL_OFFSET_Y],
				credentials: this.credentialsForProvider(
					metric.config.provider,
					metric.config.credentialId,
				),
				parameters: { model },
			},
		];
	}

	/**
	 * Shapes the judge's chat-model sub-node to the provider node's current definition
	 * instead of pinning it to a legacy version: uses the node's default `typeVersion`
	 * and emits `model` as a resource locator when that version's `model` property
	 * expects one (a plain string otherwise). Falls back to the legacy v1 + string form
	 * if the node type can't be introspected, so judging keeps working.
	 */
	private resolveChatModelShape(
		provider: string,
		modelId: string,
	): { typeVersion: number; model: string | INodeParameterResourceLocator } {
		const legacyShape = { typeVersion: 1, model: modelId };
		try {
			const description = this.nodeTypes.getByNameAndVersion(provider).description;
			const typeVersion = Array.isArray(description.version)
				? (description.defaultVersion ?? Math.max(...description.version))
				: description.version;
			if (!Number.isFinite(typeVersion)) return legacyShape;

			return {
				typeVersion,
				model: this.modelExpectsResourceLocator(description, typeVersion)
					? { __rl: true, mode: 'list', value: modelId, cachedResultName: modelId }
					: modelId,
			};
		} catch {
			return legacyShape;
		}
	}

	/**
	 * Whether the `model` property shown at `typeVersion` is a resource locator. Chat-model
	 * nodes gate several `model` variants by `@version`, so pick the one that displays at
	 * this version and read its declared type.
	 */
	private modelExpectsResourceLocator(
		description: INodeTypeDescription,
		typeVersion: number,
	): boolean {
		const modelProp = description.properties.find(
			(p) =>
				p.name === 'model' && NodeHelpers.displayParameter({}, p, { typeVersion }, description),
		);
		return modelProp?.type === 'resourceLocator';
	}

	private credentialsForProvider(provider: string, credentialId: string) {
		const entry = this.providerRegistry.get(provider);
		if (!entry || entry.credentialTypes.length === 0) {
			throw new UserError(`Unsupported LLM judge provider "${provider}"`);
		}
		// The validator has already confirmed the credential's type matches one of
		// the entry's accepted credentialTypes. The first entry is the primary
		// credential type for the node — the same shape n8n uses everywhere else
		// when injecting credentials into a sub-node by id.
		const credentialType = entry.credentialTypes[0].name;
		return { [credentialType]: { id: credentialId, name: '' } };
	}

	private rewireConnections(args: {
		original: IConnections;
		userTriggerEdge: UserTriggerEdge;
		entryNodeName: string;
		metrics: EvaluationMetric[];
		endNodeName: string;
	}): IConnections {
		const out: IConnections = deepCopy(args.original);

		// Remove the replaced node's edge into entry; the injected trigger takes its
		// place. Filtered by target name rather than a recorded index: `out` may have
		// been pruned since `userTriggerEdge` was captured (a removed EvaluationTrigger's
		// bucket is dropped wholesale, never reordered — but matching by name means that
		// invariant doesn't have to hold for this to stay correct).
		const { fromNode, fromBucketIndex } = args.userTriggerEdge;
		const buckets = out[fromNode]?.main;
		if (buckets?.[fromBucketIndex]) {
			buckets[fromBucketIndex] = buckets[fromBucketIndex].filter(
				(edge) => edge?.node !== args.entryNodeName,
			);
			if (buckets.every((b) => (b ?? []).length === 0)) {
				delete out[fromNode];
			}
		}

		out[TRIGGER_NAME] = {
			main: [[{ node: args.entryNodeName, type: 'main', index: 0 }]],
		};

		// Replace endNode's main outgoing edges with the metric fan-out. Downstream nodes
		// the user had after endNode must NOT execute in eval mode (they're outside the
		// evaluated slice and may fail on missing credentials, etc.). Non-main connections
		// (sub-node wires like ai_languageModel) are preserved.
		//
		// For nodes with multiple main buckets (IF/Switch as end node), each bucket gets
		// the same metric fan-out so the metrics fire on whichever branch the engine takes.
		// Only one bucket runs per case, so there's no double-execution.
		const metricEdges: IConnection[] = args.metrics.map((m) => ({
			node: `__eval_metric_${m.id}`,
			type: 'main',
			index: 0,
		}));
		const existingEnd = out[args.endNodeName] ?? {};
		const existingMain = existingEnd.main ?? [];
		const bucketCount = Math.max(existingMain.length, 1);
		out[args.endNodeName] = {
			...existingEnd,
			main: Array.from({ length: bucketCount }, () => [...metricEdges]),
		};

		for (const m of args.metrics) {
			if (m.type !== 'llm_judge') continue;
			const modelNode = `__eval_model_${m.id}`;
			const metricNode = `__eval_metric_${m.id}`;
			out[modelNode] = {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: metricNode, type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			};
		}

		return out;
	}
}

/**
 * Retarget a dataset-sourced input's `$json` base to the eval trigger. Only n8n
 * expressions (leading `=`) reference the `$json` variable — a fixed literal is
 * returned unchanged so text that merely contains "$json" isn't corrupted. Within
 * an expression only the bare `$json` token is rewritten, so an explicit
 * `$('Node')…` reference is left untouched too.
 */
function resolveDatasetSourcedInput(value: string): string {
	if (!value.startsWith('=')) return value;
	return value.replace(/\$json\b/g, () => `$('${TRIGGER_NAME}').item.json`);
}

/**
 * Wraps the contents of an n8n expression (`={{ ... }}`) with a truthy/falsy → 1/0
 * coercion. If the input isn't a standard expression, wraps the whole thing verbatim.
 */
function coerceBooleanExpression(expression: string): string {
	const match = expression.match(/^=\{\{([\s\S]*)\}\}$/);
	const inner = match ? match[1].trim() : JSON.stringify(expression);
	return `={{ (${inner}) ? 1 : 0 }}`;
}

/**
 * Collapses incidental whitespace inside a `$(...)`, `$node[...]`, or
 * `$items(...)` argument referencing `fromName` specifically — e.g.
 * `$( 'fromName' )` → `$('fromName')` — so a hand-typed expression with extra
 * spacing still matches `applyAccessPatterns`'s access patterns, which (like
 * n8n's own node-rename flow) expect the tight form. Whitespace in these
 * positions never changes what the expression evaluates to, so this is purely
 * cosmetic ahead of the actual rewrite. Scoped to `fromName` (rather than any
 * name) so it can't reshape an unrelated `$(...)`-shaped string literal that
 * happens to appear elsewhere in the same expression.
 */
function tightenAccessPatternSpacing(value: string, fromName: string): string {
	const name = fromName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return value
		.replace(
			// eslint-disable-next-line n8n-local-rules/no-dynamic-regexp -- node name is escaped before pattern construction
			new RegExp(`\\$\\(\\s*(['"])\\s*${name}\\s*\\1\\s*\\)`, 'g'),
			(_m, q: string) => `$(${q}${fromName}${q})`,
		)
		.replace(
			// eslint-disable-next-line n8n-local-rules/no-dynamic-regexp -- node name is escaped before pattern construction
			new RegExp(`\\$node\\[\\s*(['"])\\s*${name}\\s*\\1\\s*\\]`, 'g'),
			(_m, q: string) => `$node[${q}${fromName}${q}]`,
		)
		.replace(
			// eslint-disable-next-line n8n-local-rules/no-dynamic-regexp -- node name is escaped before pattern construction
			new RegExp(`\\$items\\(\\s*(['"])\\s*${name}\\s*\\1\\s*([,)])`, 'g'),
			(_m, q: string, tail: string) => `$items(${q}${fromName}${q}${tail}`,
		);
}

/** Rewrites `fromName` references via `applyAccessPatterns`, tightening spacing first. */
function rewriteExpressionValue(value: string, fromName: string): string {
	return applyAccessPatterns(tightenAccessPatternSpacing(value, fromName), fromName, TRIGGER_NAME);
}

/**
 * Walks a value tree and rewrites every `=`-prefixed expression's reference to
 * `fromName` — via `$("<fromName>")`, `$node["<fromName>"]`, `$node.<fromName>`,
 * or `$items("<fromName>")` — to point at `__eval_trigger`. Never touches a
 * plain literal (non-expression) string, so sample data that happens to
 * contain `$(...)`-shaped text isn't corrupted.
 */
function walkExpressions(value: unknown, fromName: string): unknown {
	if (typeof value === 'string') {
		return value.startsWith('=') ? rewriteExpressionValue(value, fromName) : value;
	}
	if (Array.isArray(value)) return value.map((item) => walkExpressions(item, fromName));
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, child] of Object.entries(value)) out[k] = walkExpressions(child, fromName);
		return out;
	}
	return value;
}

/**
 * Rewrites the `html` field of each Form-field entry whose `fieldType` is
 * `'html'` — mirrors `renameFormFields` in `n8n-workflow`, which the canvas
 * rename flow uses for the same node type. Not exported from `n8n-workflow`,
 * so reimplemented here against the same shape.
 */
function rewriteFormFieldsHtml(parameters: INodeParameters, fromName: string): INodeParameters {
	const formFields = parameters.formFields;
	if (
		!formFields ||
		typeof formFields !== 'object' ||
		!('values' in formFields) ||
		// TypeScript thinks this is `Array.values` and gets very confused here
		// eslint-disable-next-line @typescript-eslint/unbound-method
		!Array.isArray(formFields.values)
	) {
		return parameters;
	}

	const values: INodeParameters[] = formFields.values.map((entry: unknown): INodeParameters => {
		if (
			entry &&
			typeof entry === 'object' &&
			(entry as { fieldType?: unknown }).fieldType === 'html' &&
			typeof (entry as { html?: unknown }).html === 'string'
		) {
			return {
				...(entry as INodeParameters),
				html: rewriteExpressionValue((entry as { html: string }).html, fromName),
			};
		}
		return entry as INodeParameters;
	});

	return { ...parameters, formFields: { ...formFields, values } as INodeParameters };
}

/**
 * Rewrites every reference to `fromName` across a node's parameters to point
 * at `__eval_trigger`, using the same `applyAccessPatterns` helper the editor
 * uses when a node is renamed. Beyond ordinary `=`-prefixed expressions
 * (handled everywhere), mirrors the node-type-specific categories
 * `Workflow.renameNode` also treats as renamable without a leading `=`: a
 * Code node's `jsCode`, an HTML/Mailgun node's top-level
 * `html`, and a Form node's per-field `html` content — so a reference to the
 * replaced trigger inside a template doesn't dangle just because it isn't a
 * plain expression.
 */
function rewriteExpressionRefs(
	parameters: INodeParameters,
	fromName: string,
	nodeType: string,
): INodeParameters {
	let result = walkExpressions(parameters, fromName) as INodeParameters;

	if (NODES_WITH_RENAMABLE_CONTENT.has(nodeType) && typeof result.jsCode === 'string') {
		result = { ...result, jsCode: rewriteExpressionValue(result.jsCode, fromName) };
	}
	if (
		NODES_WITH_RENAMEABLE_TOPLEVEL_HTML_CONTENT.has(nodeType) &&
		typeof result.html === 'string'
	) {
		result = { ...result, html: rewriteExpressionValue(result.html, fromName) };
	}
	if (NODES_WITH_RENAMABLE_FORM_HTML_CONTENT.has(nodeType)) {
		result = rewriteFormFieldsHtml(result, fromName);
	}

	return result;
}
