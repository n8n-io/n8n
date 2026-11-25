import {
	mcpServerToolDescriptionSchema,
	mcpServerToolNameSchema,
	type McpServerToolDraftField,
} from '@n8n/api-types';
import { extractJsonCandidate } from '@n8n/ai-utilities/llm-output';
import { isRecord } from '@n8n/utils/is-record';

import type { WorkflowToolInputSchema } from './workflow-tool-port';

/** What the model gets about the workflow of a tool. */
export interface ToolDraftSource {
	workflowName: string;
	workflowDescription: string | null;
	/** The inputs of the published version. The prompt names each input and its type. */
	inputSchema: WorkflowToolInputSchema;
	nodeNames: string[];
}

/** "Generate" writes one field again. The model gets the current text, to write a new one. */
export interface ToolDraftRequest {
	field: McpServerToolDraftField;
	current: { toolName: string; description: string };
}

const FIELD_JSON: Record<McpServerToolDraftField, string> = {
	toolName: '"toolName": "<tool name>"',
	description: '"description": "<description>"',
};

/** Every input is optional, so the schema adds `null` to each type. The prompt leaves it out. */
function inputType(property: unknown): string {
	const type = isRecord(property) ? property.type : undefined;
	const types = (Array.isArray(type) ? type : [type]).filter(
		(item): item is string => typeof item === 'string' && item !== 'null',
	);
	return types.length > 0 ? types.join(' or ') : 'any';
}

function describeInputs(schema: WorkflowToolInputSchema): string {
	const inputs = Object.entries(schema.properties ?? {}).map(
		([name, property]) => `${name} (${inputType(property)})`,
	);
	return inputs.length > 0 ? inputs.join(', ') : 'none';
}

/**
 * The prompt of one draft call. The model writes the name and the description that AI clients
 * read to pick the tool, or only the field of a "Generate" button.
 */
export function buildToolDraftPrompt(source: ToolDraftSource, request?: ToolDraftRequest): string {
	const fields: McpServerToolDraftField[] = request ? [request.field] : ['toolName', 'description'];
	const lines = [
		'You write the text of one tool of an MCP server. The tool runs an n8n workflow.',
		'AI clients read the tool name and the description to decide when to call the tool.',
		'',
		'The workflow:',
		`Workflow name: ${source.workflowName}`,
		`Workflow description: ${source.workflowDescription?.trim() || 'none'}`,
		`Inputs: ${describeInputs(source.inputSchema)}`,
		`Nodes: ${source.nodeNames.length > 0 ? source.nodeNames.join(', ') : 'none'}`,
		'',
		'Rules:',
	];
	if (fields.includes('toolName')) {
		lines.push(
			'- Tool name: lowercase letters, digits, and "_" only, at most 64 characters. Start with a verb, for example "get_campaign_numbers".',
		);
	}
	if (fields.includes('description')) {
		lines.push(
			'- Description: one to three short sentences. Say what the tool does, what it returns, and when to use it. Do not name n8n, the workflow, or the nodes.',
		);
	}
	if (request) {
		lines.push(
			'',
			`The current tool name: ${request.current.toolName}`,
			`The current description: ${request.current.description || 'none'}`,
			'The builder asked for another text, so the current text is not good enough.',
			'Write a new text for this field only. It must differ from the current text: use other words, for example another verb or a more specific noun.',
		);
	}
	lines.push(
		'',
		`Answer with one JSON object and nothing else: {${fields.map((field) => FIELD_JSON[field]).join(', ')}}`,
	);
	return lines.join('\n');
}

/** The text that the model wrote. A draft of one field has only that field. */
export interface ToolDraft {
	toolName?: string;
	description?: string;
}

export type ToolDraftAnswer = { ok: true; draft: ToolDraft } | { ok: false; error: string };

function parseJsonObject(answer: string): Record<string, unknown> | null {
	try {
		const parsed: unknown = JSON.parse(extractJsonCandidate(answer));
		return isRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * Applies the rules to the answer of the model. Without `field`, both fields must follow the
 * rules. A broken answer gives an error, and the tool keeps its text.
 */
export function parseToolDraftAnswer(
	answer: string,
	field?: McpServerToolDraftField,
): ToolDraftAnswer {
	const parsed = parseJsonObject(answer);
	if (!parsed) return { ok: false, error: 'The answer of the model is not a JSON object.' };

	const draft: ToolDraft = {};
	if (field !== 'description') {
		const toolName = mcpServerToolNameSchema.safeParse(parsed.toolName);
		if (!toolName.success) {
			return {
				ok: false,
				error:
					'The tool name of the draft breaks the rules: use lowercase letters, digits, and "_", at most 64 characters.',
			};
		}
		draft.toolName = toolName.data;
	}
	if (field !== 'toolName') {
		const description = mcpServerToolDescriptionSchema.safeParse(parsed.description);
		if (!description.success || description.data === '') {
			return {
				ok: false,
				error:
					'The description of the draft breaks the rules: it must have text, at most 2000 characters.',
			};
		}
		draft.description = description.data;
	}
	return { ok: true, draft };
}
