import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import { isRecord } from './column-ref-utils';
import { detectAiNodes } from './detect-ai-nodes';
import type { Logger } from '../../logger';
import { createEvalAgent, extractText, HAIKU_MODEL } from '../../utils/eval-agents';

const FACET_COUNT = 5;
const DEFAULT_ROW_COUNT = 25;
const SYSTEM_PROMPT_MAX_CHARS = 2000;

export interface SampleRowFacet {
	length: string;
	edgeMode: string;
	instructions: string;
}

export interface AgentContext {
	workflowName: string;
	agentNodeName: string;
	systemPrompt: string | undefined;
	promptTemplate: string | undefined;
	connectedToolNames: string[];
}

export const SAMPLE_ROW_FACETS: readonly SampleRowFacet[] = [
	{
		length: 'short (single sentence or one-line snippet)',
		edgeMode: 'happy — typical, well-formed inputs the agent commonly receives',
		instructions:
			'Produce concise, realistic inputs the AI Agent would handle on a regular day. Each input should fit on one line. No edge cases.',
	},
	{
		length: 'long (multi-paragraph or several lines)',
		edgeMode: 'happy — typical, well-formed inputs',
		instructions:
			'Produce longer realistic inputs spanning multiple paragraphs or several lines. The content stays in-domain and well-structured.',
	},
	{
		length: 'medium (2–3 sentences or comparable size)',
		edgeMode: 'edge — ambiguity, truncations, typos, imperfect formatting',
		instructions:
			'Produce inputs that are messy but plausible: typos, ambiguous references, truncated phrasing, irregular casing or spacing. Still in-domain.',
	},
	{
		length: 'long (multi-paragraph)',
		edgeMode: 'adversarial — out-of-scope requests, contradictions, prompt injection',
		instructions:
			'Produce inputs that try to push the agent off task: out-of-scope demands, internally contradictory requirements, attempts at prompt injection ("ignore previous instructions"), or hostile framing.',
	},
	{
		length: 'mixed extremes (empty, very short, or very long)',
		edgeMode: 'robustness — empty inputs, multi-language fragments, malformed data',
		instructions:
			'Produce robustness probes: an empty input, an input of one or two characters, an input that mixes two languages, and an input with malformed structure (e.g., truncated JSON, broken markup). Use whatever the agent would plausibly stumble on in production.',
	},
];

export function distributeRowCount(rowCount: number): number[] {
	const safe = Math.max(0, Math.floor(rowCount));
	const base = Math.floor(safe / FACET_COUNT);
	const extra = safe % FACET_COUNT;
	return Array.from({ length: FACET_COUNT }, (_, i) => base + (i < extra ? 1 : 0));
}

function readSystemPrompt(parameters: Record<string, unknown> | undefined): string | undefined {
	if (!parameters) return undefined;
	const direct = parameters.systemMessage;
	if (typeof direct === 'string' && direct.length > 0) {
		return direct.slice(0, SYSTEM_PROMPT_MAX_CHARS);
	}
	const options = parameters.options;
	if (isRecord(options)) {
		const nested = options.systemMessage;
		if (typeof nested === 'string' && nested.length > 0) {
			return nested.slice(0, SYSTEM_PROMPT_MAX_CHARS);
		}
	}
	return undefined;
}

function readPromptTemplate(parameters: Record<string, unknown> | undefined): string | undefined {
	if (!parameters) return undefined;
	const text = parameters.text;
	return typeof text === 'string' && text.length > 0 ? text : undefined;
}

function findConnectedTools(workflow: WorkflowJSON, agentName: string): string[] {
	const tools: string[] = [];
	const connections = workflow.connections ?? {};
	for (const [sourceName, byType] of Object.entries(connections)) {
		if (!isRecord(byType)) continue;
		const aiTool = byType?.ai_tool;
		if (!Array.isArray(aiTool)) continue;
		const matches = aiTool.some((slot) => {
			if (!Array.isArray(slot)) return false;
			return slot.some((link) => isRecord(link) && link.node === agentName);
		});
		if (matches) tools.push(sourceName);
	}
	return tools;
}

export function extractAgentContext(
	workflow: WorkflowJSON,
	agentNodeName: string,
): AgentContext | undefined {
	const node = (workflow.nodes ?? []).find((n) => n.name === agentNodeName);
	if (!node) return undefined;
	const parameters = isRecord(node.parameters) ? node.parameters : undefined;
	return {
		workflowName: workflow.name ?? 'Untitled',
		agentNodeName,
		systemPrompt: readSystemPrompt(parameters),
		promptTemplate: readPromptTemplate(parameters),
		connectedToolNames: findConnectedTools(workflow, agentNodeName),
	};
}

const batchRowSchema = z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])));

function isExpectedOutputColumn(column: string): boolean {
	return column.startsWith('expected');
}

function buildAgentContextBlock(context: AgentContext | undefined): string {
	if (!context) return 'Workflow context unavailable.';
	const lines: string[] = [
		`Workflow name: ${context.workflowName}`,
		`AI Agent node: ${context.agentNodeName}`,
	];
	if (context.systemPrompt) {
		lines.push('Agent system prompt:', context.systemPrompt);
	}
	if (context.promptTemplate) {
		lines.push(`Agent prompt template: ${context.promptTemplate}`);
	}
	if (context.connectedToolNames.length > 0) {
		lines.push(`Connected tools: ${context.connectedToolNames.join(', ')}`);
	}
	return lines.join('\n');
}

