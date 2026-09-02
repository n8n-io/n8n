/**
 * Simulation Fixture Generation
 *
 * Generates realistic mock output (pin-data items) for nodes the
 * destructiveness classifier marked `simulate` — including non-deterministic
 * trigger nodes, whose fixture is the event payload they deliver. One batched
 * LLM call keeps the fixtures cross-node consistent. The fixtures live on the
 * build outcome sidecar and become per-execution pin data during
 * verification — they are never written to the workflow.
 *
 * Schema/prompt building blocks come from `@n8n/workflow-sdk` (`mock-data/`),
 * shared with the eval pin-data generators; this service keeps its own
 * system prompt because simulated fixtures have different framing (single
 * item, "simulated because" context, form/wait/trigger pass-through rules).
 *
 * Fallback posture: fixture generation is best-effort. On any failure every
 * simulated node still gets one item, synthesized from its `__schema__` (see
 * `buildSchemaPlaceholderItem`) — verification stays safe (the node never
 * executes) and the chain below it keeps running on the right field names.
 * Zero items, or an item with no fields, would stop every downstream node and
 * turn the run into a no-op that still reports success.
 */

import { isRecord } from '@n8n/utils/is-record';
import type { NodeSchemaContext, OutputSchemaLookup, WorkflowJSON } from '@n8n/workflow-sdk';
import {
	buildDateAnchors,
	buildNodeSchemaSection,
	buildSchemaContexts,
	buildSchemaPlaceholderItem,
	findOutputParserTargets,
	parsePinDataResponse,
	repairStructuredOutput,
	toEngineConnections,
} from '@n8n/workflow-sdk';
import { getParentNodes, mapConnectionsByDestination, type IConnections } from 'n8n-workflow';
import { z } from 'zod';

import { isTriggerNodeType } from './workflow-json-utils';
import type { Logger } from '../../logger';
import type { ModelConfig } from '../../types';
import { SONNET_MODEL } from '../../utils/eval-agents';
import { generateValidatedJson } from '../../utils/generate-validated-json';
import type { NodeSimulationVerdict } from '../../workflow-loop/workflow-loop-state';

/**
 * Fixture items per node name, stored UNWRAPPED (plain objects, not n8n's
 * `{json: ...}` envelope) — the same shape `executionService.run` expects for
 * pin data, so they flow to the verification run without conversion. Only the
 * LLM prompt/response uses the `{json}` envelope; it is unwrapped here.
 */
export type SimulationFixtures = Record<string, Array<Record<string, unknown>>>;

export interface GenerateSimulationFixturesInput {
	workflow: WorkflowJSON;
	plan: NodeSimulationVerdict[];
	/**
	 * Node output `__schema__` lookup (plumbed from the CLI adapter). When it
	 * resolves a schema for a simulated node, the fixture must follow that
	 * structure instead of the model's guess at the service's response shape.
	 */
	outputSchemaLookup?: OutputSchemaLookup;
	/** Host-resolved model used when no eval model API key is configured in the environment. */
	fallbackModelConfig?: ModelConfig;
	logger?: Logger;
}

// Loose on purpose: items may arrive `{json: {...}}`-wrapped, flat, or as an
// empty array — the shared parsePinDataResponse normalizes items and the
// fixture loop below fills empties. Any stricter shape here would zero out
// EVERY fixture on one odd node (generateValidatedJson rejects the whole
// batch on any mismatch).
const FixturesResponseSchema = z.record(z.string(), z.array(z.unknown()));

