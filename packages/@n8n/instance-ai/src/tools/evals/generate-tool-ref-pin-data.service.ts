import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import { nodeHasName } from './column-ref-utils';
import type { ToolRef } from './detect-tool-refs.service';
import { HAIKU_MODEL } from '../../utils/eval-agents';
import { generateValidatedJson } from '../../utils/generate-validated-json';

export type ToolRefPinData = Record<string, Array<{ json: Record<string, unknown> }>>;

export interface GenerateToolRefPinDataInput {
	workflow: WorkflowJSON;
	agentNodeName: string;
	refs: ToolRef[];
}

const PinDataResponseSchema = z.record(
	z.string(),
	z.array(z.object({ json: z.record(z.unknown()) })).min(1),
);

const SYSTEM_INSTRUCTIONS = `You generate realistic mock output for n8n trigger and source nodes referenced inside an AI agent's tools/memory.

Output: a single JSON object whose keys are node names and whose values are arrays of n8n pinData items in the form { "json": { ... } }. One item per node is enough.

For each node, return data that matches what the node would naturally emit at runtime — based on its type and parameters. Make sure every requested field appears in your output, with a plausible value.

Return only the JSON object. No prose, no markdown fences.`;

interface NodeContext {
	name: string;
	type: string;
	parameters: Record<string, unknown> | undefined;
	requiredFields: string[];
}

function readAgentPurpose(agent: WorkflowJSON['nodes'][number] | undefined): string | undefined {
	if (!agent) return undefined;
	const params = agent.parameters as Record<string, unknown> | undefined;
	if (!params) return undefined;
	const direct = params.systemMessage;
	if (typeof direct === 'string' && direct.length > 0) return direct.slice(0, 1000);
	const options = params.options;
	if (options && typeof options === 'object') {
		const nested = (options as Record<string, unknown>).systemMessage;
		if (typeof nested === 'string' && nested.length > 0) return nested.slice(0, 1000);
	}
	const text = params.text;
	if (typeof text === 'string' && text.length > 0) return text.slice(0, 1000);
	return undefined;
}

function buildNodeContexts(workflow: WorkflowJSON, refs: ToolRef[]): NodeContext[] {
	const fieldsBySource = new Map<string, Set<string>>();
	for (const r of refs) {
		const set = fieldsBySource.get(r.sourceNodeName) ?? new Set<string>();
		set.add(r.field);
		fieldsBySource.set(r.sourceNodeName, set);
	}
	const nodesByName = new Map(
		(workflow.nodes ?? []).filter(nodeHasName).map((n) => [n.name, n] as const),
	);
	const contexts: NodeContext[] = [];
	for (const [name, fields] of fieldsBySource) {
		const node = nodesByName.get(name);
		if (!node) continue;
		contexts.push({
			name,
			type: node.type,
			parameters: node.parameters as Record<string, unknown> | undefined,
			requiredFields: [...fields],
		});
	}
	return contexts;
}

function formatNodeContextBlock(ctx: NodeContext): string {
	const paramsLine = ctx.parameters
		? `Parameters: ${JSON.stringify(ctx.parameters).slice(0, 500)}`
		: 'Parameters: (none)';
	return [
		`Node name: ${ctx.name}`,
		`Node type: ${ctx.type}`,
		paramsLine,
		`Required fields on json: ${ctx.requiredFields.join(', ')}`,
	].join('\n');
}

function buildUserMessage(contexts: NodeContext[], agentPurpose: string | undefined): string {
	const blocks = contexts.map(formatNodeContextBlock).join('\n\n');
	const purpose = agentPurpose ? `\nAgent purpose / system prompt:\n${agentPurpose}\n` : '';
	const nodeList = contexts.map((c) => `"${c.name}"`).join(', ');
	return [
		'Generate realistic mock output (pinData items) for the following n8n nodes.',
		purpose,
		blocks,
		'',
		`Output a single JSON object with exactly these keys: ${nodeList}.`,
		'Each value: an array with one item shaped like { "json": { ...fields } }.',
		'All required fields above MUST appear inside `json` for the corresponding node.',
	].join('\n');
}

function filterToRequested(parsed: ToolRefPinData, requested: Set<string>): ToolRefPinData {
	const out: ToolRefPinData = {};
	for (const [name, items] of Object.entries(parsed)) {
		if (!requested.has(name)) continue;
		out[name] = items;
	}
	return out;
}

export async function generateToolRefPinData(
	input: GenerateToolRefPinDataInput,
): Promise<ToolRefPinData> {
	if (input.refs.length === 0) return {};
	const contexts = buildNodeContexts(input.workflow, input.refs);
	if (contexts.length === 0) return {};

	const agent = (input.workflow.nodes ?? []).find(
		(n) => nodeHasName(n) && n.name === input.agentNodeName,
	);
	const agentPurpose = readAgentPurpose(agent);
	const userText = buildUserMessage(contexts, agentPurpose);

	const result = await generateValidatedJson('eval-tool-ref-pin-data', {
		model: HAIKU_MODEL,
		instructions: SYSTEM_INSTRUCTIONS,
		userText,
		schema: PinDataResponseSchema,
	});
	if (!result.ok) return {};
	const requested = new Set(contexts.map((c) => c.name));
	return filterToRequested(result.data, requested);
}
