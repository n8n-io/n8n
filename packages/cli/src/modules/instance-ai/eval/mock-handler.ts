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
import { createEvalAgent, extractText, Tool } from '@n8n/instance-ai';
import type { EvalLlmMockHandler, EvalMockHttpResponse } from 'n8n-core';
import { z } from 'zod';

import { fetchApiDocs } from './api-docs';
import { findMockQuirks } from './mock-quirks';
import { extractNodeConfig } from './node-config';
import { redactSecretKeys, truncateForLlm } from './request-sanitizer';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const MOCK_SYSTEM_PROMPT = `You generate realistic HTTP responses for one specific request, mocking an API in n8n workflow evaluation.

You get everything you need in the user message: the request (service, method, URL, body, query), API docs for the endpoint, the n8n node's parameters, and optional context (globalContext, nodeHint, scenarioHints).

**Procedure — follow in order:**
1. Call \`get_endpoint_quirks\` first, always. It returns any known guidance specific to this endpoint, or confirms there are none. Treat its output as authoritative.
2. Generate the response that satisfies the API docs, node config, scenario context, and any quirk guidance from step 1.
3. Call \`submit_response\` exactly once to deliver the response. Do not write the response as text.

**Write operations (POST / PUT / PATCH that create or modify a resource):**
Return the FULL resource object the API produces on success — not a minimal acknowledgement-only response. When the docs show multiple response variants for one endpoint, default to the FULL/complete one. Use a partial/minimal variant only if the request body contains the explicit field that triggers it (e.g. \`template\`, \`async: true\`).

Each request is mocked independently. Even when the same node makes multiple similar calls in a workflow, every call must produce a fully-shaped response on its own — never shortcut later calls.

Response SHAPE comes from the API docs; DATA VALUES come from the node config. Use names/IDs from the config exactly (case-sensitive).

Node-config patterns to know:
  - "__rl" object: "value" is the selected resource id
  - "schema" array: each entry's "id" is the response field name (NOT "displayName"). e.g. {id:"timestamp",displayName:"Timestamp"} → response uses "timestamp"
  - Strings starting with "=" are expressions (ignore)

**Time-relative fields.** The user prompt ends with a "## Date anchors" block listing today's date plus a handful of relative anchors (yesterday, 7 days ago, etc.). EVERY timestamp, date, hourly/daily entry, and time-relative field in your response MUST be derived from those anchors — never from training data or from the example dates in the API documentation. Workflows commonly filter mock responses by today's date; values outside the current window are silently discarded and the scenario fails.

Match THIS request only (URL + method): a node may make multiple sequential calls; reply to the specific one shown. Echo identifiers, placeholders, and reference values from the request back into the response. No pagination — always indicate end of results.

For APIs that return empty responses on success (204/202), call submit_response with type="json" and body={}.`;

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

	const dateAnchors = buildDateAnchors(new Date());

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

	const apiDocs = await fetchApiDocs(
		serviceName,
		`${request.method ?? 'GET'} ${endpoint} response format`,
	);
	sections.push('', '## API documentation', apiDocs);

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

	// Date anchors — placed last so they're the freshest context before the
	// model generates. Framed as named data values (not an instruction): the
	// API docs above contain training-era example dates, and presenting "today"
	// as data the model integrates is more reliable than rule-following.
	sections.push('', '## Date anchors', dateAnchors);

	const userPrompt = sections.join('\n');

	const safeUrl = extractEndpoint(request.url);
	let lastError = '';

	const requestPath = extractEndpointPath(request.url);
	const requestMethod = request.method ?? 'GET';

	for (let attempt = 0; attempt <= context.maxRetries; attempt++) {
		try {
			const spec = await callLlm(userPrompt, {
				serviceName,
				method: requestMethod,
				pathname: requestPath,
			});
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

// Generic structural schema. Body is constrained to object/array/null so
// the model can't smuggle malformed JSON inside a wrapped string. No
// per-API field constraints — the API docs in the user prompt drive content.
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
			'The decoded response body. Must be an object, an array (for list endpoints), or null (for empty 204-style responses). Required for type="json" and type="error". Omit for type="binary".',
		),
	statusCode: z
		.number()
		.int()
		.optional()
		.describe('HTTP status code. Required for type="error". Omit for json/binary.'),
	contentType: z
		.string()
		.optional()
		.describe('MIME type. Required for type="binary". Omit otherwise.'),
	filename: z.string().optional().describe('Filename for type="binary". Omit otherwise.'),
});

function createSubmitResponseTool(capture: { spec?: MockResponseSpec }) {
	return new Tool('submit_response')
		.description('Submit your final mock HTTP response. Call this exactly once.')
		.input(submitResponseSchema)
		.handler(async (input: MockResponseSpec) => {
			capture.spec = input;
			return 'Response submitted.';
		})
		.build();
}

function createQuirksLookupTool(serviceName: string, method: string, pathname: string) {
	return new Tool('get_endpoint_quirks')
		.description(
			'Returns guidance about known mocking quirks for the current request. Always call before submit_response.',
		)
		.input(z.object({}))
		.handler(async () => {
			const guidance = findMockQuirks(serviceName, method, pathname);
			if (guidance.length === 0) {
				return 'No specific quirks for this endpoint. Follow the API docs and the system rules.';
			}
			return guidance.join('\n\n');
		})
		.build();
}

async function callLlm(
	userPrompt: string,
	requestInfo: { serviceName: string; method: string; pathname: string },
): Promise<MockResponseSpec> {
	const capture: { spec?: MockResponseSpec } = {};

	const agent = createEvalAgent('eval-mock-responder', {
		instructions: MOCK_SYSTEM_PROMPT,
	})
		.tool(createQuirksLookupTool(requestInfo.serviceName, requestInfo.method, requestInfo.pathname))
		.tool(createSubmitResponseTool(capture));

	const result = await agent.generate(userPrompt);

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

function extractEndpointPath(url: string): string {
	try {
		return new URL(url).pathname;
	} catch {
		return url;
	}
}

/**
 * Renders a stable block of named date anchors for the user prompt. Each
 * entry is a relative-time label → ISO date string. The model integrates
 * these as data (similar to a node config value) rather than interpreting
 * a "use today's date" rule, which it often misses when the surrounding
 * API docs are full of training-era example dates.
 */
export function buildDateAnchors(now: Date): string {
	const labels: Array<[string, number]> = [
		['today', 0],
		['yesterday', -1],
		['7 days ago', -7],
		['14 days ago', -14],
		['30 days ago', -30],
		['1 day from now', 1],
		['7 days from now', 7],
	];
	const lines = labels.map(([label, dayOffset]) => {
		const d = new Date(now);
		d.setUTCDate(d.getUTCDate() + dayOffset);
		const isoDate = d.toISOString().slice(0, 10);
		return label === 'today'
			? `- ${label}: ${isoDate} (full timestamp ${now.toISOString()})`
			: `- ${label}: ${isoDate}`;
	});
	return lines.join('\n');
}
