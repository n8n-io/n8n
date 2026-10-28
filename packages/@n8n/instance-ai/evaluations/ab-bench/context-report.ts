import type { InstanceAiRunDebugResponse, InstanceAiRunDebugStep } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { usageTokens } from '../utils/conversation-text';

/** Number of tools the report lists from the first LLM call. */
const LARGEST_TOOLS_LIMIT = 12;

const tokenCount = z.number().catch(0);

const usageSchema = z
	.object({
		inputTokens: tokenCount,
		outputTokens: tokenCount,
		inputTokenDetails: z
			.object({
				noCacheTokens: tokenCount,
				cacheReadTokens: tokenCount,
				cacheWriteTokens: tokenCount,
			})
			.partial()
			.catch({}),
	})
	.partial()
	.catch({});

const toolSchema = z.object({ name: z.string().optional(), toolName: z.string().optional() });

export interface ContextStepRow {
	/** 1-based index of the run (one user turn or resume) that made the call. */
	run: number;
	input: number;
	uncached: number;
	cacheRead: number;
	cacheWrite: number;
	output: number;
	systemChars: number;
	toolChars: number;
	toolCount: number;
	messageChars: number;
}

export interface ContextReport {
	threadId: string;
	runs: number;
	llmCalls: number;
	inputTokens: number;
	uncachedTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
	outputTokens: number;
	firstCallInput: number;
	maxCallInput: number;
	firstCallSystemChars: number;
	firstCallToolChars: number;
	firstCallToolCount: number;
	largestTools: Array<{ name: string; chars: number }>;
	steps: ContextStepRow[];
}

function jsonSize(value: unknown): number {
	return JSON.stringify(value ?? null).length;
}

/** `stepTools` has the schemas the model received; without it the debug buffer keeps a name-keyed map. */
function stepTools(step: InstanceAiRunDebugStep): unknown[] {
	const tools = step.input?.stepTools;
	if (Array.isArray(tools)) return tools;
	const toolMap = step.input?.tools;
	if (!isRecord(toolMap)) return [];
	return Object.entries(toolMap).map(([name, tool]) => ({ name, ...(isRecord(tool) ? tool : {}) }));
}

/**
 * Token split of one call, with the runtime's rule (`toTokenUsage` in `@n8n/agents`):
 * a positive SDK detail is trusted as is, because `noCacheTokens` already excludes
 * cache hits. Only when the SDK reports no split does the OpenAI `providerMetadata`
 * figure count, and the uncached part is then the rest of the input.
 */
function tokenSplit(step: InstanceAiRunDebugStep) {
	const details = usageSchema.parse(step.output?.usage).inputTokenDetails ?? {};
	const tokens = usageTokens(step.output?.usage, step.output?.providerMetadata);
	const sdkSplit = [details.noCacheTokens, details.cacheReadTokens, details.cacheWriteTokens].some(
		(value) => (value ?? 0) > 0,
	);
	const cacheRead = sdkSplit ? (details.cacheReadTokens ?? 0) : tokens.cacheRead;
	return {
		input: tokens.input,
		uncached: sdkSplit ? (details.noCacheTokens ?? 0) : Math.max(0, tokens.input - cacheRead),
		cacheRead,
		cacheWrite: tokens.cacheWrite,
		output: tokens.output,
	};
}

/** v7 of the AI SDK names the system prompt `instructions`; older records use `system`. */
function systemPrompt(step: InstanceAiRunDebugStep): unknown {
	return step.input?.instructions ?? step.input?.system;
}

function toStepRow(step: InstanceAiRunDebugStep, run: number): ContextStepRow {
	const tools = stepTools(step);
	return {
		run,
		...tokenSplit(step),
		systemChars: jsonSize(systemPrompt(step)),
		toolChars: jsonSize(tools),
		toolCount: tools.length,
		messageChars: jsonSize(step.input?.messages),
	};
}

function toolSizes(
	step: InstanceAiRunDebugStep | undefined,
): Array<{ name: string; chars: number }> {
	if (!step) return [];
	return stepTools(step)
		.map((tool) => {
			const parsed = toolSchema.safeParse(tool);
			const name = (parsed.success && (parsed.data.name ?? parsed.data.toolName)) || '?';
			return { name, chars: jsonSize(tool) };
		})
		.sort((a, b) => b.chars - a.chars)
		.slice(0, LARGEST_TOOLS_LIMIT);
}

function sum(rows: ContextStepRow[], key: keyof ContextStepRow): number {
	return rows.reduce((total, row) => total + row[key], 0);
}

/** Reduce the run debug records of one thread to per-call token and context sizes. */
export function buildContextReport(
	threadId: string,
	records: InstanceAiRunDebugResponse[],
): ContextReport {
	const steps = records.flatMap((record, index) =>
		record.steps.map((step) => toStepRow(step, index + 1)),
	);
	const first = steps[0];
	return {
		threadId,
		runs: records.length,
		llmCalls: steps.length,
		inputTokens: sum(steps, 'input'),
		uncachedTokens: sum(steps, 'uncached'),
		cacheReadTokens: sum(steps, 'cacheRead'),
		cacheWriteTokens: sum(steps, 'cacheWrite'),
		outputTokens: sum(steps, 'output'),
		firstCallInput: first?.input ?? 0,
		maxCallInput: Math.max(0, ...steps.map((row) => row.input)),
		firstCallSystemChars: first?.systemChars ?? 0,
		firstCallToolChars: first?.toolChars ?? 0,
		firstCallToolCount: first?.toolCount ?? 0,
		largestTools: toolSizes(records.find((record) => record.steps.length > 0)?.steps[0]),
		steps,
	};
}
