/**
 * LLM-powered HTTP mock handler for evaluation.
 *
 * Generates realistic API responses on-the-fly based on the intercepted
 * request (URL, method, body) and optional scenario hints. Uses Claude Haiku
 * for speed — responses are small JSON objects.
 *
 * The LLM returns a structured **response spec** (json, binary, or error)
 * which the handler materializes into the correct runtime format. This lets
 * the LLM decide whether an endpoint returns JSON, a file download, or an
 * error — without us maintaining per-service detection rules.
 *
 * Used by:
 *   - Instance AI agent tools (self-validation during workflow building)
 *   - Eval CLI test suite (scenario-based testing via REST endpoint)
 */

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { EvalLlmMockHandler, EvalMockHttpResponse } from 'n8n-core';

import { createEvalAgent, extractText, HAIKU_MODEL } from '@n8n/instance-ai';

// ---------------------------------------------------------------------------
// System prompt (static — extracted to module level for agent singleton)
// ---------------------------------------------------------------------------

const MOCK_SYSTEM_PROMPT = `You are an API mock server. You generate realistic mock responses as structured JSON specs.

Return a JSON object with one of these formats:

For standard API responses (most common):
{ "type": "json", "body": { ...the realistic API response... } }

For file/binary download endpoints (e.g. file downloads, image exports, attachments):
{ "type": "binary", "contentType": "application/pdf", "filename": "document.pdf" }

For error responses:
{ "type": "error", "statusCode": 404, "body": { ...the service's real error format... } }

Rules:
- Return ONLY the spec JSON — no markdown, no code fences, no explanation
- Match the real API's response schema as closely as possible
- Use realistic but fake data (IDs, names, timestamps, emails)
- For read operations, return 2-3 representative items in the body
- For write operations, return the service's standard success/confirmation in the body
- Choose "binary" only for endpoints that genuinely return file content (downloads, exports)
- IMPORTANT: Always indicate there are NO more pages — set has_more=false, next_cursor="", nextPageToken=null, or equivalent. Do not trigger pagination`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MockHandlerOptions {
	/** Optional scenario description — steers the LLM toward specific behavior (errors, edge cases) */
	scenarioHints?: string;
	/** Pre-generated consistent data context from Phase 1 (generateMockHints) */
	globalContext?: string;
	/** Per-node data hints from Phase 1, keyed by node name */
	nodeHints?: Record<string, string>;
}

/** Structured response spec returned by the LLM */
interface MockResponseSpec {
	type: 'json' | 'binary' | 'error';
	/** The response body — present for json and error types */
	body?: unknown;
	/** HTTP status code — present for error type */
	statusCode?: number;
	/** MIME type — present for binary type */
	contentType?: string;
	/** Filename hint — present for binary type */
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
	return async (requestOptions, node) =>
		await generateMockResponse(requestOptions, node, {
			scenarioHints: options?.scenarioHints,
			globalContext: options?.globalContext,
			nodeHint: options?.nodeHints?.[node.name],
		});
}

// ---------------------------------------------------------------------------
// LLM mock generation
// ---------------------------------------------------------------------------

interface MockResponseContext {
	scenarioHints?: string;
	globalContext?: string;
	nodeHint?: string;
}

async function generateMockResponse(
	request: { url: string; method?: string; body?: unknown; qs?: Record<string, unknown> },
	node: { name: string; type: string },
	context?: MockResponseContext,
): Promise<EvalMockHttpResponse> {
	const serviceName = extractServiceName(request.url);
	const endpoint = extractEndpoint(request.url);

	// Build context blocks from pre-generated hints + scenario
	const contextBlocks: string[] = [];
	if (context?.globalContext) {
		contextBlocks.push(`Data context: ${context.globalContext}`);
	}
	if (context?.nodeHint) {
		contextBlocks.push(`Node hint: ${context.nodeHint}`);
	}
	if (context?.scenarioHints) {
		contextBlocks.push(
			`Scenario: ${context.scenarioHints}\nUse the "error" type with the appropriate statusCode for error scenarios.`,
		);
	}
	const contextBlock = contextBlocks.length > 0 ? '\n' + contextBlocks.join('\n') : '';

	const userPrompt = `Generate a mock response spec for this API call:

Service: ${serviceName}
Node: "${node.name}" (${node.type})
Request: ${request.method ?? 'GET'} ${endpoint}${request.body ? `\nBody: ${JSON.stringify(request.body)}` : ''}${request.qs ? `\nQuery: ${JSON.stringify(request.qs)}` : ''}${contextBlock}

Response spec:`;

	try {
		const spec = await callLlm(userPrompt);
		return materializeSpec(spec);
	} catch (error) {
		Container.get(Logger).error(
			`[EvalMock] Mock generation failed for ${request.method ?? 'GET'} ${request.url}: ${error instanceof Error ? error.message : String(error)}`,
		);
		return {
			body: { ok: true, _evalMockFallback: true },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		};
	}
}

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------

async function callLlm(userPrompt: string): Promise<MockResponseSpec> {
	const agent = createEvalAgent('eval-mock-responder', {
		model: HAIKU_MODEL,
		instructions: MOCK_SYSTEM_PROMPT,
	});

	const result = await agent.generate(userPrompt, {
		providerOptions: { anthropic: { maxTokens: 4096 } },
	});

	let text = extractText(result);

	// Strip markdown code fences if the LLM wraps the response
	text = text
		.replace(/^```(?:json)?\s*\n?/i, '')
		.replace(/\n?\s*```\s*$/i, '')
		.trim();

	const parsed = JSON.parse(text) as MockResponseSpec;

	// Validate the spec has the required shape
	if (!parsed.type || !['json', 'binary', 'error'].includes(parsed.type)) {
		// LLM returned raw JSON without the spec wrapper — treat as json body
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

function extractServiceName(url: string): string {
	try {
		const hostname = new URL(url).hostname;
		// "api.slack.com" → "Slack", "www.googleapis.com" → "Google APIs"
		const parts = hostname.replace('api.', '').replace('www.', '').split('.');
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
