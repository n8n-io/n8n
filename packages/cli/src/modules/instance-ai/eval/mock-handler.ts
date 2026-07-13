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
import { buildDateAnchors } from './date-anchors';
import { findMockQuirks } from './mock-quirks';
import { extractNodeConfig } from './node-config';
import { redactBinaryBody } from './request-binary-redactor';
import { redactSecretKeys, truncateForLlm } from './request-sanitizer';

// Re-export: existing consumers/tests import buildDateAnchors from this module.
export { buildDateAnchors } from './date-anchors';

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

Each request is mocked independently. Even when the same node makes multiple similar calls in a workflow, every call must produce a fully-shaped response on its own — never shortcut later calls. (Byte-identical repeats of a request you already answered are served from a cache and never reach you — any request you DO see is distinct and needs its own full response.)

Response SHAPE comes from the API docs; DATA VALUES come from the node config. Use names/IDs from the config exactly (case-sensitive).

**Honor explicit values from the scenario and hints.** When the scenarioHints, nodeHint, or globalContext state a specific value — a quantity with a unit, a percentage, a monetary amount ("$1,200"), a count ("3 rows"), a threshold, an ID, or a name — reproduce that EXACT value in the response. Do NOT round it, soften it toward a "more typical" reading, or substitute your own estimate: the stated value is the test's intent, and downstream nodes (IF/Switch gates, filters, sums) compare against it. Emit the exact number of enumerated items the context describes. This extends to per-item constraints: when the scenario says EVERY/ALL items share a property (a literal substring every title must contain, a minimum every row must exceed), EVERY item you generate must satisfy it — check each item against the constraint character-by-character before responding (near-miss variants of a required literal fail the test). Only invent a value when the context gives none for that field. If a nodeHint and the scenario disagree, the scenario wins. When the context assigns an error or missing-data condition to a specific entity (one channel, one user, one record), compare THIS request's parameters (URL, query, body) against that entity: return the error response ONLY when this request targets it, and a normal success response for every other entity — an error scenario is only tested if the matching request actually fails.

