import { createEvalAgent, extractText } from '../../../src/utils/eval-agents';
import type { BinaryCheck, BinaryCheckContext } from '../types';
import type { WorkflowResponse } from '../../clients/n8n-client';

const DEFAULT_TIMEOUT_MS = 30_000;

const REASONING_FIRST_SUFFIX = `

IMPORTANT: Write your reasoning FIRST, then decide pass or fail. Be concise — focus only on critical issues.

Respond with a JSON object (inside a markdown code fence) with exactly two fields:
- "reasoning": brief analysis (max 3-4 sentences)
- "pass": true or false`;

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

/**
 * Parse a `{ reasoning: string, pass: boolean }` object from LLM text output.
 * Tries fenced JSON first, then raw JSON extraction.
 */
function parseJudgeResult(text: string): { reasoning: string; pass: boolean } | undefined {
	const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
	const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

	try {
		const parsed: unknown = JSON.parse(jsonStr);
		if (isJudgeResult(parsed)) return parsed;
	} catch {
		// Try finding JSON object anywhere in text
		const objectMatch = text.match(/\{[\s\S]*\}/);
		if (objectMatch) {
			try {
				const parsed: unknown = JSON.parse(objectMatch[0]);
				if (isJudgeResult(parsed)) return parsed;
			} catch {
				// fall through
			}
		}
	}

	return undefined;
}

function isJudgeResult(value: unknown): value is { reasoning: string; pass: boolean } {
	if (typeof value !== 'object' || value === null) return false;
	if (!('pass' in value) || !('reasoning' in value)) return false;
	return typeof value.pass === 'boolean' && typeof value.reasoning === 'string';
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

			const agent = createEvalAgent(`eval-binary-${options.name}`, {
				model: ctx.modelId,
				instructions: systemPrompt,
				cache: true,
			});

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
