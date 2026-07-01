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

const COMPLETION_MOCK_PROMPT = `You simulate ONE response from the LLM that powers an AI agent inside an n8n workflow under evaluation. The agent runs a tool-calling loop and calls you once per turn. Decide the agent's NEXT step and submit it via submit_agent_step.

This is a MOCK whose only purpose is to exercise the workflow's wiring and data flow — NOT to produce a realistic deliverable. Keep everything MINIMAL and schema-valid. Never write long documents, full HTML pages, or essays; a short stub string that satisfies the schema is ideal.

You are given the conversation so far, whether any tool results have come back, and the tools the agent may call (each with its JSON input schema).

How to decide:
- If NO tool results are present yet and the agent's instructions describe gathering/processing steps, advance the loop: pick the SINGLE most appropriate NON-final tool and call it. Do not jump to the final answer on the first turn.
- Once tool results are present (or only a "final answer" / "format response" style tool remains sensible), finalize: if such a structured-output tool exists, call it; otherwise return a short final answer.

Rules:
- kind="tool_call": set toolName to one of the available tools and toolArguments to an object matching THAT tool's input schema EXACTLY (same keys, nesting, and types). Use the SMALLEST valid value for every field — a one-line string, a single-element array — never a long document.
- kind="final": set content to a short final answer string.
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
	if (options?.globalContext) sections.push('', '## Data context', options.globalContext);
	if (nodeHint) sections.push('', '## Node hint', nodeHint);
	if (options?.scenarioHints) sections.push('', '## Scenario', options.scenarioHints);
	return sections.join('\n');
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
		const userPrompt = buildUserPrompt(tools, summary, options, options?.nodeHints?.[node.name]);

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

		const result = await agent.generate(userPrompt);

		let responseBody: Record<string, unknown>;
		if (capture.toolName) {
			// A named tool always wins — structured-output agents finalize by calling
			// the tool even while labeling the step "final".
			responseBody = {
				tool_calls: [{ name: capture.toolName, arguments: capture.toolArguments ?? {} }],
			};
		} else if (capture.kind === 'final') {
			responseBody = { content: capture.content ?? '' };
		} else {
			// Agent never submitted — fall back to its raw text so the turn isn't empty.
			const fallback = extractText(result).trim();
			Container.get(Logger).warn(
				`[EvalMock] llm-completion-mock produced no submit_agent_step for "${node.name}"; using raw text fallback`,
			);
			responseBody = { content: fallback || '[eval completion-mock: empty response]' };
		}

		return jsonResponse(responseBody);
	};
}