**Honor request filters.** When the request narrows results — a date-range constraint (\`gte\`/\`lte\`/\`since\`/\`after\`/\`before\` params, or filter variables inside a GraphQL query), a status/type filter, a search query, or a \`limit\` — EVERY record in your response MUST satisfy it. Never include records outside the requested window "for realism": workflows re-filter and count your records against the real clock, and one out-of-window item changes the counts the test asserts. For date filters, resolve the requested window against the Date anchors and double-check every returned timestamp falls inside it. When the scenario says records exist "in the last N days", place them safely inside that window (e.g. 2–5 days ago), never on the boundary and never on training-data dates. When the scenario ALSO describes records outside the window (e.g. "two issues from 3 weeks ago"), those records exist in storage but the API filters them out server-side — EXCLUDE them from this response entirely; never shift their dates into the window to keep them visible (their age is part of the test's setup, and the excluded records are how the test verifies the filter works).

**Node response-handling options are not part of the body.** The node config may include options that control how n8n post-processes the response — \`fullResponse\`, \`responseFormat\`, \`outputPropertyName\`, pagination. These are applied AFTER you return and must NOT change the body you produce: always return the raw body the real API sends over the wire. Never reshape the body to mimic them — a body shaped like \`{ statusCode, headers, body }\` (mimicking \`fullResponse\`) or \`{ <outputPropertyName>: ... }\` is wrong.

**Response envelope.** Return the body exactly as the real service sends it over the wire, including any top-level wrapper the API puts around results — e.g. \`{ "data": [...], "nextCursor": null }\`, \`{ "results": [...] }\`, \`{ "items": [...], "has_more": false }\`, \`{ "ok": true, "result": ... }\`. Match the real API's top-level shape exactly: many list endpoints wrap their items, but plenty return a bare top-level array (e.g. an endpoint that returns an array of IDs). Follow what the real API actually returns per the docs — don't default to wrapping a bare-array response, and don't strip a wrapper the API really uses.

Node-config patterns to know:
  - "__rl" object: "value" is the selected resource id
  - "schema" array: each entry's "id" is the response field name (NOT "displayName"). e.g. {id:"timestamp",displayName:"Timestamp"} → response uses "timestamp"
  - Strings starting with "=" are expressions (ignore)

**Time-relative fields.** The user prompt ends with a "## Date anchors" block listing today's date plus a handful of relative anchors (yesterday, 7 days ago, etc.). EVERY timestamp, date, hourly/daily entry, and time-relative field in your response MUST be derived from those anchors — never from training data or from the example dates in the API documentation. Workflows commonly filter mock responses by today's date; values outside the current window are silently discarded and the scenario fails.

Match THIS request only (URL + method): a node may make multiple sequential calls; reply to the specific one shown. Echo identifiers, placeholders, and reference values from the request back into the response. Return a single page (don't expect multi-page cursor follow-up), but keep the API's real envelope and mark it as the final page (e.g. \`nextCursor: null\`, \`has_more: false\`).

**Keep list responses small.** Generate the MINIMUM data that satisfies the request, scenario, and workflow logic. For list/feed/forecast endpoints, return only as many entries as the downstream logic needs — a 5-day hourly forecast does not need all 40 entries, just enough to cover the window the workflow filters on (default 5-8 entries, at most ~20). Exception: when the scenario, hints, or the request's own parameters state an exact count or a larger dataset, honor that exactly — never shrink an explicitly-specified dataset. Oversized responses are slow to generate and risk aborting the whole request.

For APIs that return empty responses on success (204/202), call submit_response with type="json" and body={}.

**Binary / file responses.** Pick \`type: "binary"\` when the request URL or node parameters indicate a file download — Telegram \`getFile\` / \`/file/bot...\`, Google Drive \`alt=media\`, Dropbox \`/files/download\`, OneDrive \`/items/{id}/content\`, S3 \`GetObject\`, OpenAI \`audio/transcriptions\` source file, or any path containing \`/download\`, \`/file\`, \`/attachment\`, \`/media\`, \`/image\`, \`/voice\`, \`/audio\`, \`/export\`. Always set \`contentType\` (real MIME like \`application/pdf\`, \`audio/ogg\`, \`image/png\`) and \`filename\` (with the correct extension). Use \`sizeHint\` only when the scenario hints mention file size constraints (e.g. "rejects files > 100KB"). Do NOT pick \`binary\` for JSON metadata endpoints like Slack \`files.upload\`, \`files.info\`, or Telegram \`getFile\` (which returns a JSON envelope describing the file — the binary comes from the follow-up \`/file/bot.../path\` request). Exception: when the document at a download/export path is itself textual (CSV, XML, HTML, plain text) and the scenario or node hints specify its contents, use \`type: "text"\` with the exact document — reserve \`binary\` for opaque formats (PDF, images, audio, video, archives).

**Raw text / non-JSON responses.** When the real endpoint returns a non-JSON text document — XML/SOAP, CSV, HTML, RSS/Atom, plain text — use \`type: "text"\` and put the EXACT raw document in \`textBody\`, with \`contentType\` set to the real MIME (\`text/xml\`, \`application/xml\`, \`text/csv\`, \`text/html\`, \`text/plain\`). NEVER wrap such a document inside a JSON object like \`{"data": "<?xml..."}\` — the node consumes the raw text, and a JSON wrapper corrupts it. SOAP endpoints return the full SOAP envelope as \`textBody\`; SOAP faults use \`type: "error"\` with the fault XML in \`textBody\`.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// 2 retries: worst case 120s + 300s + 300s = 720s stays inside the 900s
// scenario budget. One retry left large-payload generations (32-row klines,
// multi-entry forecasts) failing both attempts under provider contention —
// observed as _evalMockError mock_issue rows and client-side scenario aborts
// in run 29012884140 (trading-bot, weather-alert families).
const DEFAULT_MAX_RETRIES = 2;
const ERROR_PREVIEW_MAX = 400;
const ERROR_DETAIL_MAX = 300;

/**
 * Hang guard for a single mock-generation LLM call (including tool turns).
 * Provider stalls otherwise eat the whole scenario execution budget — the
 * outer retry in `generateMockResponse` still applies after an abort. The
 * retry gets extra headroom: large legitimate payloads (multi-entry forecasts,
 * list responses) can exceed the first-attempt budget under provider
 * contention, and aborting both attempts turns a slow success into a
 * mock_issue.
 */
const LLM_CALL_TIMEOUT_MS = 120_000;
// 5 min: the response body streams as a submit_response tool-call argument,
// so a scenario-mandated large dataset (e.g. a 32-row Binance klines array)
// legitimately needs several minutes under CI provider contention — observed
// timing out at 180s (3/10 attempts) in run 28699672651.
const LLM_CALL_RETRY_TIMEOUT_MS = 300_000;

interface MockHandlerOptions {
	/** Steers the LLM toward specific behavior (errors, edge cases). */
	scenarioHints?: string;
	/** Workflow-level data context from Phase 1 (generateMockHints). */
	globalContext?: string;
	/** Per-node data hints from Phase 1, keyed by node name. */
	nodeHints?: Record<string, string>;
	/** Compact summary of Phase-1.5 pinned node outputs — fixed data the mock must stay consistent with. */
	pinnedOutputs?: string;
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
	// Identical repeated requests (multi-item loops fanning out one HTTP call
	// per item) are served from cache: one LLM round-trip per distinct request
	// keeps large workflows inside the scenario time budget, and repeats can't
	// drift between items. Promises are cached so concurrent identical requests
	// share one in-flight generation. Evicted after resolution: failed
	// generations (the `_evalMockError` sentinel) so a later identical request
	// gets a fresh attempt, and soft-fallback responses (served after a
	// rejected-and-never-resubmitted `submit_response`, e.g. the date-filter
	// soft rejection) so known-suspect data is served at most once.
	const responseCache = new Map<string, Promise<EvalMockHttpResponse>>();

	return async (requestOptions, node) => {
		// Catch-all: a defect anywhere in the mock pipeline must surface as an
		// `_evalMockError` sentinel (verifier categorizes it mock_issue) with a
		// full stack in the server log — never as an opaque crash of the
		// executing node. Observed in CI as deterministic node crashes with no
		// recorded intercepted request and no stack to debug from.
		try {
			if (!nodeConfigCache.has(node.name)) {
				nodeConfigCache.set(node.name, extractNodeConfig(node));
			}

			const cacheKey = buildMockCacheKey(requestOptions, node.name);
			const cached = cacheKey ? responseCache.get(cacheKey) : undefined;
			if (cached) {
				Container.get(Logger).debug(
					`[EvalMock] Serving cached mock for ${requestOptions.method ?? 'GET'} ${extractEndpoint(requestOptions.url)} ("${node.name}")`,
				);
				return cloneMockResponse(await cached);
			}

			const pending = generateMockResponse(requestOptions, node, {
				scenarioHints: options?.scenarioHints,
				globalContext: options?.globalContext,
				nodeHint: options?.nodeHints?.[node.name],
				pinnedOutputs: options?.pinnedOutputs,
				nodeConfig: nodeConfigCache.get(node.name) ?? '',
				maxRetries: options?.maxRetries ?? DEFAULT_MAX_RETRIES,
			});

			if (cacheKey) {
				responseCache.set(cacheKey, pending);
				void pending.then(
					(response) => {
						if (isMockErrorSentinel(response) || softFallbackResponses.has(response)) {
							responseCache.delete(cacheKey);
						}
					},
					() => responseCache.delete(cacheKey),
				);
			}

			// Clone on EVERY serve (not just cache hits): the first caller shares
			// the object with the cached promise, so an in-place body mutation by
			// node code would otherwise leak into every later hit.
			return cloneMockResponse(await pending);
		} catch (error) {
			return buildPipelineErrorResponse(error, requestOptions, node.name);
		}
	};
}

/**
 * Responses served from a rejected-but-kept `submit_response` (soft fallback).
 * Membership marks them for cache eviction — identified by object identity,
 * so this must be checked against the ORIGINAL response resolved from the
 * cached promise, not the per-serve clones.
 */
const softFallbackResponses = new WeakSet<EvalMockHttpResponse>();

/**
 * Deep-copy the mutable parts of a mock response so no caller can poison the
 * cached original by mutating the body (nodes routinely reshape response data
 * in place) or headers.
 */
function cloneMockResponse(response: EvalMockHttpResponse): EvalMockHttpResponse {
	const body = Buffer.isBuffer(response.body)
		? Buffer.from(response.body)
		: response.body !== null && typeof response.body === 'object'
			? structuredClone(response.body)
			: response.body;
	return { ...response, body, headers: { ...response.headers } };
}

/**
 * Convert an unexpected mock-pipeline exception into the `_evalMockError`
 * sentinel. The stack is collapsed onto one line because the CI container-log
 * capture filters log output line-by-line — a multi-line stack would be
 * stripped down to just its first line.
 */
function buildPipelineErrorResponse(
	error: unknown,
	request: { url?: string; method?: string },
	nodeName: string,
): EvalMockHttpResponse {
	const message = error instanceof Error ? error.message : String(error);
	const stack =
		error instanceof Error && error.stack ? error.stack.replace(/\s*\n\s*/g, ' <- ') : '(no stack)';
	Container.get(Logger).error(
		`[EvalMock] Mock pipeline error for "${nodeName}" (${request.method ?? 'GET'} ${extractEndpoint(request.url ?? '')}): ${message} | stack: ${stack}`,
	);
	return {
		body: { _evalMockError: true, message: `Mock pipeline error: ${message}` },
		headers: { 'content-type': 'application/json' },
		statusCode: 200,
	};
}

/**
 * Stable identity for a mock request: node + method + URL + query + redacted
 * body. Binary bodies are reduced to structural metadata first so Buffers
 * don't blow up the key. Returns undefined (no caching) when the body can't
 * be serialized.
 */
function buildMockCacheKey(
	request: {
		url: string;
		method?: string;
		body?: unknown;
		qs?: Record<string, unknown>;
		headers?: Record<string, unknown>;
	},
	nodeName: string,
): string | undefined {
	try {
		const bodyKey =
			request.body === undefined
				? ''
				: JSON.stringify(redactBinaryBody(request.body, getContentType(request.headers)));
		const qsKey = request.qs ? JSON.stringify(request.qs) : '';
		return [nodeName, request.method ?? 'GET', request.url, qsKey, bodyKey].join('\u0000');
	} catch {
		return undefined;
	}
}

/** True for the fallback body `generateMockResponse` returns when all attempts failed. */
function isMockErrorSentinel(response: EvalMockHttpResponse): boolean {
	const body = response.body;
	return (
		typeof body === 'object' && body !== null && !Array.isArray(body) && '_evalMockError' in body
	);
}

// ---------------------------------------------------------------------------
// LLM mock generation
// ---------------------------------------------------------------------------

interface MockResponseContext {
	scenarioHints?: string;
	globalContext?: string;
	nodeHint?: string;
	pinnedOutputs?: string;
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
	node: { name: string; type: string; parameters?: Record<string, unknown> },
	context: MockResponseContext,
): Promise<EvalMockHttpResponse> {
	// A request without a URL is un-mockable and never comes from a correctly
	// configured node. Declarative (routing) nodes emit one when the selected
	// resource/operation doesn't exist on the node type — routing then
	// contributes neither URL nor method (observed: n8n-nodes-base.openAi
	// configured with audio/transcribe, which only the LangChain OpenAI node
	// supports). Answer with a descriptive 400 so the node fails with a real
	// API-shaped error the verifier can trace to the node's configuration.
	if (!request.url) {
		return buildMissingUrlResponse(node);
	}

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

	if (context.pinnedOutputs) {
		sections.push('', '## Pinned node outputs (authoritative)');
		sections.push(
			'These nodes already have fixed outputs in this execution. Your response MUST stay consistent with them — reuse the same entities, IDs, statuses, and timestamps wherever the scenario implies they refer to the same data (e.g. "stored record matches current status").',
		);
		sections.push(context.pinnedOutputs);
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
	const dateConstraints = extractDateFilterConstraints(request.body, request.qs);

	for (let attempt = 0; attempt <= context.maxRetries; attempt++) {
		try {
			const { spec, softOnly } = await callLlm(
				userPrompt,
				{
					serviceName,
					method: requestMethod,
					pathname: requestPath,
					hostname: requestHostname,
				},
				attempt === 0 ? LLM_CALL_TIMEOUT_MS : LLM_CALL_RETRY_TIMEOUT_MS,
				dateConstraints,
			);
			applyEndpointNormalizers(request, spec);
			const response = materializeSpec(spec);
			// Mark soft-fallback responses so the handler's cache evicts them.
			if (softOnly) softFallbackResponses.add(response);
			return response;
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

/** Descriptive 400 for requests whose URL is missing — see the guard in `generateMockResponse`. */
function buildMissingUrlResponse(node: {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
}): EvalMockHttpResponse {
	const params = node.parameters ?? {};
	const resource = typeof params.resource === 'string' ? params.resource : undefined;
	const operation = typeof params.operation === 'string' ? params.operation : undefined;
	const configured =
		resource || operation
			? ` (configured resource/operation: "${resource ?? '?'}" / "${operation ?? '?'}")`
			: '';

	Container.get(Logger).warn(
		`[EvalMock] Request from "${node.name}" (${node.type}) has no URL${configured} — returning 400 instead of mocking`,
	);

	return {
		body: {
			error: {
				message: `Invalid request: the node sent an HTTP request without a URL${configured}. This means the node's routing produced an empty request — typically the selected resource/operation does not exist on node type "${node.type}". Fix the node configuration or use a node type that supports this operation.`,
			},
		},
		headers: { 'content-type': 'application/json' },
		statusCode: 400,
	};
}

