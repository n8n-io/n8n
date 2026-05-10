import type { EvaluationMetric } from '@n8n/api-types';
import type { EvaluationConfig } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	EVALUATION_NODE_TYPE,
	EVALUATION_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
	UserError,
	deepCopy,
} from 'n8n-workflow';
import type {
	IConnection,
	IConnections,
	INode,
	INodeParameters,
	IWorkflowBase,
} from 'n8n-workflow';
import { nanoid } from 'nanoid';

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

type UserTriggerEdge = {
	fromNode: string;
	fromBucketIndex: number;
	edgeIndex: number;
};

@Service()
export class WorkflowCompilerService {
	constructor(private readonly providerRegistry: LlmJudgeProviderRegistry) {}

	compile(workflow: IWorkflowBase, config: EvaluationConfig): IWorkflowBase {
		this.assertNoReservedNames(workflow);

		const entryNodeName = this.resolveEntryNode(workflow, config);
		const entryPos = this.positionOf(workflow, entryNodeName) ?? [0, 0];
		const endPos = this.positionOf(workflow, config.endNodeName) ?? [
			entryPos[0] + NODE_STEP_X,
			entryPos[1],
		];

		// The EvaluationTrigger is always added as a NEW node; the user's original
		// upstream node is left intact so expressions referencing it still read naturally
		// in the editor. We then rewrite any `$("<replacedNode>")` references across the
		// workflow to point at the new `__eval_trigger` so they resolve at runtime.
		const replacedNodeName = this.findReplacedUpstreamNode(workflow, entryNodeName);
		const userTriggerEdge = this.findUserTriggerEdgeTo(workflow.connections, entryNodeName);

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

		const userNodesOut = replacedNodeName
			? workflow.nodes.map((n) => this.rewriteExpressionsOnNode(n, replacedNodeName))
			: workflow.nodes;
		const metricNodesOut = replacedNodeName
			? metricNodes.map((n) => this.rewriteExpressionsOnNode(n, replacedNodeName))
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

	private findReplacedUpstreamNode(workflow: IWorkflowBase, entryNodeName: string): string | null {
		const upstreamNames = new Set<string>();
		for (const [fromNode, conn] of Object.entries(workflow.connections)) {
			for (const bucket of conn.main ?? []) {
				for (const edge of bucket ?? []) {
					if (edge?.node === entryNodeName) upstreamNames.add(fromNode);
				}
			}
		}
		if (upstreamNames.size !== 1) return null;
		const [name] = upstreamNames;
		return name;
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

	private rewriteExpressionsOnNode(node: INode, fromName: string): INode {
		return {
			...node,
			parameters: rewriteExpressionRefs(node.parameters, fromName) as INodeParameters,
		};
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

	private findUserTriggerEdgeTo(connections: IConnections, entryNodeName: string): UserTriggerEdge {
		for (const [fromNode, conn] of Object.entries(connections)) {
			const buckets = conn.main ?? [];
			for (let bIdx = 0; bIdx < buckets.length; bIdx++) {
				const edges = buckets[bIdx] ?? [];
				for (let eIdx = 0; eIdx < edges.length; eIdx++) {
					if (edges[eIdx]?.node === entryNodeName) {
						return { fromNode, fromBucketIndex: bIdx, edgeIndex: eIdx };
					}
				}
			}
		}
		throw new UserError(
			`No incoming connection to entry node "${entryNodeName}"; cannot inject evaluation trigger`,
		);
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
		const { preset, prompt, inputs } = metric.config;
		return {
			operation: 'setMetrics',
			metric: preset,
			prompt,
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
		return [
			{
				id: nanoid(),
				name: `__eval_model_${metric.id}`,
				type: metric.config.provider,
				typeVersion: 1,
				position: [metricX, metricY + MODEL_OFFSET_Y],
				credentials: this.credentialsForProvider(
					metric.config.provider,
					metric.config.credentialId,
				),
				parameters: { model: metric.config.model },
			},
		];
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

		// Remove the replaced node's edge into entry; the injected trigger takes its place.
		const { fromNode, fromBucketIndex, edgeIndex } = args.userTriggerEdge;
		const buckets = out[fromNode]?.main;
		if (buckets?.[fromBucketIndex]) {
			buckets[fromBucketIndex].splice(edgeIndex, 1);
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
 * Wraps the contents of an n8n expression (`={{ ... }}`) with a truthy/falsy → 1/0
 * coercion. If the input isn't a standard expression, wraps the whole thing verbatim.
 */
function coerceBooleanExpression(expression: string): string {
	const match = expression.match(/^=\{\{([\s\S]*)\}\}$/);
	const inner = match ? match[1].trim() : JSON.stringify(expression);
	return `={{ (${inner}) ? 1 : 0 }}`;
}

/**
 * Walks a node parameters tree and replaces `$("<fromName>")` references with
 * `$("__eval_trigger")` so expressions authored against the user's trigger node still
 * resolve at runtime after the trigger edge has been redirected to the injected one.
 * Handles both single and double quotes with optional surrounding whitespace.
 */
function rewriteExpressionRefs(value: unknown, fromName: string): unknown {
	const escaped = fromName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = new RegExp(`\\$\\(\\s*(['"])${escaped}\\1\\s*\\)`, 'g');
	const replacement = `$("${TRIGGER_NAME}")`;

	const walk = (v: unknown): unknown => {
		if (typeof v === 'string') return v.replace(pattern, replacement);
		if (Array.isArray(v)) return v.map(walk);
		if (v && typeof v === 'object') {
			const out: Record<string, unknown> = {};
			for (const [k, child] of Object.entries(v)) out[k] = walk(child);
			return out;
		}
		return v;
	};

	return walk(value) as INodeParameters;
}
