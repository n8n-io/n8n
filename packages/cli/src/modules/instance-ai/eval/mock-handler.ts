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
import type { EvalLlmMockHandler, EvalMockHttpResponse } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { createEvalAgent, extractText, Tool } from '@n8n/instance-ai';
import { fetchApiDocs } from './api-docs';
import { extractNodeConfig } from './node-config';
import { redactSecretKeys, truncateForLlm } from './request-sanitizer';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const MOCK_SYSTEM_PROMPT = `You are an API mock server generating realistic HTTP responses for n8n workflow evaluation.

## Your tools

You have two tools. Call them before generating your response:

"lookup_api_docs" — Fetches real API documentation for a service endpoint. Use this to learn the correct response STRUCTURE (what fields, what nesting, what types the real API returns). Pay special attention to what the real API returns for the exact HTTP method and URL path you're responding to.

"get_node_config" — Returns the n8n node's configuration parameters. This tells you what the node is set up to work with. The configuration contains the values the node expects to find in API responses — resource IDs, field names, column names, etc. Every node type has different parameters, so you need to interpret the config intelligently. Key patterns:
  - Objects with "__rl" are resource selectors — "value" is the selected resource (a document ID, channel, project, etc.)
  - "schema" arrays list the columns/fields the node expects. CRITICAL: use the "id" field as the exact column/field name in your response — NOT "displayName". For example, if schema has {"id": "timestamp", "displayName": "Timestamp"}, the API response must use "timestamp" (lowercase), not "Timestamp"
  - "operation" and "resource" describe what the node does (e.g. "send" a "message", "create" an "issue")
  - Strings starting with "=" are expressions (ignore these) — all other strings are literal values

## How to combine them

The API docs tell you the response SHAPE. The node config tells you the exact DATA VALUES to put in that shape. All names, IDs, and identifiers from the node config are case-sensitive — use them character-for-character.

## Output format

Respond with ONLY a JSON object. No explanation, no markdown, no prose.

{ "type": "json", "body": { ...realistic API response... } }
{ "type": "binary", "contentType": "application/pdf", "filename": "doc.pdf" }
{ "type": "error", "statusCode": 404, "body": { ...service error format... } }

## Rules

- A node may make MULTIPLE sequential HTTP requests in a single execution (e.g., first GET metadata, then GET headers, then POST data). You are responding to ONE specific request. Match your response to the URL + method of THIS request only. A GET to a metadata endpoint must return metadata — not a write result — even if the node's overall purpose is to write data.
- Echo request values faithfully. If the request contains an identifier, name, or reference value (even one that looks like a placeholder such as "YOUR_CHAT_ID" or "YOUR_API_KEY"), echo it back exactly in the corresponding response field. The real API would reflect the same value the client sent.
- Some APIs return empty or minimal responses on success (204 with no body, 202 with empty body). If the API documentation indicates an empty response body, return { "type": "json", "body": {} }. Don't invent additional response fields.
- No pagination — always indicate end of results (has_more=false, nextPageToken=null, etc.)`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 1;

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

const apiDocsTool = new Tool('lookup_api_docs')
	.description(
		'Look up official API documentation for a specific REST endpoint to understand the exact response format.',
	)
	.input(
		z.object({
			serviceName: z
				.string()
				.describe('The API service name (e.g. "Google Sheets", "Gmail", "Slack")'),
			endpointDescription: z
				.string()
				.describe('Description of the endpoint (e.g. "GET spreadsheets values response format")'),
		}),
	)
	.handler(async (input: { serviceName: string; endpointDescription: string }) => {
		return await fetchApiDocs(input.serviceName, input.endpointDescription);
	})
	.build();

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

async function callLlm(userPrompt: string, nodeConfig: string): Promise<MockResponseSpec> {
	const agent = createEvalAgent('eval-mock-responder', {
		instructions: MOCK_SYSTEM_PROMPT,
	})
		.tool(apiDocsTool)
		.tool(createNodeConfigTool(nodeConfig));

	const result = await agent.generate(userPrompt);

	const text: string = extractText(result);
	return parseResponseText(text);
}

function parseResponseText(raw: string): MockResponseSpec {
	let text = raw.trim();

	// Extract JSON from a ```json fenced block (anywhere in the text)
	// Allow optional newline after opening fence — LLM sometimes omits it
	const fencedMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
	if (fencedMatch) {
		text = fencedMatch[1].trim();
	}

	// Strip any remaining fences at boundaries
	text = text
		.replace(/^```(?:json)?\s*\n?/i, '')
		.replace(/\n?\s*```\s*$/i, '')
		.trim();

	// If still starts with prose, extract the JSON object by finding balanced braces
	if (text.length > 0 && !text.startsWith('{') && !text.startsWith('[')) {
		const extracted = extractJsonObject(text);
		if (extracted) {
			text = extracted;
		}
	}

	const parsed = jsonParse<MockResponseSpec>(text);

	if (!parsed.type || !['json', 'binary', 'error'].includes(parsed.type)) {
		return { type: 'json', body: parsed };
	}

	return parsed;
}

// ---------------------------------------------------------------------------
// Spec materialization
// ---------------------------------------------------------------------------

function materializeSpec(spec: MockResponseSpec): EvalMockHttpResponse {
	switch (spec.type) {
		case 'json':
			return {
				body: spec.body ?? { ok: true },
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
				body: spec.body ?? { error: 'Mock error' },
				headers: { 'content-type': 'application/json' },
				statusCode: spec.statusCode ?? 500,
			};

		default:
			return {
				body: spec.body ?? { ok: true },
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			};
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a JSON object from text by finding balanced braces.
 * Handles the case where the LLM wraps JSON in prose.
 */
function extractJsonObject(text: string): string | undefined {
	const start = text.indexOf('{');
	if (start < 0) return undefined;

	let depth = 0;
	let inString = false;
	let escape = false;

	for (let i = start; i < text.length; i++) {
		const ch = text[i];
		if (escape) {
			escape = false;
			continue;
		}
		if (ch === '\\' && inString) {
			escape = true;
			continue;
		}
		if (ch === '"') {
			inString = !inString;
			continue;
		}
		if (inString) continue;
		if (ch === '{') depth++;
		if (ch === '}') {
			depth--;
			if (depth === 0) {
				return text.slice(start, i + 1);
			}
		}
	}
	// Unbalanced — fall back to slice from start
	return text.slice(start);
}

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