// ---------------------------------------------------------------------------
// Request date-filter validation
// ---------------------------------------------------------------------------

/** A date bound extracted from a request's filter parameters. */
interface DateFilterConstraint {
	/** The request key the bound came from (e.g. "gte", "since"). */
	label: string;
	/** Epoch ms lower bound (records must not be older). */
	min?: number;
	/** Epoch ms upper bound (records must not be newer). */
	max?: number;
}

const MIN_DATE_KEY =
	/^(gte|gt|since|after|created_?after|updated_?after|from|start_?(date|time))$/i;
const MAX_DATE_KEY = /^(lte|lt|before|until|to|end_?(date|time))$/i;

/** Give day-level slack on both sides so timezone/boundary jitter never triggers a rejection. */
const DATE_FILTER_TOLERANCE_MS = 24 * 3600 * 1000;

/** Parse an ISO-looking date string into epoch ms if it lands in a plausible filter window. */
function parseFilterDate(value: unknown): number | undefined {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return undefined;
	const ts = Date.parse(value);
	if (Number.isNaN(ts)) return undefined;
	// Filters far outside the present are not test windows — ignore them.
	const twoYearsMs = 2 * 365 * 24 * 3600 * 1000;
	if (Math.abs(ts - Date.now()) > twoYearsMs) return undefined;
	return ts;
}

