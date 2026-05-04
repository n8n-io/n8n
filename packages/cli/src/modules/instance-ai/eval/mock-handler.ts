/**
 * LLM-powered HTTP mock handler for evaluation.
 *
 * Generates realistic API responses on-the-fly based on the intercepted
 * request (URL, method, body) and optional scenario hints. Uses Claude Sonnet
 * with tool access to API documentation (Context7) and node configuration.
 *
 * The LLM returns a structured **response spec** (json, binary, or error)
 * which the handler materializes into the correct runtime format. This lets
 * the LLM decide whether an endpoint returns JSON, a file download, or an
 * error — without us maintaining per-service detection rules.
 *
 * IMPORTANT: This handler is designed for use with synthetic/eval data only.
 * All request data (body, query params) is sanitized before being sent to
 * the LLM, but the handler should never be used with real user data in
 * production workflows.
 *
 * Used by:
 *   - Instance AI agent tools (self-validation during workflow building)
 *   - Eval CLI test suite (scenario-based testing via REST endpoint)
 */

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { createEvalAgent, extractText, providerTools, Tool } from '@n8n/instance-ai';
import type { EvalLlmMockHandler, EvalMockHttpResponse } from 'n8n-core';
import { z } from 'zod';

import { extractNodeConfig } from './node-config';
import { redactSecretKeys, truncateForLlm } from './request-sanitizer';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const MOCK_SYSTEM_PROMPT = `You are an API mock server generating realistic HTTP responses for n8n workflow evaluation.

## Your tools

You have three tools:

"web_search" — Searches the live web. Use this to learn the correct response STRUCTURE for the endpoint you're responding to (what fields, what nesting, what types the real API returns). Search for the specific endpoint and method (e.g. "Notion API GET /v1/pages/{id} response example"). Prefer the vendor's own developer documentation in the results (developers.notion.com, api.slack.com, docs.github.com, stripe.com/docs, etc.) — those are the authoritative source. Community pages (Stack Overflow, blog posts, forum threads) are fine as supplements when an example is missing or ambiguous, but treat them as second-tier and double-check anything that contradicts the vendor docs.

"get_node_config" — Returns the n8n node's configuration parameters. This tells you what the node is set up to work with. The configuration contains the values the node expects to find in API responses — resource IDs, field names, column names, etc. Every node type has different parameters, so you need to interpret the config intelligently. Key patterns:
  - Objects with "__rl" are resource selectors — "value" is the selected resource (a document ID, channel, project, etc.)
  - "schema" arrays list the columns/fields the node expects. CRITICAL: use the "id" field as the exact column/field name in your response — NOT "displayName". For example, if schema has {"id": "timestamp", "displayName": "Timestamp"}, the API response must use "timestamp" (lowercase), not "Timestamp"
  - "operation" and "resource" describe what the node does (e.g. "send" a "message", "create" an "issue")
  - Strings starting with "=" are expressions (ignore these) — all other strings are literal values

"submit_response" — Submit your final mock HTTP response. Call this exactly once, AFTER you've gathered the information you need from the other tools. This is how you deliver your answer.

## How to work

1. Call web_search and get_node_config to gather what you need (you may call them in any order, multiple times if needed).
2. The API docs from web_search tell you the response SHAPE. The node config tells you the exact DATA VALUES to put in that shape. All names, IDs, and identifiers from the node config are case-sensitive — use them character-for-character.
3. Call submit_response exactly once with the final response. Do not write the response as text — only deliver via the submit_response tool call.

## Rules

- A node may make MULTIPLE sequential HTTP requests in a single execution (e.g., first GET metadata, then GET headers, then POST data). You are responding to ONE specific request. Match your response to the URL + method of THIS request only. A GET to a metadata endpoint must return metadata — not a write result — even if the node's overall purpose is to write data.
- Echo request values faithfully. If the request contains an identifier, name, or reference value (even one that looks like a placeholder such as "YOUR_CHAT_ID" or "YOUR_API_KEY"), echo it back exactly in the corresponding response field. The real API would reflect the same value the client sent.
- **Picking the response shape.** Many APIs document multiple response variants (full vs partial, expanded vs collapsed, with-children vs without). Default to the FULL/MAXIMAL variant unless the REQUEST explicitly opts into a smaller one. n8n nodes routinely post-process the response (validating, simplifying, transforming) using fields the workflow never references — a stub like {"object":"page","id":"abc"} when the full response would include {"object","id","properties","created_time","parent",...} can crash the node's internal handling.
- **Check the REQUEST for shape-controlling parameters first.** Many APIs let the client pick the response shape via query string, body, or headers. Common patterns: \`fields=\` (Google APIs, HubSpot), \`?expand[]=\` (Stripe), \`filter_properties=\` (Notion), \`properties=\` (HubSpot), \`include_*=\` (Slack), \`Accept: ...\` content negotiation (GitHub), \`?valueRenderOption=\` (Google Sheets). If the request specifies a shape, honor it exactly. If the request does NOT specify one, return the full variant.
- **Apply filters from the request to your response.** If the request specifies filter / where / limit / pagination clauses — in GraphQL args (e.g. \`filter: { createdAt: { gte: "..." } }\`, \`where:\`, \`first:\`, \`last:\`), in REST query params (\`?createdAt[gte]=\`, \`?limit=\`, \`?since=\`, \`?status=\`), or in body fields — simulate the API: return ONLY items that match the filter, sorted/sliced as the request asks. Do NOT dump the full dataset when the client asked for a slice. Example: a Linear GraphQL query with \`filter: { createdAt: { gte: "-P2W" } }\` against a dataset of 8 issues (6 recent, 2 older) should return only the 6 recent ones.
- **Field-count sanity check before submitting.** Count the top-level fields in your \`body\`. If it's noticeably fewer than what the official docs show for the FULL response (e.g. 2 fields when the docs show 12), you're likely emitting a documented-but-rare "partial" variant. Switch to the full one. Known traps: Notion's \`partialPageObjectResponse\` (only \`object\` + \`id\`) — almost never what callers actually want, almost always means you should be using \`pageObjectResponse\` with \`properties\`, \`created_time\`, \`parent\`, etc. Stripe's unexpanded references (\`{id, object}\` placeholders) — same trap. GraphQL responses with extremely few selected fields — verify against the query's selection set.
- Don't invent fields the documentation doesn't mention. Match the documented shape exactly — no more, no less.
- When the API docs are unclear or you suspect node-internal post-processing, look up the n8n node source on github.com/n8n-io/n8n. Node types map to paths predictably: "n8n-nodes-base.notion" → packages/nodes-base/nodes/Notion, "@n8n/n8n-nodes-langchain.chatTrigger" → packages/@n8n/nodes-langchain/nodes/ChatTrigger, etc. Read the post-execution / response-processing logic to see which fields the node touches beyond the workflow's expressions.
- For genuinely empty success responses (204 No Content, 202 Accepted with empty body), submit body={}. Otherwise return the full documented body.
- No pagination — always indicate end of results (has_more=false, nextPageToken=null, etc.)
- Use the **Current date/time** provided in the request when generating any timestamp, date, or time-relative field. Don't reach into your training data for "today's date" — use what the request specifies.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 2;

interface MockHandlerOptions {
	/** Optional scenario description — steers the LLM toward specific behavior (errors, edge cases) */
	scenarioHints?: string;
	/** Pre-generated consistent data context from Phase 1 (generateMockHints) */
	globalContext?: string;
	/** Per-node data hints from Phase 1, keyed by node name */
	nodeHints?: Record<string, string>;
	/** Max retries on mock generation failure (default: 1) */
	maxRetries?: number;
}

/** Structured response spec returned by the LLM */
interface MockResponseSpec {
	type: 'json' | 'binary' | 'error';
	body?: unknown;
	statusCode?: number;
	contentType?: string;
	filename?: string;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

/**
 * Creates an LLM-powered mock handler that generates realistic API responses.
 *
 * The handler is called for each intercepted HTTP request during eval execution.
 * It uses the request URL + method + body + node type to generate an appropriate
 * response spec, then materializes it into the correct format (JSON, Buffer, error).
 */
export function createLlmMockHandler(options?: MockHandlerOptions): EvalLlmMockHandler {
	// Pre-compute node configs so we don't re-extract on every request
	const nodeConfigCache = new Map<string, string>();

	return async (requestOptions, node) => {
		if (!nodeConfigCache.has(node.name)) {
			nodeConfigCache.set(node.name, extractNodeConfig(node));
		}
		return await generateMockResponse(requestOptions, node, {
			scenarioHints: options?.scenarioHints,
			globalContext: options?.globalContext,
			nodeHint: options?.nodeHints?.[node.name],
			nodeConfig: nodeConfigCache.get(node.name) ?? '',
			maxRetries: options?.maxRetries ?? DEFAULT_MAX_RETRIES,
		});
	};
}

// ---------------------------------------------------------------------------
// LLM mock generation
// ---------------------------------------------------------------------------

interface MockResponseContext {
	scenarioHints?: string;
	globalContext?: string;
	nodeHint?: string;
	nodeConfig: string;
	maxRetries: number;
}

async function generateMockResponse(
	request: { url: string; method?: string; body?: unknown; qs?: Record<string, unknown> },
	node: { name: string; type: string },
	context: MockResponseContext,
): Promise<EvalMockHttpResponse> {
	const serviceName = extractServiceName(request.url);
	const endpoint = extractEndpoint(request.url);

	// Build user prompt with clearly separated sections
	const sections: string[] = [
		'## Request',
		`Service: ${serviceName}`,
		`Node: "${node.name}" (${node.type})`,
		(request.method ?? 'GET') + ' ' + endpoint,
		'Generate the response for this EXACT endpoint and method.',
		'',
		`Current date/time: ${new Date().toISOString()}`,
		'Use this when filling timestamps, dates, or relative time fields.',
	];

	if (request.body) {
		const sanitized = redactSecretKeys(request.body);
		const serialized = truncateForLlm(JSON.stringify(sanitized));
		sections.push(`Body: ${serialized}`);
	}
	if (request.qs && Object.keys(request.qs).length > 0) {
		const sanitizedQs = redactSecretKeys(request.qs);
		sections.push(`Query: ${JSON.stringify(sanitizedQs)}`);
	}

	// Detect GraphQL and add format constraint
	const isGraphQL =
		endpoint.includes('/graphql') ||
		(typeof request.body === 'object' && request.body !== null && 'query' in request.body);

	if (isGraphQL) {
		sections.push('', '## GraphQL format requirement');
		sections.push(
			'This is a GraphQL endpoint. ALL responses MUST use GraphQL response format:',
			'- Success: { "data": { ...fields matching the query... } }',
			'- Error: { "errors": [{ "message": "...", "extensions": { "code": "..." } }], "data": null }',
			'Never return flat REST-style error objects.',
		);
	}

	if (context.nodeConfig) {
		sections.push('', '## Node Configuration', context.nodeConfig);
	}

	if (context.globalContext || context.nodeHint || context.scenarioHints) {
		sections.push('', '## Context');
		if (context.globalContext) sections.push(`Data: ${context.globalContext}`);
		if (context.nodeHint) sections.push(`Hint: ${context.nodeHint}`);
		if (context.scenarioHints) {
			sections.push(`Scenario: ${context.scenarioHints}`);
			sections.push(
				isGraphQL
					? '(For error scenarios, use GraphQL error format with "data": null. Don\'t use "type": "error" wrapper.)'
					: '(Use "error" type with appropriate statusCode for error scenarios.)',
			);
		}
	}

	const userPrompt = sections.join('\n');

	const safeUrl = extractEndpoint(request.url);
	let lastError = '';

	for (let attempt = 0; attempt <= context.maxRetries; attempt++) {
		try {
			const spec = await callLlm(userPrompt, context.nodeConfig);
			return materializeSpec(spec);
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error);
			if (attempt < context.maxRetries) {
				Container.get(Logger).warn(
					`[EvalMock] Mock generation failed for ${request.method ?? 'GET'} ${safeUrl}, retrying (${attempt + 1}/${context.maxRetries}): ${lastError}`,
				);
			}
		}
	}

	Container.get(Logger).error(
		`[EvalMock] Mock generation failed for ${request.method ?? 'GET'} ${safeUrl} after ${context.maxRetries + 1} attempts: ${lastError}`,
	);
	return {
		body: { _evalMockError: true, message: `Mock generation failed: ${lastError}` },
		headers: { 'content-type': 'application/json' },
		statusCode: 200,
	};
}

// ---------------------------------------------------------------------------
// Tool definitions (@n8n/agents)
// ---------------------------------------------------------------------------

function createNodeConfigTool(nodeConfig: string) {
	return new Tool('get_node_config')
		.description(
			"Get the n8n node's configuration parameters — resource IDs, field names, settings, etc. Your mock data must match these exact values.",
		)
		.input(z.object({}))
		.handler(async () => nodeConfig)
		.build();
}

// ---------------------------------------------------------------------------
// LLM call with tool use (agent handles multi-round loop automatically)
// ---------------------------------------------------------------------------

function logToolCalls(result: { messages?: unknown[] }): void {
	// Pair each web_search call with its result by toolCallId so we can log query → URLs together.
	const queries = new Map<string, string>();
	const results = new Map<string, string[]>();
	for (const msg of result.messages ?? []) {
		const m = msg as { role?: string; content?: unknown };
		if (!Array.isArray(m.content)) continue;
		for (const part of m.content) {
			const p = part as {
				type?: string;
				toolName?: string;
				toolCallId?: string;
				input?: { query?: string };
				result?: unknown;
			};
			if (p.toolName !== 'anthropic.web_search_20250305' || !p.toolCallId) continue;
			if (p.type === 'tool-call') {
				queries.set(p.toolCallId, p.input?.query ?? '');
			} else if (p.type === 'tool-result' && Array.isArray(p.result)) {
				const urls = (p.result as Array<{ url?: string; title?: string }>)
					.slice(0, 5)
					.map((r) => r.url ?? '')
					.filter(Boolean);
				results.set(p.toolCallId, urls);
			}
		}
	}
	if (!queries.size) return;
	const lines: string[] = [];
	for (const [callId, query] of queries) {
		const urls = results.get(callId) ?? [];
		const urlList = urls.length ? urls.join(', ') : '(no results)';
		lines.push(`  ${query}\n    → ${urlList}`);
	}
	Container.get(Logger).info(`[EvalMock] web_search:\n${lines.join('\n')}`);
}

const submitResponseSchema = z.object({
	type: z
		.enum(['json', 'binary', 'error'])
		.describe(
			'"json" for normal JSON responses; "binary" for file downloads; "error" for non-2xx responses.',
		),
	body: z
		.union([z.record(z.unknown()), z.array(z.unknown()), z.null()])
		.optional()
		.describe(
			'The decoded JSON body the API would return — must be an object, an array (for list endpoints), or null (for empty 204-style responses). Do NOT pass a JSON-encoded string; pass the actual structured value. Required for type="json"; for type="error" it carries the error body. Omit for type="binary".',
		),
	statusCode: z
		.number()
		.int()
		.optional()
		.describe('HTTP status code. Required for type="error" (e.g. 404, 500). Omit for json/binary.'),
	contentType: z
		.string()
		.optional()
		.describe('MIME type. Required for type="binary" (e.g. "application/pdf"). Omit otherwise.'),
	filename: z
		.string()
		.optional()
		.describe('Filename for type="binary" (e.g. "doc.pdf"). Omit otherwise.'),
});

function createSubmitResponseTool(capture: { spec?: MockResponseSpec }) {
	return new Tool('submit_response')
		.description(
			'Submit the final mock HTTP response. Call this exactly once after gathering information from web_search and get_node_config.',
		)
		.input(submitResponseSchema)
		.handler(async (input: MockResponseSpec) => {
			capture.spec = input;
			return 'Response submitted.';
		})
		.build();
}

async function callLlm(userPrompt: string, nodeConfig: string): Promise<MockResponseSpec> {
	const capture: { spec?: MockResponseSpec } = {};

	const agent = createEvalAgent('eval-mock-responder', {
		instructions: MOCK_SYSTEM_PROMPT,
	})
		.tool(createNodeConfigTool(nodeConfig))
		.tool(createSubmitResponseTool(capture))
		.providerTool(providerTools.anthropicWebSearch({ maxUses: 5 }));

	const result = await agent.generate(userPrompt);

	logToolCalls(result);

	if (!capture.spec) {
		const text = extractText(result);
		const preview = text.length > 400 ? `${text.slice(0, 200)}…${text.slice(-200)}` : text;
		const errPart = result.error
			? ` error=${result.error instanceof Error ? result.error.message : JSON.stringify(result.error).slice(0, 300)}`
			: '';
		throw new Error(
			`Agent did not call submit_response. finishReason=${result.finishReason ?? 'unknown'}${errPart} text="${preview.replace(/\s+/g, ' ').trim()}"`,
		);
	}

	return capture.spec;
}

// ---------------------------------------------------------------------------
// Spec materialization
// ---------------------------------------------------------------------------

function materializeSpec(spec: MockResponseSpec): EvalMockHttpResponse {
	// Distinguish "body omitted" (use default) from "body explicitly null" (LLM
	// signalling an empty 204-style response). `??` would swallow null and
	// substitute the default — wrong for empty-response endpoints.
	switch (spec.type) {
		case 'json':
			return {
				body: spec.body === undefined ? { ok: true } : spec.body,
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			};

		case 'binary': {
			const filename = spec.filename ?? 'mock-file.dat';
			const contentType = spec.contentType ?? 'application/octet-stream';
			const content = `[eval-mock] Synthetic file: ${filename} (${contentType})`;
			return {
				body: Buffer.from(content),
				headers: { 'content-type': contentType },
				statusCode: 200,
			};
		}

		case 'error':
			return {
				body: spec.body === undefined ? { error: 'Mock error' } : spec.body,
				headers: { 'content-type': 'application/json' },
				statusCode: spec.statusCode ?? 500,
			};

		default:
			return {
				body: spec.body === undefined ? { ok: true } : spec.body,
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			};
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractServiceName(url: string): string {
	try {
		const hostname = new URL(url).hostname;
		// "api.slack.com" → "Slack", "www.googleapis.com" → "Google APIs"
		const parts = hostname
			.replace(/^api\./, '')
			.replace(/^www\./, '')
			.split('.');
		return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
	} catch {
		return 'Unknown';
	}
}

function extractEndpoint(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.pathname + (parsed.search ? parsed.search : '');
	} catch {
		return url;
	}
}
