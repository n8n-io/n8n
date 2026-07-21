/**
 * Completion mock for the eval wire server: simulates ONE turn of an AI agent's
 * model, returning the adapter shorthand (`{ tool_calls }` or `{ content }`).
 * The HTTP-API mock is wrong here — its "return the full resource" prompt yields
 * a provider envelope the adapter can't read a tool call from.
 */

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { createEvalAgent, extractText, Tool } from '@n8n/instance-ai';
import type { EvalLlmMockHandler, EvalMockHttpResponse } from 'n8n-core';
import { z } from 'zod';

import {
	conformContentToSchema,
	discoverStructuredOutputSchema,
} from './structured-output-conformance';

const COMPLETION_MOCK_PROMPT = `You simulate ONE response from the LLM that powers an AI agent inside an n8n workflow under evaluation. The agent runs a tool-calling loop and calls you once per turn. Decide the agent's NEXT step and submit it via submit_agent_step.

This is a MOCK whose only purpose is to exercise the workflow's wiring and data flow — NOT to produce a realistic deliverable. Keep everything MINIMAL and schema-valid. Never write long documents, full HTML pages, or essays; a short stub string that satisfies the schema is ideal.

You are given the conversation so far, whether any tool results have come back, and the tools the agent may call (each with its JSON input schema).

How to decide:
- If NO tool results are present yet and the agent's instructions describe gathering/processing steps, advance the loop: pick the SINGLE most appropriate NON-final tool and call it. Do not jump to the final answer on the first turn.
- Once tool results are present (or only a "final answer" / "format response" style tool remains sensible), finalize: if such a structured-output tool exists, call it; otherwise return a short final answer.

Rules:
- kind="tool_call": set toolName to one of the available tools and toolArguments to an object matching THAT tool's input schema EXACTLY (same keys, nesting, and types). Use the SMALLEST valid value for every field — a one-line string, a single-element array — never a long document.
- kind="final": set content to a short final answer string. Two structured-output cases override this:
  - If a structured-output / "format final response" style tool is available, NEVER finalize with plain content — call that tool with schema-valid arguments instead.
  - Only when NO such tool exists but the conversation carries structured-output format instructions (a JSON schema the reply must match): content MUST be exactly JSON that satisfies THAT schema — every declared field present, exact key names, correct types (a numeric field gets a number like 42, never a descriptive string like "about 42" or "below the 42 threshold"). Do NOT add fields the schema does not declare, and do NOT wrap the object in an extra key unless the schema itself declares that wrapper (some parsers require a specific top-level key such as "__structured__output" — include it only when the schema shows it). Reproduce a \`\`\`json code block only if the instructions show one. Keep-it-minimal applies to field VALUES only — never drop declared fields.
- content is ONLY the assistant's answer (plain text, or the structured JSON). NEVER wrap it in a provider API envelope — no chat.completion/response object, no "choices"/"output"/"id"/"object" keys. The harness adds the wire envelope.
- Call exactly ONE tool per step. Never fabricate a whole multi-step result in a single turn.
- If the scenario, node hint, or data context states a specific value, reproduce it; otherwise keep values minimal.`;

interface ParsedTool {
	name: string;
	description?: string;
	schema: unknown;
}

interface CompletionStep {
	kind?: 'tool_call' | 'final';
	toolName?: string;
	toolArguments?: Record<string, unknown>;
	content?: string;
}

export interface LlmCompletionMockOptions {
	scenarioHints?: string;
	globalContext?: string;
	nodeHints?: Record<string, string>;
}

