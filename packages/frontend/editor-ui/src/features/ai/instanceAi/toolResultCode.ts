import {
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	resolveBuilderToolName,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

function isWorkflowCodeCall(toolName: string, args?: Record<string, unknown>): boolean {
	return (
		resolveBuilderToolName(toolName, args?.action) ===
		WORKFLOW_BUILDER_TOOL_NAMES.GET_WORKFLOW_AS_CODE
	);
}

function isNodeTypeDefinitionsCall(toolName: string, args?: Record<string, unknown>): boolean {
	const baseName = resolveBuilderToolName(toolName);
	return (
		baseName === SHARED_BUILDER_TOOL_NAMES.GET_NODE_TYPES ||
		(baseName === WORKFLOW_BUILDER_TOOL_NAMES.NODES && args?.action === 'type-definition')
	);
}

/**
 * Whether an Assistant tool call returns code: a workflow as code, or node type
 * definitions. Pass the call's arguments, so a former multi-action tool
 * resolves by its `action`.
 */
export function isCodeToolCall(toolName: string, args?: Record<string, unknown>): boolean {
	return isWorkflowCodeCall(toolName, args) || isNodeTypeDefinitionsCall(toolName, args);
}

/** The code in the result of a code tool call, or `null` when the result has no code. */
export function extractToolCallCode(
	toolName: string,
	args: Record<string, unknown> | undefined,
	result: unknown,
): string | null {
	if (!isRecord(result)) return null;
	if (isWorkflowCodeCall(toolName, args)) {
		return typeof result.code === 'string' ? result.code : null;
	}
	if (isNodeTypeDefinitionsCall(toolName, args) && Array.isArray(result.definitions)) {
		return result.definitions
			.filter(isRecord)
			.map((definition) => definition.content)
			.filter((content): content is string => typeof content === 'string')
			.join('\n\n');
	}
	return null;
}