const SYSTEM_INSTRUCTIONS = `You generate realistic mock output for n8n workflow nodes whose real execution is being simulated (their operation would create, update, send, or delete data in an external system, would wait for an outside event, or would pause the workflow for user action).

For each node, return the output items the node would naturally emit after a SUCCESSFUL run of its operation — matching the response shape of the underlying service (e.g. a Slack message post returns "ok", "ts" and "channel"; a row insert returns the row including its new "id"). Base the field values on the node's parameters so the data is plausible in context, and keep values consistent across nodes (same fictional users, ids, timestamps).

When a node block includes an "Output JSON Schema", it is the node's real recorded output shape — follow its structure exactly (field names and types); only invent fields the schema doesn't cover when the node's parameters clearly require them.

Dates and timestamps MUST be derived from the "## Date anchors" block at the end of the prompt — never from training data. Fixtures feed a real verification run that compares values against the execution clock ($now, Date.now()); stale dates get silently filtered out downstream.

Special node types:
- Trigger nodes (marked as the workflow's simulated event source): emit the EVENT PAYLOAD the trigger delivers into the workflow — the received email/message/record object itself — never an API response envelope, acknowledgement, or request metadata.
- Form nodes (a mid-workflow form page): emit the submitted field values — one key per field defined in the node's formFields, with plausible values, plus "submittedAt".
- Wait nodes: their real output is their INPUT passed through unchanged. Emit data matching what the listed upstream nodes would produce, so downstream expressions keep resolving.

Output: a single JSON object whose keys are node names and whose values are arrays of n8n pin-data items in the form { "json": { ... } }. One item per node is enough.

Return only the JSON object. No prose, no markdown fences.`;

const USER_ACTION_NODE_TYPES = new Set(['n8n-nodes-base.form', 'n8n-nodes-base.wait']);

function formatNodeBlock(
	node: WorkflowJSON['nodes'][number] & { name: string },
	reason: string,
	schemaContext: NodeSchemaContext | undefined,
	upstreamContext?: string,
): string {
	const params = isRecord(node.parameters)
		? JSON.stringify(node.parameters).slice(0, 600)
		: '(none)';
	return [
		`Node name: ${node.name}`,
		`Node type: ${node.type}`,
		`Simulated because: ${reason}`,
		...(isTriggerNodeType(node.type)
			? ["This node is the workflow's simulated event source — emit the event payload it delivers."]
			: []),
		`Parameters: ${params}`,
		...(schemaContext ? buildNodeSchemaSection(schemaContext) : []),
		...(upstreamContext ? [upstreamContext] : []),
	].join('\n');
}

/**
 * For user-action nodes (Form pages, Waits) the output rides on upstream
 * data, so the prompt block includes the immediate upstream nodes' type and
 * parameters — enough for the LLM to fabricate a plausible pass-through.
 */
function buildUpstreamContext(
	workflow: WorkflowJSON,
	nodeName: string,
	connectionsByDestination: IConnections,
): string | undefined {
	const parentNames = getParentNodes(connectionsByDestination, nodeName, 'main', 1);
	if (parentNames.length === 0) return undefined;
	const nodesByName = new Map(
		(workflow.nodes ?? [])
			.filter((n): n is WorkflowJSON['nodes'][number] & { name: string } => Boolean(n.name))
			.map((n) => [n.name, n] as const),
	);
	const lines = parentNames
		.map((name) => {
			const parent = nodesByName.get(name);
			if (!parent) return undefined;
			const params = isRecord(parent.parameters)
				? JSON.stringify(parent.parameters).slice(0, 300)
				: '(none)';
			return `- "${name}" (${parent.type}), parameters: ${params}`;
		})
		.filter((line): line is string => line !== undefined);
	if (lines.length === 0) return undefined;
	return ['Immediate upstream nodes (this node passes their data through):', ...lines].join('\n');
}

/**
 * Nodes whose real output is their INPUT passed through unchanged. They have
 * no output schema of their own, so their floor has to be borrowed from
 * upstream — pinning `{}` on a Wait wipes the fields every node below it
 * reads. (The classifier already lets short waits execute for exactly this
 * reason; a long wait has to be simulated, so it needs the borrowed shape.)
 */
const PASS_THROUGH_NODE_TYPES = new Set([
	'n8n-nodes-base.wait',
	'@n8n/n8n-nodes-langchain.textClassifier',
]);

/** Hops to walk up before giving up on finding an upstream shape. */
const MAX_UPSTREAM_HOPS = 5;

type NamedNode = WorkflowJSON['nodes'][number] & { name: string };

function hasFields(items: Array<Record<string, unknown>> | undefined): boolean {
	return Boolean(items?.some((item) => Object.keys(item).length > 0));
}

/**
 * Lazy per-node schema context, so a placeholder can be built for any node in
 * the workflow — not only the simulated ones the prompt was assembled from.
 */