const submitStepSchema = z.object({
	kind: z
		.enum(['tool_call', 'final'])
		.describe('"tool_call" to advance the agent loop; "final" to give the agent\'s final answer.'),
	toolName: z
		.string()
		.optional()
		.describe('Required for kind="tool_call": the exact name of the tool to call.'),
	toolArguments: z
		.record(z.unknown())
		.optional()
		.describe(
			'Required for kind="tool_call": an object matching the named tool\'s input schema exactly. Use minimal valid values.',
		),
	content: z
		.string()
		.optional()
		.describe('Required for kind="final": a short final answer string.'),
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function asString(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

const TRANSCRIPT_ITEM_MAX = 500;

function truncate(text: string): string {
	return text.length > TRANSCRIPT_ITEM_MAX ? `${text.slice(0, TRANSCRIPT_ITEM_MAX)}…` : text;
}

/** Flatten chat/responses message content (string or content-part array) to text. */
function contentToString(content: unknown): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) {
		const parts: string[] = [];
		for (const part of content) {
			if (typeof part === 'string') parts.push(part);
			else if (isRecord(part) && typeof part.text === 'string') parts.push(part.text);
		}
		return parts.join(' ');
	}
	if (content === undefined || content === null) return '';
	return JSON.stringify(content);
}

/** Tools live under `tools[].function` (chat-completions) or flat on the item (responses). */
function extractTools(body: unknown): ParsedTool[] {
	if (!isRecord(body) || !Array.isArray(body.tools)) return [];
	const out: ParsedTool[] = [];
	for (const entry of body.tools) {
		if (!isRecord(entry)) continue;
		const fn = isRecord(entry.function) ? entry.function : entry;
		const name = asString(fn.name);
		if (!name) continue;
		out.push({ name, description: asString(fn.description), schema: fn.parameters });
	}
	return out;
}

interface ConversationSummary {
	transcript: string;
	hasToolResults: boolean;
}

/** Summarize the conversation and detect whether any tool has already returned. */
function summarizeConversation(body: unknown): ConversationSummary {
	if (!isRecord(body)) return { transcript: '', hasToolResults: false };
	const items = Array.isArray(body.messages)
		? body.messages
		: Array.isArray(body.input)
			? body.input
			: [];

	const lines: string[] = [];
	let hasToolResults = false;
	for (const item of items) {
		if (!isRecord(item)) continue;
		const type = asString(item.type);
		const role = asString(item.role);

		if (type === 'function_call_output' || role === 'tool') {
			hasToolResults = true;
			const payload = type === 'function_call_output' ? item.output : item.content;
			lines.push(`tool_result: ${truncate(contentToString(payload))}`);
		} else if (type === 'function_call') {
			lines.push(`assistant called tool: ${asString(item.name) ?? '?'}`);
		} else if (role) {
			lines.push(`${role}: ${truncate(contentToString(item.content))}`);
		}
	}
	return { transcript: lines.join('\n'), hasToolResults };
}

function buildUserPrompt(
	tools: ParsedTool[],
	summary: ConversationSummary,
	options: LlmCompletionMockOptions | undefined,
	nodeHint: string | undefined,
	outputSchema: Record<string, unknown> | undefined,
): string {
	const toolList =
		tools
			.map(
				(t) =>
					`- ${t.name}${t.description ? `: ${t.description}` : ''}\n  input schema: ${JSON.stringify(t.schema)}`,
			)
			.join('\n') || '(no tools — return a final answer)';

	const sections: string[] = [
		'## Conversation so far',
		summary.transcript || '(empty — this is the first turn)',
		'',
		'## Tools the agent may call',
		toolList,
		'',
		'## State',
		summary.hasToolResults
			? 'Tool results ARE present — you likely have enough to finalize.'
			: 'No tool results yet — advance the loop by calling a non-final tool unless none exist.',
	];
	// When the request declares a structured-output schema, hand it to the mock
	// verbatim so it emits the exact keys/types (not a paraphrased "category"
	// string). This is what steers e.g. a Text Classifier's boolean-per-category
	// output; the conformance pass then guarantees no extra keys survive.
	if (outputSchema) {
		sections.push(
			'',
			'## Required structured output',
			'Your final `content` MUST be JSON matching this schema EXACTLY — include every declared property with the correct type, add no extra keys, and do not wrap it in another object unless the schema itself declares that wrapper:',
			JSON.stringify(outputSchema),
		);
	}
	if (options?.globalContext) sections.push('', '## Data context', options.globalContext);
	if (nodeHint) sections.push('', '## Node hint', nodeHint);
	if (options?.scenarioHints) sections.push('', '## Scenario', options.scenarioHints);
	return sections.join('\n');
}

/**
 * The mock model occasionally emits a full provider wire envelope
 * (chat.completions / Responses API) as its "answer" instead of the bare
 * assistant message. The wire server would then wrap that envelope AGAIN, so the
 * workflow node receives a stringified envelope as its text and its parser fails
 * ("empty response"). Unwrap a recognised envelope back to the inner assistant
 * message. Gated on the `object` marker so a legitimate structured-output answer
 * that merely happens to carry an `output`/`choices` field is never mis-unwrapped.
 */
export function unwrapProviderEnvelope(text: string): string {
	const trimmed = text.trim();
	if (!trimmed.startsWith('{')) return text;
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return text;
	}
	if (!isRecord(parsed)) return text;

	// OpenAI chat.completions: choices[0].message.content
	if (parsed.object === 'chat.completion' && isUnknownArray(parsed.choices)) {
		const first = parsed.choices[0];
		if (isRecord(first) && isRecord(first.message) && typeof first.message.content === 'string') {
			return first.message.content;
		}
	}

	// OpenAI Responses API: output_text, or output[].content[].text
	if (parsed.object === 'response') {
		if (typeof parsed.output_text === 'string') return parsed.output_text;
		if (isUnknownArray(parsed.output)) {
			for (const item of parsed.output) {
				if (!isRecord(item) || !isUnknownArray(item.content)) continue;
				const firstPart = item.content[0];
				if (isRecord(firstPart) && typeof firstPart.text === 'string') return firstPart.text;
			}
		}
	}

	return text;
}

