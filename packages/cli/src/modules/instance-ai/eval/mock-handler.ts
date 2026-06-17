/**
 * LLM-powered HTTP mock handler for workflow evaluation.
 *
 * Synthetic data only — request bodies are sanitized before reaching the
 * LLM, but this handler must never be used with real user data.
 *
 * Used by Instance AI tools (self-validation during builds) and the eval
 * CLI test suite.
 */

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { createEvalAgent, extractText, Tool } from '@n8n/instance-ai';
import type { EvalLlmMockHandler, EvalMockHttpResponse, FixtureSizeHint } from 'n8n-core';
import { synthesizeBinaryFixture } from 'n8n-core';
import { z } from 'zod';

import { fetchApiDocs } from './api-docs';
import { findMockQuirks } from './mock-quirks';
import { extractNodeConfig } from './node-config';
import { redactBinaryBody } from './request-binary-redactor';
import { redactSecretKeys, truncateForLlm } from './request-sanitizer';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const MOCK_SYSTEM_PROMPT = `You generate realistic HTTP responses for one specific request, mocking an API in n8n workflow evaluation.

You get everything you need in the user message: the request (service, method, URL, body, query), API docs for the endpoint, the n8n node's parameters, and optional context (globalContext, nodeHint, scenarioHints).

**Procedure — follow in order:**
1. Call \`get_endpoint_quirks\` first, always. It returns any known guidance specific to this endpoint, or confirms there are none. Treat its output as authoritative.
2. Generate the response that satisfies the API docs, node config, scenario context, and any quirk guidance from step 1.
3. Call \`submit_response\` to deliver the response. If it returns a message starting with "Invalid:", fix the input and call it again — your response only counts once it is accepted. Do not write the response as text.

**Write operations (POST / PUT / PATCH that create or modify a resource):**
Return the FULL resource object the API produces on success — not a minimal acknowledgement-only response. When the docs show multiple response variants for one endpoint, default to the FULL/complete one. Use a partial/minimal variant only if the request body contains the explicit field that triggers it (e.g. \`template\`, \`async: true\`).

Each request is mocked independently. Even when the same node makes multiple similar calls in a workflow, every call must produce a fully-shaped response on its own — never shortcut later calls.

Response SHAPE comes from the API docs; DATA VALUES come from the node config. Use names/IDs from the config exactly (case-sensitive).

**Response envelope.** Return the body exactly as the real service sends it over the wire, including any top-level wrapper the API puts around results — e.g. \`{ "data": [...], "nextCursor": null }\`, \`{ "results": [...] }\`, \`{ "items": [...], "has_more": false }\`, \`{ "ok": true, "result": ... }\`. Do NOT return a bare top-level array unless the real API literally responds with one — most list endpoints wrap their items, and consumers that read the wrapper get zero items when it's missing.

Node-config patterns to know:
  - "__rl" object: "value" is the selected resource id
  - "schema" array: each entry's "id" is the response field name (NOT "displayName"). e.g. {id:"timestamp",displayName:"Timestamp"} → response uses "timestamp"
  - Strings starting with "=" are expressions (ignore)

**Time-relative fields.** The user prompt ends with a "## Date anchors" block listing today's date plus a handful of relative anchors (yesterday, 7 days ago, etc.). EVERY timestamp, date, hourly/daily entry, and time-relative field in your response MUST be derived from those anchors — never from training data or from the example dates in the API documentation. Workflows commonly filter mock responses by today's date; values outside the current window are silently discarded and the scenario fails.

Match THIS request only (URL + method): a node may make multiple sequential calls; reply to the specific one shown. Echo identifiers, placeholders, and reference values from the request back into the response. Return a single page (don't expect multi-page cursor follow-up), but keep the API's real envelope and mark it as the final page (e.g. \`nextCursor: null\`, \`has_more: false\`).

For APIs that return empty responses on success (204/202), call submit_response with type="json" and body={}.

**Binary / file responses.** Pick \`type: "binary"\` when the request URL or node parameters indicate a file download — Telegram \`getFile\` / \`/file/bot...\`, Google Drive \`alt=media\`, Dropbox \`/files/download\`, OneDrive \`/items/{id}/content\`, S3 \`GetObject\`, OpenAI \`audio/transcriptions\` source file, or any path containing \`/download\`, \`/file\`, \`/attachment\`, \`/media\`, \`/image\`, \`/voice\`, \`/audio\`, \`/export\`. Always set \`contentType\` (real MIME like \`application/pdf\`, \`audio/ogg\`, \`image/png\`) and \`filename\` (with the correct extension). Use \`sizeHint\` only when the scenario hints mention file size constraints (e.g. "rejects files > 100KB"). Do NOT pick \`binary\` for JSON metadata endpoints like Slack \`files.upload\`, \`files.info\`, or Telegram \`getFile\` (which returns a JSON envelope describing the file — the binary comes from the follow-up \`/file/bot.../path\` request). Exception: when the document at a download/export path is itself textual (CSV, XML, HTML, plain text) and the scenario or node hints specify its contents, use \`type: "text"\` with the exact document — reserve \`binary\` for opaque formats (PDF, images, audio, video, archives).

**Raw text / non-JSON responses.** When the real endpoint returns a non-JSON text document — XML/SOAP, CSV, HTML, RSS/Atom, plain text — use \`type: "text"\` and put the EXACT raw document in \`textBody\`, with \`contentType\` set to the real MIME (\`text/xml\`, \`application/xml\`, \`text/csv\`, \`text/html\`, \`text/plain\`). NEVER wrap such a document inside a JSON object like \`{"data": "<?xml..."}\` — the node consumes the raw text, and a JSON wrapper corrupts it. SOAP endpoints return the full SOAP envelope as \`textBody\`; SOAP faults use \`type: "error"\` with the fault XML in \`textBody\`.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 1;
const ERROR_PREVIEW_MAX = 400;
const ERROR_DETAIL_MAX = 300;

interface MockHandlerOptions {
	/** Steers the LLM toward specific behavior (errors, edge cases). */
	scenarioHints?: string;
	/** Workflow-level data context from Phase 1 (generateMockHints). */
	globalContext?: string;
	/** Per-node data hints from Phase 1, keyed by node name. */
	nodeHints?: Record<string, string>;
	maxRetries?: number;
}

interface MockResponseSpec {
	type: 'json' | 'text' | 'binary' | 'error';
	body?: unknown;
	textBody?: string;
	statusCode?: number;
	contentType?: string;
	filename?: string;
	sizeHint?: FixtureSizeHint;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

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
	request: {
		url: string;
		method?: string;
		body?: unknown;
		qs?: Record<string, unknown>;
		headers?: Record<string, unknown>;
	},
	node: { name: string; type: string },
	context: MockResponseContext,
): Promise<EvalMockHttpResponse> {
	const serviceName = extractServiceName(request.url);
	const endpoint = extractEndpoint(request.url);

	const dateAnchors = buildDateAnchors(new Date());

	const sections: string[] = [
		'## Request',
		`Service: ${serviceName}`,
		`Node: "${node.name}" (${node.type})`,
		(request.method ?? 'GET') + ' ' + endpoint,
		'Generate the response for this EXACT endpoint and method.',
	];

	if (request.body) {
		// Strip raw binary bytes (Buffers, FormData) BEFORE secret redaction so the
		// LLM prompt always sees a JSON-safe structure even for multipart uploads.
		const binarySafe = redactBinaryBody(request.body, getContentType(request.headers));
		const sanitized = redactSecretKeys(binarySafe);
		const serialized = truncateForLlm(JSON.stringify(sanitized));
		sections.push(`Body: ${serialized}`);
	}
	if (request.qs && Object.keys(request.qs).length > 0) {
		const sanitizedQs = redactSecretKeys(request.qs);
		sections.push(`Query: ${JSON.stringify(sanitizedQs)}`);
	}

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

	// Anchors go last — the API docs above carry training-era dates, so these
	// need to be the freshest context before generation.
	sections.push('', '## Date anchors', dateAnchors);

	const userPrompt = sections.join('\n');

	const safeUrl = extractEndpoint(request.url);
	let lastError = '';

	const requestPath = extractEndpointPath(request.url);
	const requestMethod = request.method ?? 'GET';
	const requestHostname = extractHostname(request.url);

	for (let attempt = 0; attempt <= context.maxRetries; attempt++) {
		try {
			const spec = await callLlm(userPrompt, {
				serviceName,
				method: requestMethod,
				pathname: requestPath,
				hostname: requestHostname,
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

// Body is constrained to object/array/null so the model can't smuggle malformed
// JSON inside a wrapped string; raw text documents go through textBody instead.
const submitResponseSchema = z.object({
	type: z
		.enum(['json', 'text', 'binary', 'error'])
		.describe(
			'"json" for JSON responses; "text" for non-JSON text documents (XML/SOAP, CSV, HTML, plain text); "binary" for file downloads; "error" for non-2xx responses.',
		),
	body: z
		.union([z.record(z.unknown()), z.array(z.unknown()), z.null()])
		.optional()
		.describe(
			'The decoded JSON response body. Must be an object — the API\'s real response envelope (most list endpoints wrap items in e.g. `data` / `results` / `items`); use a bare array only if the real API returns a top-level array; or null for empty 204-style responses. Required for type="json" and for JSON-style type="error". Omit for type="text" and type="binary".',
		),
	textBody: z
		.string()
		.optional()
		.describe(
			'The raw text document exactly as the service would send it (e.g. "<?xml version=\\"1.0\\"?>..."). Required for type="text"; allowed with type="error" when the service returns a text/XML error document. Omit otherwise.',
		),
	statusCode: z
		.number()
		.int()
		.optional()
		.describe('HTTP status code. Required for type="error". Omit for json/text/binary.'),
	contentType: z
		.string()
		.optional()
		.describe(
			'MIME type. Required for type="binary". For type="text", the document MIME (e.g. "text/xml", "text/csv"; defaults to "text/plain"). Omit for json.',
		),
	filename: z.string().optional().describe('Filename for type="binary". Omit otherwise.'),
	sizeHint: z
		.enum(['small', 'medium', 'large'])
		.optional()
		.describe(
			'Optional padding hint for type="binary". "small" (default) is the minimum valid fixture; "medium" pads to ~64KB; "large" pads to ~1MB. Use only when the scenario hints mention file size constraints.',
		),
});

/** True when a string parses as a JSON object or array (a JSON document mislabelled as text). */
function looksLikeJsonDocument(text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return typeof parsed === 'object' && parsed !== null;
	} catch {
		return false;
	}
}

interface SubmitCapture {
	spec?: MockResponseSpec;
	lastRejection?: string;
	/** Set when `spec` came from a rejected submission kept as a fallback. */
	softOnly?: boolean;
}

function createSubmitResponseTool(capture: SubmitCapture) {
	return new Tool('submit_response')
		.description(
			'Submit your final mock HTTP response. Submit one response; if the result starts with "Invalid:", fix the input and call submit_response again.',
		)
		.input(submitResponseSchema)
		.handler(async (input: MockResponseSpec) => {
			// Cross-field checks live here, not zod refinements (those break SDK schema generation).
			const reject = (message: string) => {
				capture.lastRejection = message;
				return message;
			};
			if (input.type === 'text') {
				if (typeof input.textBody !== 'string') {
					return reject(
						'Invalid: type="text" requires textBody (the raw text document as a string). Call submit_response again with textBody set.',
					);
				}
				if (input.statusCode !== undefined) {
					return reject(
						'Invalid: type="text" is always a 200 response. For a non-2xx text/XML response, resubmit with type="error", the document in textBody, and the statusCode.',
					);
				}
				if (
					input.contentType?.toLowerCase().includes('json') ||
					looksLikeJsonDocument(input.textBody)
				) {
					return reject(
						'Invalid: this looks like a JSON response. Resubmit with type="json" and the decoded JSON in body — type="text" is only for non-JSON documents.',
					);
				}
			}
			if (input.type === 'json' && typeof input.textBody === 'string') {
				// Soft-capture: the json body may be valid on its own — a resubmission overwrites it.
				capture.spec = input;
				capture.softOnly = true;
				return reject(
					'Invalid: textBody is not allowed with type="json". If the endpoint returns a non-JSON text document, resubmit with type="text"; otherwise resubmit with the JSON in body.',
				);
			}
			if (
				input.type === 'error' &&
				typeof input.textBody === 'string' &&
				input.body !== undefined
			) {
				return reject(
					'Invalid: type="error" takes either body (JSON error) or textBody (text/XML error document), not both. Resubmit with exactly one.',
				);
			}
			capture.spec = input;
			capture.softOnly = false;
			return 'Response submitted.';
		})
		.build();
}

function createQuirksLookupTool(
	serviceName: string,
	method: string,
	pathname: string,
	hostname?: string,
) {
	return new Tool('get_endpoint_quirks')
		.description(
			'Returns guidance about known mocking quirks for the current request. Always call before submit_response.',
		)
		.input(z.object({}))
		.handler(async () => {
			const guidance = findMockQuirks(serviceName, method, pathname, hostname);
			if (guidance.length === 0) {
				return 'No specific quirks for this endpoint. Follow the API docs and the system rules.';
			}
			return guidance.join('\n\n');
		})
		.build();
}

async function callLlm(
	userPrompt: string,
	requestInfo: { serviceName: string; method: string; pathname: string; hostname?: string },
): Promise<MockResponseSpec> {
	const capture: SubmitCapture = {};

	// Cached prefix = tools + instructions; keep MOCK_SYSTEM_PROMPT static, per-request data in the user prompt.
	const agent = createEvalAgent('eval-mock-responder', {
		instructions: MOCK_SYSTEM_PROMPT,
		cache: true,
	})
		.tool(
			createQuirksLookupTool(
				requestInfo.serviceName,
				requestInfo.method,
				requestInfo.pathname,
				requestInfo.hostname,
			),
		)
		.tool(createSubmitResponseTool(capture));

	const result = await agent.generate(userPrompt);

	if (!capture.spec) {
		const text = extractText(result);
		const edge = ERROR_PREVIEW_MAX / 2;
		const preview =
			text.length > ERROR_PREVIEW_MAX ? `${text.slice(0, edge)}…${text.slice(-edge)}` : text;
		const errDetail = result.error
			? result.error instanceof Error
				? result.error.message
				: JSON.stringify(result.error).slice(0, ERROR_DETAIL_MAX)
			: '';
		const errPart = errDetail ? ` error=${errDetail}` : '';
		const what = capture.lastRejection
			? `Agent's submit_response was rejected and not resubmitted (${capture.lastRejection})`
			: 'Agent did not call submit_response';
		throw new Error(
			`${what}. finishReason=${result.finishReason ?? 'unknown'}${errPart} text="${preview.replace(/\s+/g, ' ').trim()}"`,
		);
	}

	if (capture.softOnly) {
		Container.get(Logger).warn(
			`[EvalMock] Serving soft-captured json body — submit_response was rejected (${capture.lastRejection ?? 'unknown reason'}) and never resubmitted`,
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
			// Distinguish "body omitted" (apply default) from "body: null" (intentional
			// empty payload for 204/202 endpoints, which the schema explicitly allows).
			return {
				body: spec.body === undefined ? { ok: true } : spec.body,
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			};

		case 'text':
			// Raw string body — nodes run their real text/XML/CSV parsing on it.
			return {
				body: spec.textBody ?? '',
				headers: { 'content-type': spec.contentType || 'text/plain' },
				statusCode: 200,
			};

		case 'binary': {
			const filename = spec.filename ?? 'mock-file.dat';
			const contentType = spec.contentType ?? 'application/octet-stream';
			const body = synthesizeBinaryFixture(contentType, filename, { sizeHint: spec.sizeHint });
			return {
				body,
				headers: {
					'content-type': contentType,
					'content-disposition': `attachment; filename="${filename}"`,
					'content-length': String(body.length),
				},
				statusCode: 200,
			};
		}

		case 'error': {
			const isTextError = typeof spec.textBody === 'string';
			return {
				body: isTextError ? spec.textBody : (spec.body ?? { error: 'Mock error' }),
				headers: {
					'content-type': isTextError ? spec.contentType || 'text/plain' : 'application/json',
				},
				statusCode: spec.statusCode ?? 500,
			};
		}

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

function getContentType(headers: Record<string, unknown> | undefined): string | undefined {
	if (!headers) return undefined;
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() !== 'content-type') continue;
		if (typeof value === 'string') return value;
		if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
		return undefined;
	}
	return undefined;
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

function extractEndpointPath(url: string): string {
	try {
		return new URL(url).pathname;
	} catch {
		return url;
	}
}

function extractHostname(url: string): string | undefined {
	try {
		return new URL(url).hostname;
	} catch {
		return undefined;
	}
}

/**
 * Renders a stable block of relative-time anchors (today, yesterday,
 * 7 days ago, etc.) the model integrates as data rather than a rule.
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