function createSchemaContextResolver(
	workflow: WorkflowJSON,
	outputSchemaLookup: OutputSchemaLookup | undefined,
	seed: Map<string, NodeSchemaContext> = new Map(),
): (nodeName: string) => NodeSchemaContext | undefined {
	const nodesByName = new Map(
		(workflow.nodes ?? [])
			.filter((node): node is NamedNode => typeof node.name === 'string')
			.map((node) => [node.name, node] as const),
	);
	const outputParserTargets = findOutputParserTargets(workflow);

	return (nodeName: string) => {
		if (seed.has(nodeName)) return seed.get(nodeName);
		const node = nodesByName.get(nodeName);
		if (!node) return undefined;
		const [context] = buildSchemaContexts([node], outputSchemaLookup, outputParserTargets);
		seed.set(nodeName, context);
		return context;
	};
}

/**
 * Give every pass-through node that still has no fields the shape of its
 * nearest upstream ancestor: that ancestor's own fixture when one exists,
 * otherwise the ancestor's schema placeholder.
 */
function withPassThroughFloor(
	fixtures: SimulationFixtures,
	workflow: WorkflowJSON,
	connectionsByDestination: IConnections,
	resolveContext: (nodeName: string) => NodeSchemaContext | undefined,
	now: Date,
): SimulationFixtures {
	const typeByName = new Map(
		(workflow.nodes ?? [])
			.filter((node): node is NamedNode => typeof node.name === 'string')
			.map((node) => [node.name, node.type] as const),
	);
	const result = { ...fixtures };

	for (const nodeName of Object.keys(fixtures)) {
		const nodeType = typeByName.get(nodeName);
		if (!nodeType || !PASS_THROUGH_NODE_TYPES.has(nodeType)) continue;
		if (hasFields(result[nodeName])) continue;
		const borrowed = findUpstreamShape(
			nodeName,
			result,
			connectionsByDestination,
			resolveContext,
			now,
		);
		if (borrowed) result[nodeName] = borrowed;
	}

	return result;
}

function findUpstreamShape(
	nodeName: string,
	fixtures: SimulationFixtures,
	connectionsByDestination: IConnections,
	resolveContext: (nodeName: string) => NodeSchemaContext | undefined,
	now: Date,
): Array<Record<string, unknown>> | undefined {
	const visited = new Set([nodeName]);
	let frontier = getParentNodes(connectionsByDestination, nodeName, 'main', 1);

	for (let hop = 0; hop < MAX_UPSTREAM_HOPS && frontier.length > 0; hop++) {
		const next: string[] = [];
		for (const parent of frontier) {
			if (visited.has(parent)) continue;
			visited.add(parent);
			// A parent that is itself simulated already carries the shape the
			// pass-through node would have seen.
			if (hasFields(fixtures[parent])) return fixtures[parent];
			const placeholder = buildSchemaPlaceholderItem(resolveContext(parent), { now });
			if (Object.keys(placeholder).length > 0) return [placeholder];
			next.push(...getParentNodes(connectionsByDestination, parent, 'main', 1));
		}
		frontier = next;
	}

	return undefined;
}

function placeholderFixtures(
	nodeNames: string[],
	schemaContextByName: Map<string, NodeSchemaContext>,
	now: Date,
): SimulationFixtures {
	return Object.fromEntries(
		nodeNames.map((name) => [
			name,
			[buildSchemaPlaceholderItem(schemaContextByName.get(name), { now })],
		]),
	);
}

/**
 * The same one-item floor without an LLM call, for callers that skip fixture
 * generation entirely (a planning failure) yet must not leave a simulated node
 * pinned with zero items.
 */
export function buildPlaceholderFixtures(
	workflow: WorkflowJSON,
	nodeNames: string[],
	outputSchemaLookup?: OutputSchemaLookup,
	now: Date = new Date(),
): SimulationFixtures {
	const resolveContext = createSchemaContextResolver(workflow, outputSchemaLookup);
	const schemaContextByName = new Map(
		nodeNames.flatMap((name) => {
			const context = resolveContext(name);
			return context ? [[name, context] as const] : [];
		}),
	);
	return withPassThroughFloor(
		placeholderFixtures(nodeNames, schemaContextByName, now),
		workflow,
		mapConnectionsByDestination(toEngineConnections(workflow.connections)),
		resolveContext,
		now,
	);
}

/**
 * Generate one fixture per `simulate`-verdict node. Always returns an entry
 * with at least one non-empty item for every simulated node — LLM output is
 * used when valid, a schema-shaped placeholder otherwise.
 */
