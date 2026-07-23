import type { JudgeTokenUsage } from '../types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
	const value = record[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Narrow a usage blob (agents SDK `TokenUsage` or OpenAI Responses `usage`) to the
 *  serializable subset persisted with experiment verdicts. */
export function toJudgeTokenUsage(usage: unknown): JudgeTokenUsage | undefined {
	if (!isPlainObject(usage)) return undefined;
	const result: JudgeTokenUsage = {
		promptTokens: numberField(usage, 'promptTokens') ?? numberField(usage, 'input_tokens'),
		completionTokens: numberField(usage, 'completionTokens') ?? numberField(usage, 'output_tokens'),
		totalTokens: numberField(usage, 'totalTokens') ?? numberField(usage, 'total_tokens'),
		costUsd: numberField(usage, 'cost'),
	};
	const hasAnyField = Object.values(result).some((value) => value !== undefined);
	return hasAnyField ? result : undefined;
}
