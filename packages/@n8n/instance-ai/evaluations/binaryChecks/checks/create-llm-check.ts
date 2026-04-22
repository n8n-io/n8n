import type { Agent } from '@n8n/agents';

import { createEvalAgent, extractText } from '../../../src/utils/eval-agents';
import type { WorkflowResponse } from '../../clients/n8n-client';
import type { BinaryCheck, BinaryCheckContext } from '../types';

const DEFAULT_TIMEOUT_MS = 30_000;

const REASONING_FIRST_SUFFIX = `

IMPORTANT: Write your reasoning FIRST, then decide pass or fail. Be concise — focus only on critical issues.

Respond with a JSON object (inside a markdown code fence) with exactly two fields:
- "reasoning": brief analysis (max 3-4 sentences)
- "pass": true or false`;

const FENCED_JSON = /```(?:json)?\s*\n?([\s\S]*?)```/;
const BARE_JSON_OBJECT = /\{[\s\S]*\}/;

interface LlmCheckOptions {
	name: string;
	description: string;
	systemPrompt: string;
	humanTemplate: string;
	/**
	 * Optional early-exit check. Return a skip message to skip the check,
	 * or undefined to proceed with evaluation.
	 */
	skipIf?: (workflow: WorkflowResponse, ctx: BinaryCheckContext) => string | undefined;
}

function tryParseJudgeResult(jsonStr: string): { reasoning: string; pass: boolean } | undefined {
	try {
		const parsed: unknown = JSON.parse(jsonStr);
		return isJudgeResult(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Parse a `{ reasoning: string, pass: boolean }` object from LLM text output.
 * Tries fenced JSON first, then raw JSON extraction.
 */
function parseJudgeResult(text: string): { reasoning: string; pass: boolean } | undefined {
	const fenceMatch = text.match(FENCED_JSON);
	const fenced = fenceMatch
		? tryParseJudgeResult(fenceMatch[1].trim())
		: tryParseJudgeResult(text.trim());
	if (fenced) return fenced;

	const objectMatch = text.match(BARE_JSON_OBJECT);
	return objectMatch ? tryParseJudgeResult(objectMatch[0]) : undefined;
}

function isJudgeResult(value: unknown): value is { reasoning: string; pass: boolean } {
	if (typeof value !== 'object' || value === null) return false;
	if (!('pass' in value) || !('reasoning' in value)) return false;
	return typeof value.pass === 'boolean' && typeof value.reasoning === 'string';
}

// Cache agents across check invocations to avoid rebuilding the provider +
// fetch wrapper per call. Keyed by `name:modelId`.
//
// Invariants (must hold for the cache key to be correct):
//   - Each check `name` is bound to exactly one system prompt (the caller
//     constructs the prompt once and passes the same string every call).
//   - The API key is resolved at creation time via process env. If env keys
//     change mid-process, drop this cache. Fine for the CLI (short-lived
//     process); do not reuse this pattern in server code.
const agentCache = new Map<string, Agent>();

function getOrCreateAgent(name: string, modelId: string, instructions: string): Agent {
	const key = `${name}:${modelId}`;
	let agent = agentCache.get(key);
	if (!agent) {
		agent = createEvalAgent(`eval-binary-${name}`, { model: modelId, instructions, cache: true });
		agentCache.set(key, agent);
	}
	return agent;
}

export function createLlmCheck(options: LlmCheckOptions): BinaryCheck {
	const systemPrompt = options.systemPrompt + REASONING_FIRST_SUFFIX;

	return {
		name: options.name,
		description: options.description,
		kind: 'llm',
		async run(workflow: WorkflowResponse, ctx: BinaryCheckContext) {
			if (!ctx.modelId) {
				return { pass: true, comment: 'Skipped: no modelId in context' };
			}

			if (options.skipIf) {
				const skipMessage = options.skipIf(workflow, ctx);
				if (skipMessage) {
					return { pass: true, comment: skipMessage };
				}
			}

			const userMessage = options.humanTemplate
				.replace('{userPrompt}', ctx.prompt)
				.replace('{generatedWorkflow}', JSON.stringify(workflow, null, 2))
				.replace('{agentTextResponse}', ctx.agentTextResponse ?? '')
				.replace(
					'{workflowBefore}',
					ctx.existingWorkflow ? JSON.stringify(ctx.existingWorkflow, null, 2) : '{}',
				);

			const agent = getOrCreateAgent(options.name, ctx.modelId, systemPrompt);

			const timeoutMs = ctx.timeoutMs ?? DEFAULT_TIMEOUT_MS;

			const resultPromise = agent.generate(userMessage, {
				providerOptions: { anthropic: { maxTokens: 8_192 } },
			});

			let timeoutId: ReturnType<typeof setTimeout>;

			const result = await Promise.race([
				resultPromise,
				new Promise<never>((_, reject) => {
					timeoutId = setTimeout(
						() =>
							reject(
								new Error(`LLM check "${options.name}" timed out after ${String(timeoutMs)}ms`),
							),
						timeoutMs,
					);
				}),
			]).finally(() => {
				clearTimeout(timeoutId);
			});

			const text = extractText(result);
			const parsed = parseJudgeResult(text);

			if (!parsed) {
				return {
					pass: false,
					comment: `Failed to parse LLM response. Raw (first 500 chars): ${text.slice(0, 500)}`,
				};
			}

			return { pass: parsed.pass, comment: parsed.reasoning };
		},
	};
}