/**
 * Collect date bounds from the request body and query — REST params
 * (`?since=...`) and GraphQL filter variables (`variables: { since: ... }`,
 * `filter: { createdAt: { gte: ... } }`) alike.
 */
export function extractDateFilterConstraints(
	body: unknown,
	qs?: Record<string, unknown>,
): DateFilterConstraint[] {
	const constraints: DateFilterConstraint[] = [];

	const visit = (value: unknown, depth: number): void => {
		if (depth > 6 || value === null || typeof value !== 'object') return;
		if (Buffer.isBuffer(value)) return;
		if (Array.isArray(value)) {
			for (const entry of value) visit(entry, depth + 1);
			return;
		}
		for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
			if (MIN_DATE_KEY.test(key)) {
				const ts = parseFilterDate(child);
				if (ts !== undefined) constraints.push({ label: key, min: ts });
			} else if (MAX_DATE_KEY.test(key)) {
				const ts = parseFilterDate(child);
				if (ts !== undefined) constraints.push({ label: key, max: ts });
			}
			visit(child, depth + 1);
		}
	};

	visit(body, 0);
	visit(qs, 0);
	return constraints;
}

/**
 * `"key": "<ISO date>"` pairs in the response body that fall outside every
 * requested bound (with a ±1 day tolerance). Uses the LOOSEST bounds when the
 * request carries several, so a value is only flagged when no reading of the
 * request could admit it. Exported for reuse; the submit_response tool uses
 * this for a one-shot soft rejection.
 */