export async function generateSimulationFixtures(
	input: GenerateSimulationFixturesInput,
): Promise<SimulationFixtures> {
	const reasonByName = new Map(
		input.plan.filter((v) => v.verdict === 'simulate').map((v) => [v.nodeName, v.reason] as const),
	);
	if (reasonByName.size === 0) return {};

	const nodes = (input.workflow.nodes ?? []).filter(
		(node): node is WorkflowJSON['nodes'][number] & { name: string } =>
			typeof node.name === 'string' && reasonByName.has(node.name),
	);
	const nodeNames = nodes.map((n) => n.name);
	if (nodeNames.length === 0) return {};

	// Shared schema-context enrichment: __schema__ lookup + structured-output
	// parser envelopes for AI roots, keyed back by node name for the blocks.
	const outputParserTargets = findOutputParserTargets(input.workflow);
	const schemaContexts = buildSchemaContexts(nodes, input.outputSchemaLookup, outputParserTargets);
	const schemaContextByName = new Map(schemaContexts.map((ctx) => [ctx.nodeName, ctx] as const));
	// Same map, extended on demand: the pass-through floor needs contexts for
	// upstream nodes that are not simulated themselves.
	const resolveContext = createSchemaContextResolver(
		input.workflow,
		input.outputSchemaLookup,
		schemaContextByName,
	);

	const connectionsByDestination = mapConnectionsByDestination(
		toEngineConnections(input.workflow.connections),
	);
	const now = new Date();
	const userText = [
		'Generate realistic mock output (pin-data items) for the following simulated n8n nodes.',
		input.workflow.name ? `\nWorkflow: ${input.workflow.name}` : '',
		'',
		nodes
			.map((n) =>
				formatNodeBlock(
					n,
					reasonByName.get(n.name) ?? '',
					schemaContextByName.get(n.name),
					USER_ACTION_NODE_TYPES.has(n.type)
						? buildUpstreamContext(input.workflow, n.name, connectionsByDestination)
						: undefined,
				),
			)
			.join('\n\n'),
		'',
		`Output a single JSON object with exactly these keys: ${nodeNames.map((n) => `"${n}"`).join(', ')}.`,
		'Each value: an array with one item shaped like { "json": { ...fields } }.',
		'',
		'## Date anchors',
		buildDateAnchors(now),
	].join('\n');

	const result = await generateValidatedJson('verification-simulation-fixtures', {
		model: SONNET_MODEL,
		instructions: SYSTEM_INSTRUCTIONS,
		userText,
		schema: FixturesResponseSchema,
		fallbackModelConfig: input.fallbackModelConfig,
	});
	if (!result.ok) {
		input.logger?.warn(
			'Simulation fixture generation failed; simulated nodes get schema-shaped placeholders',
			{ reason: result.reason, nodeCount: nodeNames.length },
		);
		return withPassThroughFloor(
			placeholderFixtures(nodeNames, schemaContextByName, now),
			input.workflow,
			connectionsByDestination,
			resolveContext,
			now,
		);
	}

	// Shared normalization + envelope repair, matching the eval pin-data paths:
	// wrap-or-passthrough items, then mechanically fix the two known LLM
	// failure modes for envelope-wrapping parser roots (JSON-encoded envelope
	// string, parsed fields spread flat without the envelope) — the envelope
	// key comes from each root's with-parser `__schema__` variant.
	let pinData = parsePinDataResponse(JSON.stringify(result.data), nodeNames);
	pinData = repairStructuredOutput(pinData, input.workflow, schemaContexts);

	const fixtures: SimulationFixtures = {};
	for (const name of nodeNames) {
		// An omitted node, an empty array, or items that unwrap to nothing all
		// leave the branch below this node unreached, so each falls back to the
		// schema-shaped floor.
		const items = (pinData[name] ?? [])
			.map((item) => (isRecord(item.json) ? item.json : {}))
			.filter((item) => Object.keys(item).length > 0);
		fixtures[name] = items.length
			? items
			: [buildSchemaPlaceholderItem(schemaContextByName.get(name), { now })];
	}
	return withPassThroughFloor(
		fixtures,
		input.workflow,
		connectionsByDestination,
		resolveContext,
		now,
	);
}
