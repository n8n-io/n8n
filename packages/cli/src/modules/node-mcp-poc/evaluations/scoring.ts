import type {
	BenchmarkJudge,
	BenchmarkTask,
	ToolCallOutcome,
	ToolCallRecord,
} from './benchmark.schema';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOf(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

export function classifyToolCall(toolName: string): ToolCallRecord['category'] {
	if (toolName.includes('search_node_actions')) return 'discovery';
	if (toolName.includes('get_node_action')) return 'contract';
	if (
		toolName.includes('resolve_node_parameter') ||
		toolName.includes('resolve_tool_parameter') ||
		toolName.includes('__resolve_') ||
		toolName.includes('list_options')
	) {
		return 'resolution';
	}
	if (toolName.includes('run_node_action') || toolName.endsWith('sheet_append')) return 'execution';
	if (toolName.endsWith('sheet_update')) return 'execution';
	if (toolName.endsWith('message_getAll')) return 'execution';
	return 'other';
}

export function classifyToolOutcome(isError: boolean, result: unknown): ToolCallOutcome {
	const resultRecord = isRecord(result) ? result : undefined;
	const structuredContent = isRecord(resultRecord?.structuredContent)
		? resultRecord.structuredContent
		: undefined;
	const resultIsError =
		isError ||
		resultRecord?.isError === true ||
		structuredContent?.status === 'error' ||
		typeof structuredContent?.error === 'string' ||
		textOf(result).includes('MCP error');
	if (!resultIsError) return 'succeeded';
	const text = textOf(result).toLowerCase();
	if (
		text.includes('invalid tool input') ||
		text.includes('validation_error') ||
		text.includes('required parameter') ||
		text.includes('hidden for the selected operation') ||
		text.includes('resolve "') ||
		text.includes('action not found') ||
		text.includes('expressions are not accepted')
	) {
		return 'semantic_invalid';
	}
	if (
		text.includes('invalid input') ||
		text.includes('input validation error') ||
		text.includes('schema') ||
		text.includes('parse')
	) {
		return 'protocol_invalid';
	}
	return 'execution_error';
}

export function scoreRun(task: BenchmarkTask, judge: BenchmarkJudge, finalAnswer: string) {
	const reasons: string[] = [];
	if (!judge.validExecution) reasons.push(`Judge rejected tool execution: ${judge.reason}`);

	const normalizedAnswer = finalAnswer.toLowerCase();
	const missingAnswerValues = task.oracle.finalAnswerIncludes.filter(
		(value) => !normalizedAnswer.includes(value.toLowerCase()),
	);
	if (missingAnswerValues.length > 0) {
		reasons.push(`Final answer omitted: ${missingAnswerValues.join(', ')}`);
	}

	return { success: reasons.length === 0, reasons };
}