const FORMAT_INFERENCE =
	"Inspect the agent's system prompt, prompt template, and connected tools to infer what kind of text this agent receives at runtime. It may be a user chat message, output from another tool, scraped web content, structured records (JSON/key-value), document chunks, log lines, code, etc. Generate inputs that look like what would arrive at the agent in production. Do not assume a human user when the agent suggests otherwise.";

const BATCH_SYSTEM_INSTRUCTIONS = `You generate realistic test inputs for an n8n workflow evaluation dataset.

Output: JSON array of objects. Keys = exactly the provided column names. Values = short strings. No prose outside the JSON.

Generate only INPUT data — the inputs the agent would receive in production. Do not invent expected outputs, answers, or labels. Those columns are filled in by the user, who decides what the correct answer is. Generating both inputs and expected outputs with the same model would measure self-consistency, not correctness.

Return only the JSON array.`;

export interface RunBatchInput {
	facet: SampleRowFacet;
	rowCount: number;
	context: AgentContext | undefined;
	columns: string[];
	logger?: Pick<Logger, 'warn'>;
}

function normalizeBatchRow(
	rawRow: Record<string, string | number | boolean | null>,
	columns: string[],
): Record<string, string> {
	const row: Record<string, string> = {};
	for (const col of columns) {
		if (isExpectedOutputColumn(col)) {
			row[col] = '';
			continue;
		}
		const v = rawRow[col];
		if (v === undefined || v === null) row[col] = '';
		else if (typeof v === 'string') row[col] = v;
		else row[col] = String(v);
	}
	return row;
}

function stripMarkdownFences(text: string): string {
	const trimmed = text.trim();
	const fencedMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
	return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

export async function runBatch(input: RunBatchInput): Promise<Array<Record<string, string>>> {
	const requestedRowCount = Math.max(0, Math.floor(input.rowCount));
	if (requestedRowCount <= 0) return [];
	try {
		const generatedColumns = input.columns.filter((column) => !isExpectedOutputColumn(column));
		const agent = createEvalAgent('eval-sample-rows', {
			model: HAIKU_MODEL,
			instructions: BATCH_SYSTEM_INSTRUCTIONS,
		});
		const userText = [
			buildAgentContextBlock(input.context),
			'',
			FORMAT_INFERENCE,
			'',
			`Variation focus for this batch: length = ${input.facet.length}; mode = ${input.facet.edgeMode}.`,
			input.facet.instructions,
			'',
			`Columns: ${generatedColumns.join(', ')}`,
			`Generate exactly ${requestedRowCount} rows.`,
		].join('\n');
		const result = await agent.generate(userText);
		const text = extractText(result);
		const parsed: unknown = JSON.parse(stripMarkdownFences(text));
		const validated = batchRowSchema.safeParse(parsed);
		if (!validated.success) {
			input.logger?.warn('generate-sample-rows: invalid batch rows returned', {
				rowCount: requestedRowCount,
				facet: input.facet.edgeMode,
				issues: validated.error.issues,
			});
			return [];
		}
		return validated.data
			.slice(0, requestedRowCount)
			.map((rawRow) => normalizeBatchRow(rawRow, input.columns));
	} catch (error) {
		input.logger?.warn('generate-sample-rows: batch generation failed', {
			rowCount: requestedRowCount,
			facet: input.facet.edgeMode,
			error,
		});
		return [];
	}
}

export interface GenerateSampleRowsInput {
	workflow: WorkflowJSON;
	columns: string[];
	rowCount?: number;
	targetAgentNodeName?: string;
	logger?: Pick<Logger, 'warn'>;
}

function resolveAgentContext(
	workflow: WorkflowJSON,
	targetAgentNodeName: string | undefined,
): AgentContext | undefined {
	if (targetAgentNodeName) {
		return extractAgentContext(workflow, targetAgentNodeName);
	}
	const detected = detectAiNodes(workflow);
	const firstAgent = detected.aiNodeNames[0];
	if (!firstAgent) return undefined;
	return extractAgentContext(workflow, firstAgent);
}

function emptyRow(columns: string[]): Record<string, string> {
	return Object.fromEntries(columns.map((c) => [c, '']));
}

export async function generateSampleRows(
	input: GenerateSampleRowsInput,
): Promise<Array<Record<string, string>>> {
	const rowCount = input.rowCount ?? DEFAULT_ROW_COUNT;
	const counts = distributeRowCount(rowCount);
	const context = resolveAgentContext(input.workflow, input.targetAgentNodeName);

	const settled = await Promise.allSettled(
		SAMPLE_ROW_FACETS.map(async (facet, i) => {
			if (counts[i] <= 0) return [];
			return await runBatch({
				facet,
				rowCount: counts[i],
				context,
				columns: input.columns,
				logger: input.logger,
			});
		}),
	);

	const merged: Array<Record<string, string>> = [];
	for (const r of settled) {
		if (r.status === 'fulfilled') merged.push(...r.value);
	}
	if (merged.length === 0) return [emptyRow(input.columns)];
	return merged;
}