export function findDateFilterViolations(
	body: unknown,
	constraints: DateFilterConstraint[],
): string[] {
	if (constraints.length === 0 || body === undefined || body === null) return [];

	let serialized: string;
	try {
		serialized = JSON.stringify(body);
	} catch {
		return [];
	}

	const mins = constraints.filter((c) => c.min !== undefined).map((c) => c.min!);
	const maxes = constraints.filter((c) => c.max !== undefined).map((c) => c.max!);
	const loosestMin = mins.length > 0 ? Math.min(...mins) - DATE_FILTER_TOLERANCE_MS : undefined;
	const loosestMax = maxes.length > 0 ? Math.max(...maxes) + DATE_FILTER_TOLERANCE_MS : undefined;

	const violations: string[] = [];
	const seen = new Set<string>();
	const pattern = /"([A-Za-z0-9_]+)":"(\d{4}-\d{2}-\d{2}[^"]*)"/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(serialized)) !== null && violations.length < 3) {
		const [, key, rawDate] = match;
		const ts = Date.parse(rawDate);
		if (Number.isNaN(ts)) continue;
		const tooOld = loosestMin !== undefined && ts < loosestMin;
		const tooNew = loosestMax !== undefined && ts > loosestMax;
		if (!tooOld && !tooNew) continue;
		const entry = `${key}=${rawDate}`;
		if (seen.has(entry)) continue;
		seen.add(entry);
		violations.push(entry);
	}

	return violations;
}

