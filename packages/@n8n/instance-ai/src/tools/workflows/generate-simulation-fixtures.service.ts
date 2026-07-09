/**
 * Simulation Fixture Generation
 *
 * Generates realistic mock output (pin-data items) for nodes the
 * destructiveness classifier marked `simulate`. One batched LLM call keeps
 * the fixtures cross-node consistent. The fixtures live on the build outcome
 * sidecar and become per-execution pin data during verification — they are
 * never written to the workflow.
 *
 * Fallback posture: fixture generation is best-effort. On any failure every
 * simulated node gets a single empty item — verification stays safe (the node
 * still never executes), downstream data coverage degrades.
 */

import { isRecord } from '@n8n/utils/is-record';
import type { OutputSchemaLookup, WorkflowJSON } from '@n8n/workflow-sdk';
import { getParentNodes, mapConnectionsByDestination, type IConnections } from 'n8n-workflow';
import { z } from 'zod';

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
}

const FixturesResponseSchema = z.record(
	z.string(),
	z.array(z.object({ json: z.record(z.unknown()) })).min(1),
);

const SYSTEM_INSTRUCTIONS = `You generate realistic mock output for n8n workflow nodes whose real execution is being simulated (their operation would create, update, send, or delete data in an external system, or pause the workflow for user action).

For each node, return the output items the node would naturally emit after a SUCCESSFUL run of its operation — matching the response shape of the underlying service (e.g. a Slack message post returns "ok", "ts" and "channel"; a row insert returns the row including its new "id"). Base the field values on the node's parameters so the data is plausible in context, and keep values consistent across nodes (same fictional users, ids, timestamps).

When a node block includes an "Output JSON Schema", it is the node's real recorded output shape — follow its structure exactly (field names and types); only invent fields the schema doesn't cover when the node's parameters clearly require them.

Special node types:
- Form nodes (a mid-workflow form page): emit the submitted field values — one key per field defined in the node's formFields, with plausible values, plus "submittedAt".
- Wait nodes: their real output is their INPUT passed through unchanged. Emit data matching what the listed upstream nodes would produce, so downstream expressions keep resolving.

Output: a single JSON object whose keys are node names and whose values are arrays of n8n pin-data items in the form { "json": { ... } }. One item per node is enough.

Return only the JSON object. No prose, no markdown fences.`;

const USER_ACTION_NODE_TYPES = new Set(['n8n-nodes-base.form', 'n8n-nodes-base.wait']);

/** Keep embedded `__schema__` JSON bounded so one node can't flood the prompt. */
const MAX_SCHEMA_CHARS = 3000;

function formatNodeBlock(
	node: WorkflowJSON['nodes'][number] & { name: string },
	reason: string,
	upstreamContext?: string,
	outputSchema?: Record<string, unknown>,
): string {
	const params = isRecord(node.parameters)
		? JSON.stringify(node.parameters).slice(0, 600)
		: '(none)';
	let schemaBlock: string | undefined;
	if (outputSchema) {
		const schemaStr = JSON.stringify(outputSchema);
		schemaBlock = `Output JSON Schema: ${
			schemaStr.length > MAX_SCHEMA_CHARS ? schemaStr.slice(0, MAX_SCHEMA_CHARS) + '…' : schemaStr
		}`;
	}
	return [
		`Node name: ${node.name}`,
		`Node type: ${node.type}`,
		`Simulated because: ${reason}`,
		`Parameters: ${params}`,
		...(schemaBlock ? [schemaBlock] : []),
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

function emptyFixtures(nodeNames: string[]): SimulationFixtures {
	return Object.fromEntries(nodeNames.map((name) => [name, [{}]]));
}

/** Resolve a node's `__schema__` output schema through the injected lookup; best-effort. */
function lookupOutputSchema(
	node: WorkflowJSON['nodes'][number] & { name: string },
	outputSchemaLookup: OutputSchemaLookup | undefined,
): Record<string, unknown> | undefined {
	if (!outputSchemaLookup) return undefined;
	const params = isRecord(node.parameters) ? node.parameters : undefined;
	return outputSchemaLookup({
		type: node.type,
		typeVersion: node.typeVersion,
		resource: typeof params?.resource === 'string' ? params.resource : undefined,
		operation: typeof params?.operation === 'string' ? params.operation : undefined,
	});
}

/**
 * Generate one fixture per `simulate`-verdict node. Always returns an entry
 * for every simulated node — LLM output is used when valid, a single empty
 * item otherwise.
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

	const connectionsByDestination = mapConnectionsByDestination(
		(input.workflow.connections ?? {}) as IConnections,
	);
	const userText = [
		'Generate realistic mock output (pin-data items) for the following simulated n8n nodes.',
		input.workflow.name ? `\nWorkflow: ${input.workflow.name}` : '',
		'',
		nodes
			.map((n) =>
				formatNodeBlock(
					n,
					reasonByName.get(n.name) ?? '',
					USER_ACTION_NODE_TYPES.has(n.type)
						? buildUpstreamContext(input.workflow, n.name, connectionsByDestination)
						: undefined,
					lookupOutputSchema(n, input.outputSchemaLookup),
				),
			)
			.join('\n\n'),
		'',
		`Output a single JSON object with exactly these keys: ${nodeNames.map((n) => `"${n}"`).join(', ')}.`,
		'Each value: an array with one item shaped like { "json": { ...fields } }.',
	].join('\n');

	const result = await generateValidatedJson('verification-simulation-fixtures', {
		model: SONNET_MODEL,
		instructions: SYSTEM_INSTRUCTIONS,
		userText,
		schema: FixturesResponseSchema,
	});
	if (!result.ok) return emptyFixtures(nodeNames);

	const fixtures: SimulationFixtures = {};
	for (const name of nodeNames) {
		fixtures[name] = result.data[name]?.map((item) => item.json) ?? [{}];
	}
	return fixtures;
}
