import { isRecord } from '@n8n/utils/is-record';

/** n8n MCP tools that create or change a workflow; their results carry its `workflowId`. */
export const N8N_MCP_WORKFLOW_TOOLS: ReadonlySet<string> = new Set([
	'create_workflow_from_code',
	'update_workflow',
]);

/** n8n MCP tools that run a workflow; their results carry the `executionId`. */
export const N8N_MCP_EXECUTION_TOOLS: ReadonlySet<string> = new Set([
	'execute_workflow',
	'test_workflow',
]);

export const N8N_MCP_CREATE_DATA_TABLE_TOOL = 'create_data_table';

export const N8N_MCP_SEARCH_WORKFLOWS_TOOL = 'search_workflows';

const UNTRUSTED_DATA = /^\s*<untrusted_data[^>]*>\s*([\s\S]*?)\s*<\/untrusted_data>\s*$/;

function parseJsonText(text: string): Record<string, unknown> | undefined {
	const wrapped = UNTRUSTED_DATA.exec(text);
	const json = wrapped ? wrapped[1].replace(/&lt;(\s*\/\s*untrusted_data)/gi, '<$1') : text;
	try {
		const parsed: unknown = JSON.parse(json);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function isTextBlock(value: unknown): value is { type: 'text'; text: string } {
	return isRecord(value) && value.type === 'text' && typeof value.text === 'string';
}

function parseTextBlocks(blocks: unknown[]): Record<string, unknown> | undefined {
	if (blocks.length === 0 || !blocks.every(isTextBlock)) return undefined;
	return parseJsonText(blocks.map((block) => block.text).join(''));
}

/** True for an MCP tool result, raw or as model output. */
export function isMcpToolResult(result: unknown): boolean {
	if (!isRecord(result)) return false;
	return (
		Array.isArray(result.content) || (result.type === 'content' && Array.isArray(result.value))
	);
}

/**
 * Normalize a captured tool result to a record. Native tools return the record or
 * its JSON string. MCP tools return text content blocks: raw as
 * `{ content, structuredContent }`, or as the model output
 * `{ type: 'content', value }` with the text wrapped in `<untrusted_data>`.
 */
export function toToolResultRecord(result: unknown): Record<string, unknown> | undefined {
	if (typeof result === 'string') return parseJsonText(result);
	if (!isRecord(result)) return undefined;

	if (isRecord(result.structuredContent)) return result.structuredContent;
	if (Array.isArray(result.content)) return parseTextBlocks(result.content) ?? result;

	if (result.type === 'json' && isRecord(result.value)) return result.value;
	if (result.type === 'text' && typeof result.value === 'string') {
		return parseJsonText(result.value);
	}
	if (result.type === 'content' && Array.isArray(result.value)) {
		return parseTextBlocks(result.value);
	}

	return result;
}
