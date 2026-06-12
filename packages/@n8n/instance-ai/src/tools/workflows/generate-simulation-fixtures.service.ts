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
 * simulated node gets `[{ json: {} }]` — verification stays safe (the node
 * still never executes), downstream data coverage degrades.
 */

import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import { createEvalAgent, extractText, HAIKU_MODEL } from '../../utils/eval-agents';
import type { NodeSimulationVerdict } from '../../workflow-loop/workflow-loop-state';

export type SimulationFixtures = Record<string, Array<{ json: Record<string, unknown> }>>;

export interface GenerateSimulationFixturesInput {
	workflow: WorkflowJSON;
	plan: NodeSimulationVerdict[];
}

const FixturesResponseSchema = z.record(
	z.string(),
	z.array(z.object({ json: z.record(z.unknown()) })).min(1),
);

const SYSTEM_INSTRUCTIONS = `You generate realistic mock output for n8n workflow nodes whose real execution is being simulated (their operation would create, update, send, or delete data in an external system, or pause the workflow for user action).

For each node, return the output items the node would naturally emit after a SUCCESSFUL run of its operation — matching the response shape of the underlying service (e.g. a Slack message post returns "ok", "ts" and "channel"; a row insert returns the row including its new "id"). Base the field values on the node's parameters so the data is plausible in context, and keep values consistent across nodes (same fictional users, ids, timestamps).

Special node types:
- Form nodes (a mid-workflow form page): emit the submitted field values — one key per field defined in the node's formFields, with plausible values, plus "submittedAt".
- Wait nodes: their real output is their INPUT passed through unchanged. Emit data matching what the listed upstream nodes would produce, so downstream expressions keep resolving.

Output: a single JSON object whose keys are node names and whose values are arrays of n8n pin-data items in the form { "json": { ... } }. One item per node is enough.

Return only the JSON object. No prose, no markdown fences.`;

const USER_ACTION_NODE_TYPES = new Set(['n8n-nodes-base.form', 'n8n-nodes-base.wait']);

/**
 * Immediate upstream node names per node, derived from `main` connections.
 * Used to give the LLM pass-through context for user-action nodes (a Wait
 * node's output is its input; a Form page's output rides on upstream data).
 */
function buildUpstreamMap(workflow: WorkflowJSON): Map<string, string[]> {
	const parents = new Map<string, string[]>();
	for (const [sourceName, outputs] of Object.entries(workflow.connections ?? {})) {
		if (!isRecord(outputs) || !Array.isArray(outputs.main)) continue;
		for (const port of outputs.main) {
			if (!Array.isArray(port)) continue;
			for (const target of port) {
				if (!isRecord(target) || typeof target.node !== 'string') continue;
				const list = parents.get(target.node) ?? [];
				list.push(sourceName);
				parents.set(target.node, list);
			}
		}
	}
	return parents;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatNodeBlock(
	node: WorkflowJSON['nodes'][number] & { name: string },
	reason: string,
	upstreamContext?: string,
): string {
	const params = isRecord(node.parameters)
		? JSON.stringify(node.parameters).slice(0, 600)
		: '(none)';
	return [
		`Node name: ${node.name}`,
		`Node type: ${node.type}`,
		`Simulated because: ${reason}`,
		`Parameters: ${params}`,
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
	upstreamMap: Map<string, string[]>,
): string | undefined {
	const parentNames = upstreamMap.get(nodeName);
	if (!parentNames?.length) return undefined;
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

function stripMarkdownFences(text: string): string {
	const trimmed = text.trim();
	const fencedMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
	return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function emptyFixtures(nodeNames: string[]): SimulationFixtures {
	return Object.fromEntries(nodeNames.map((name) => [name, [{ json: {} }]]));
}

/**
 * Generate one fixture per `simulate`-verdict node. Always returns an entry
 * for every simulated node — LLM output is used when valid, `[{ json: {} }]`
 * otherwise.
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

	const upstreamMap = buildUpstreamMap(input.workflow);
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
						? buildUpstreamContext(input.workflow, n.name, upstreamMap)
						: undefined,
				),
			)
			.join('\n\n'),
		'',
		`Output a single JSON object with exactly these keys: ${nodeNames.map((n) => `"${n}"`).join(', ')}.`,
		'Each value: an array with one item shaped like { "json": { ...fields } }.',
	].join('\n');

	try {
		const llm = createEvalAgent('verification-simulation-fixtures', {
			model: HAIKU_MODEL,
			instructions: SYSTEM_INSTRUCTIONS,
		});
		const result = await llm.generate([
			{ role: 'user' as const, content: [{ type: 'text' as const, text: userText }] },
		]);
		const parsed: unknown = JSON.parse(stripMarkdownFences(extractText(result)));
		const validated = FixturesResponseSchema.safeParse(parsed);
		if (!validated.success) return emptyFixtures(nodeNames);

		const fixtures: SimulationFixtures = {};
		for (const name of nodeNames) {
			fixtures[name] = validated.data[name] ?? [{ json: {} }];
		}
		return fixtures;
	} catch {
		return emptyFixtures(nodeNames);
	}
}