function jsonResponse(body: Record<string, unknown>): EvalMockHttpResponse {
	return { body, headers: { 'content-type': 'application/json' }, statusCode: 200 };
}

/** LLM-completion mock handler for the wire server — same signature as the HTTP mock. */
export function createLlmCompletionMockHandler(
	options?: LlmCompletionMockOptions,
): EvalLlmMockHandler {
	return async (requestOptions, node) => {
		const body = requestOptions.body;
		const tools = extractTools(body);
		const summary = summarizeConversation(body);
		const outputSchema = discoverStructuredOutputSchema(body);
		const userPrompt = buildUserPrompt(
			tools,
			summary,
			options,
			options?.nodeHints?.[node.name],
			outputSchema,
		);

		const capture: CompletionStep = {};
		const agent = createEvalAgent('eval-llm-completion-mock', {
			instructions: COMPLETION_MOCK_PROMPT,
			cache: true,
		}).tool(
			new Tool('submit_agent_step')
				.description("Submit the agent's next step: one tool call, or a final answer.")
				.input(submitStepSchema)
				.handler(async (input: CompletionStep) => {
					// A named tool always wins, even on a step labeled "final" — structured-output
					// agents finalize by calling the tool. Capture it regardless of `kind`.
					if (input.toolName) {
						capture.kind = 'tool_call';
						capture.toolName = input.toolName;
						capture.toolArguments = input.toolArguments ?? {};
						return 'Accepted.';
					}
					if (input.kind === 'tool_call') {
						return 'Invalid: kind="tool_call" requires toolName. Call submit_agent_step again.';
					}
					capture.kind = 'final';
					capture.content = input.content ?? '';
					return 'Accepted.';
				})
				.build(),
		);

		// Hang guard: one stalled model turn must not eat the scenario budget.
		const result = await agent.generate(userPrompt, {
			abortSignal: AbortSignal.timeout(120_000),
		});

		let responseBody: Record<string, unknown>;
		if (capture.toolName) {
			// A named tool always wins — structured-output agents finalize by calling
			// the tool even while labeling the step "final".
			responseBody = {
				tool_calls: [{ name: capture.toolName, arguments: capture.toolArguments ?? {} }],
			};
		} else if (capture.kind === 'final') {
			// Unwrap a stray provider envelope, then conform to any structured-output
			// schema the request declared (drops invented fields / stray wrappers that
			// would fail the node's `additionalProperties: false` parser).
			responseBody = {
				content: conformContentToSchema(
					unwrapProviderEnvelope(capture.content ?? ''),
					outputSchema,
				),
			};
		} else {
			// Agent never submitted — fall back to its raw text so the turn isn't empty.
			const fallback = extractText(result).trim();
			Container.get(Logger).warn(
				`[EvalMock] llm-completion-mock produced no submit_agent_step for "${node.name}"; using raw text fallback`,
			);
			responseBody = {
				content:
					conformContentToSchema(unwrapProviderEnvelope(fallback), outputSchema) ||
					'[eval completion-mock: empty response]',
			};
		}

		return jsonResponse(responseBody);
	};
}
