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

const SYSTEM_INSTRUCTIONS = `You generate realistic mock output for n8n workflow nodes whose real execution is being simulated (their operation would create, update, send, or delete data in an external system).

For each node, return the output items the node would naturally emit after a SUCCESSFUL run of its operation — matching the response shape of the underlying service (e.g. a Slack message post returns "ok", "ts" and "channel"; a row insert returns the row including its new "id"). Base the field values on the node's parameters so the data is plausible in context, and keep values consistent across nodes (same fictional users, ids, timestamps).

Output: a single JSON object whose keys are node names and whose values are arrays of n8n pin-data items in the form { "json": { ... } }. One item per node is enough.

Return only the JSON object. No prose, no markdown fences.`;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatNodeBlock(
	node: WorkflowJSON['nodes'][number] & { name: string },
	reason: string,
): string {
	const params = isRecord(node.parameters)
		? JSON.stringify(node.parameters).slice(0, 600)
		: '(none)';
	return [
		`Node name: ${node.name}`,
		`Node type: ${node.type}`,
		`Simulated because: ${reason}`,
		`Parameters: ${params}`,
	].join('\n');
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

	const userText = [
		'Generate realistic mock output (pin-data items) for the following simulated n8n nodes.',
		input.workflow.name ? `\nWorkflow: ${input.workflow.name}` : '',
		'',
		nodes.map((n) => formatNodeBlock(n, reasonByName.get(n.name) ?? '')).join('\n\n'),
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
