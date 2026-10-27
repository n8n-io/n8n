/**
 * One-shot "LLM returns a JSON object" helper for eval-agent calls: create the
 * agent, send the user text, strip markdown fences, parse, validate against a
 * zod schema. Never throws — callers own their fallback (and the schema-issue
 * details when they want to log them).
 *
 * Lives outside `eval-agents.ts` so tests can mock this module while the
 * helper's own tests mock `eval-agents`.
 */

import type { AnthropicThinkingEffort, FetchFn, ModelConfig } from '@n8n/agents';
import { extractJsonCandidate } from '@n8n/ai-utilities/llm-output';
import type { z } from 'zod';

import { createEvalAgent, extractText } from './eval-agents';

export type ValidatedJsonResult<T> =
	| { ok: true; data: T }
	| {
			ok: false;
			reason: 'generation_failed' | 'invalid_json' | 'schema_mismatch';
			/** The model or agent error, for `generation_failed`. */
			message?: string;
			issues?: z.ZodIssue[];
	  };

export interface GenerateValidatedJsonOptions<T> {
	model?: string;
	/** Thinking effort for a pinned `model`. */
	effort?: AnthropicThinkingEffort;
	instructions: string;
	userText: string;
	schema: z.ZodType<T>;
	/** Host-resolved model used when no eval model API key is configured in the environment. */
	fallbackModelConfig?: ModelConfig;
	/** Transport for the helper's model call. */
	modelFetch?: FetchFn;
}

/** Tracing must never block a model call: when it fails, the call runs without spans. */
async function helperTelemetry(agentName: string) {
	try {
		const { getCurrentHelperTelemetry } = await import('../tracing/langsmith-tracing.js');
		return getCurrentHelperTelemetry(agentName);
	} catch {
		return undefined;
	}
}

export async function generateValidatedJson<T>(
	agentName: string,
	options: GenerateValidatedJsonOptions<T>,
): Promise<ValidatedJsonResult<T>> {
	const telemetry = await helperTelemetry(agentName);
	let text: string;
	try {
		const llm = createEvalAgent(agentName, {
			telemetry,
			model: options.model,
			effort: options.effort,
			instructions: options.instructions,
			fallbackModelConfig: options.fallbackModelConfig,
			modelFetch: options.modelFetch,
		});
		const result = await llm.generate([
			{ role: 'user' as const, content: [{ type: 'text' as const, text: options.userText }] },
		]);
		text = extractText(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, reason: 'generation_failed', message };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(extractJsonCandidate(text));
	} catch {
		return { ok: false, reason: 'invalid_json' };
	}

	const validated = options.schema.safeParse(parsed);
	if (!validated.success) {
		return { ok: false, reason: 'schema_mismatch', issues: validated.error.issues };
	}
	return { ok: true, data: validated.data };
}