/** Human-readable summary of the request's date bounds for the rejection message. */
function describeDateConstraints(constraints: DateFilterConstraint[]): string {
	return constraints
		.map((c) => {
			const bound = c.min ?? c.max!;
			const side = c.min !== undefined ? '>=' : '<=';
			return `${c.label} ${side} ${new Date(bound).toISOString().slice(0, 10)}`;
		})
		.join(', ');
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
	/** Set after the one-shot date-filter rejection — a resubmission is then accepted as-is. */
	dateFilterWarned?: boolean;
}

function createSubmitResponseTool(
	capture: SubmitCapture,
	dateConstraints: DateFilterConstraint[] = [],
) {
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
			// One-shot deterministic check: prompt rules alone don't reliably stop
			// mocks from returning records outside the request's date window (the
			// single most recurring mock defect in CI). Soft-reject with the exact
			// violations; a resubmission is accepted either way so a nested,
			// legitimately-old date (e.g. a creator's registration date) can never
			// dead-lock the generation.
			if (input.type === 'json' && !capture.dateFilterWarned && dateConstraints.length > 0) {
				const violations = findDateFilterViolations(input.body, dateConstraints);
				if (violations.length > 0) {
					capture.dateFilterWarned = true;
					// Keep as soft fallback in case the agent never resubmits.
					capture.spec = input;
					capture.softOnly = true;
					return reject(
						`Invalid: the request filters by date (${describeDateConstraints(dateConstraints)}), but the response contains date values outside that window: ${violations.join(', ')}. REMOVE every record outside the requested window — the real API filters them out server-side. Do NOT change a record's dates to pull it inside the window: stored records keep the dates the scenario assigns them (a record's age is often exactly what the test checks). Only if a flagged value belongs to a nested unrelated entity (e.g. a creator's registration date — not one of the filtered records) resubmit the same response unchanged to confirm it.`,
					);
				}
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
	timeoutMs: number,
	dateConstraints: DateFilterConstraint[] = [],
): Promise<{ spec: MockResponseSpec; softOnly: boolean }> {
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
		.tool(createSubmitResponseTool(capture, dateConstraints));

	const result = await agent.generate(userPrompt, {
		abortSignal: AbortSignal.timeout(timeoutMs),
	});

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

	return { spec: capture.spec, softOnly: capture.softOnly === true };
}

// ---------------------------------------------------------------------------
// Endpoint-specific spec normalization
// ---------------------------------------------------------------------------

/**
 * Deterministic spec fix-ups for endpoints where the LLM reliably gets the
 * transport encoding wrong. Kept minimal — response shape is the LLM's job;
 * only mechanical encodings that models can't produce reliably belong here.
 */
function applyEndpointNormalizers(
	request: { url: string; qs?: Record<string, unknown> },
	spec: MockResponseSpec,
): void {
	normalizeGmailRawMessage(request, spec);
}

/**
 * Gmail `messages.get?format=raw` responses carry the RFC822 source
 * base64-encoded in `raw` — the n8n Gmail node does `Buffer.from(raw,
 * 'base64')` unconditionally. The endpoint quirk instructs the model to write
 * `raw` as plain RFC822 text (models produce valid base64 unreliably); the
 * encoding happens here. Already-encoded values don't match the RFC822 shape
 * and pass through untouched.
 */
function normalizeGmailRawMessage(
	request: { url: string; qs?: Record<string, unknown> },
	spec: MockResponseSpec,
): void {
	if (spec.type !== 'json') return;
	if (typeof spec.body !== 'object' || spec.body === null || Array.isArray(spec.body)) return;
	if (!/\/gmail\/v1\/users\/[^/]+\/messages\//.test(extractEndpointPath(request.url))) return;

	const body = spec.body as Record<string, unknown>;
	if (typeof body.raw !== 'string' || body.raw.length === 0) return;
	if (!looksLikeRfc822(body.raw)) return;

	body.raw = Buffer.from(body.raw, 'utf8').toString('base64url');
}

/**
 * Header line (`Name: value`) plus a blank-line separator — the RFC822 shape.
 * Base64 text can't match: its alphabet has no `: ` sequence or blank lines.
 */
function looksLikeRfc822(text: string): boolean {
	return /^[A-Za-z][A-Za-z0-9-]*:\s/m.test(text) && /\r?\n\r?\n/.test(text);
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
