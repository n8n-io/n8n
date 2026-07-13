/**
 * Registry of per-API mocking quirks the eval mock-handler exposes via
 * the `get_endpoint_quirks` tool. Entries are short decision rules — the
 * response shape itself comes from the API docs in the user prompt.
 *
 * Bar for adding an entry:
 *   - A scenario reproducibly fails due to a specific API quirk
 *   - The quirk is documented behavior we can cite
 */

export interface MockQuirk {
	/** Matched against the service name extracted from the request URL. */
	service: string;
	/**
	 * Additional hostname patterns (with `*` = single DNS label wildcard) checked
	 * against the request hostname. Use when service extraction (first hostname
	 * label after stripping `api.`/`www.`) doesn't yield the canonical service
	 * name — e.g. `files.slack.com` resolves to "Files" not "Slack", and
	 * `<bucket>.s3.amazonaws.com` resolves to the bucket name not "S3". Either
	 * service equality OR any hostname pattern matching is enough to apply.
	 */
	hostnames?: string[];
	/**
	 * `${METHOD} ${path}` pattern (no query, no host). A `*` path segment
	 * matches exactly one segment — use it for dynamic IDs (see the Gmail
	 * messages.get entry). Omit to apply service-wide.
	 */
	endpoint?: string;
	guidance: string;
	rationale: string;
	/** ISO date (YYYY-MM-DD). */
	addedAt: string;
}

export const MOCK_QUIRKS: MockQuirk[] = [
	{
		service: 'Anthropic',
		guidance:
			'Anthropic Messages API (`POST /v1/messages`) → JSON `{ "id": "msg_01AbCd...", "type": "message", "role": "assistant", "model": "<from request>", "content": [{ "type": "text", "text": "<answer>" }], "stop_reason": "end_turn", "stop_sequence": null, "usage": { "input_tokens": 100, "output_tokens": 50 } }`. `content` MUST be an ARRAY of content-block objects — NEVER a plain string (the n8n node calls `response.content.filter(...)` and crashes on a string). When the request has `tools` and the scenario implies a tool call, use a `{ "type": "tool_use", "id": "toolu_01...", "name": "<tool>", "input": { ... } }` block and `stop_reason: "tool_use"`.',
		rationale:
			"The n8n Anthropic node filters response.content by block type; a string content field throws 'content.filter is not a function'. Observed as the residual mock_issue in eval run 28667058059 (daily-slack-summary/empty-channel).",
		addedAt: '2026-07-03',
	},
	{
		service: 'Notion',
		guidance:
			'Notion documents partial response variants (objects with only `{object, id}`) alongside full ones for many resources (pages, databases, blocks, users). ALWAYS return the FULL response object with all documented fields (`properties`, `parent`, `created_time`, schema, etc.) — never a partial form. Use a partial variant ONLY if the request body explicitly opts in (e.g. a `template` field for create-page). The `object` field must match the endpoint\'s resource type — GET `/v1/databases/{id}` returns `object: "database"`, not `"page"`.',
		rationale:
			'Notion exposes partial variants for many resources without a client-controllable flag. The LLM occasionally picks the partial form (or returns a page-shaped object for a database GET), which crashes n8n nodes that read fields like properties[*].type.',
		addedAt: '2026-05-08',
	},
	{
		service: 'Telegram',
		guidance:
			'Telegram has TWO call shapes on the same host (api.telegram.org). Pick by URL path:\n' +
			'  * `/bot{token}/...` (bot API) → JSON. Wrap responses as `{ ok: true, result: <payload> }`. For `getFile`, `result` must include `file_id`, `file_unique_id`, `file_size`, and `file_path` (e.g. `"voice/file_5.ogg"`); the actual bytes come from a SEPARATE follow-up request to `/file/bot{token}/<file_path>`.\n' +
			'  * `/file/bot{token}/<file_path>` (file CDN) → BINARY. Set `type: "binary"`, `contentType` (and `filename`) from the file extension at the end of the path: `.ogg`/`.oga` → `audio/ogg`, `.mp3` → `audio/mpeg`, `.jpg`/`.jpeg` → `image/jpeg`, `.png` → `image/png`, `.pdf` → `application/pdf`, `.mp4` → `video/mp4`, otherwise `application/octet-stream`.',
		rationale:
			'Telegram bot workflows commonly do `getFile` → download → process (e.g. voice → Whisper). The JSON envelope and the binary download are different request shapes, and the LLM picks the wrong one without explicit guidance.',
		addedAt: '2026-05-19',
	},
	{
		service: 'Openai',
		guidance:
			'OpenAI endpoints commonly seen in workflows:\n' +
			'  * `POST /v1/responses` (Responses API) → JSON `{ "id": "resp_abc123", "object": "response", "status": "completed", "model": "<from request>", "output": [{ "type": "message", "id": "msg_abc123", "status": "completed", "role": "assistant", "content": [{ "type": "output_text", "text": "<answer>", "annotations": [] }] }], "usage": { "input_tokens": 100, "output_tokens": 50, "total_tokens": 150 } }`. The `output` ARRAY is REQUIRED — consumers read `output[].content[].text` and crash without it. NEVER return `{ "content": ... }` or a chat-completions `choices` shape for this endpoint.\n' +
			'  * `POST /v1/audio/transcriptions` and `POST /v1/audio/translations` → JSON `{ "text": "<plausible transcript>", ... }`. The request multipart body has been redacted (you will see `__redacted: "multipart"`); derive the transcript from scenario/node hints when present, otherwise return a short generic English sentence.\n' +
			'  * `POST /v1/images/generations` → JSON `{ "created": <unix>, "data": [{ "url": "https://example.invalid/img.png", "revised_prompt": "..." }] }`. If the request body has `response_format: "b64_json"`, replace `url` with `b64_json` containing a tiny base64 PNG-like blob (literal value `iVBORw0KGgo` is fine — the eval harness does not decode it).\n' +
			'  * `GET /v1/files/{file_id}/content` → BINARY (`type: "binary"`). Use `contentType` matching the file MIME if known, else `application/octet-stream`. The metadata sibling `GET /v1/files/{file_id}` is JSON.\n' +
			'  * Chat completions, embeddings, moderations, files-list, models-list → JSON only.',
		rationale:
			'OpenAI mixes JSON, binary, and base64-in-JSON across endpoints, and AI workflow scenarios depend on the transcript text being plausibly downstream-matchable.',
		addedAt: '2026-05-19',
	},
	{
		service: 'Gmail',
		hostnames: ['gmail.googleapis.com', 'www.googleapis.com'],
		guidance:
			'Gmail message reads are TWO-STEP with distinct shapes. Pick by path:\n' +
			'  * `GET /gmail/v1/users/{userId}/messages` (list) → `{ "messages": [{ "id", "threadId" }, ...], "resultSizeEstimate" }` — ID stubs ONLY, no subjects or bodies; the workflow fetches each message in a follow-up GET.\n' +
			'  * `GET /gmail/v1/users/{userId}/messages/{id}` (single message) → the FULL Message resource: `{ id, threadId, labelIds, snippet, internalDate, payload }` where `payload` = `{ mimeType, headers: [{ name: "Subject"|"From"|"To"|"Date", value }, ...], body: { size, data } }`. Body text lives ONLY under `payload.body.data` as BASE64URL-encoded content (base64 with `-`/`_`) — never plain text at the top level, never a flattened `{ subject, from, body }` object. KEEP IT TINY: the decoded body must be ONE short sentence (≤ 80 chars) so the base64url string stays short — never encode long documents; n8n decodes it and downstream logic only needs the gist.\n' +
			'  * Each message GET must return the DISTINCT email for THAT id — match the id against the scenario/context enumeration (subjects, senders) and never repeat the same subject/body across different ids.\n' +
			'  * `?format=raw` (the n8n Gmail node uses this when simple=false) → `{ id, threadId, labelIds, snippet, internalDate, raw }` where `raw` is the ENTIRE RFC822 message source written as PLAIN multi-line text — the harness applies the base64url transport encoding for you; never pre-encode it. Keep it TINY: a minimal message — `From:`/`To:`/`Subject:`/`Date:` headers, a blank line, then a one-line body (≤ 80 chars). The node Buffer-decodes `raw`; omitting it crashes the workflow.\n' +
			'  * `?format=metadata` → headers only, no `body.data` and no `raw`.',
		rationale:
			"Digest/inbox workflows list message IDs then GET each message; the LLM otherwise returns flattened subject/body objects (Gmail node's payload/base64url parsing yields empty fields) or identical content for every id (digest misses the scenario's distinct emails). Size cap prevents bulk base64 generation from doubling per-request latency and timing out scenarios.",
		addedAt: '2026-07-03',
	},
	{
		service: 'Googleapis',
		guidance:
			'Google Drive on www.googleapis.com routes both JSON and binary on the same host. Pick by path + query:\n' +
			'  * `GET /drive/v3/files/{id}?alt=media` → BINARY. Use `mimeType` from the request query/headers if provided, else default `application/pdf`. Set a sensible `filename` ending in the correct extension.\n' +
			'  * `GET /drive/v3/files/{id}/export?mimeType=<mime>` → BINARY with the requested `mimeType` (Google Docs/Sheets/Slides export).\n' +
			'  * `GET /drive/v3/files/{id}` (no `alt=media`) → JSON metadata.\n' +
			'  * `POST /upload/drive/v3/files?uploadType=...` → JSON metadata about the uploaded file (the upload body is redacted multipart — just synthesize a plausible `{ id, name, mimeType, ... }`). NEVER binary.\n' +
			'  * Sheets/Calendar/Gmail endpoints under `/sheets/v4`, `/calendar/v3`, `/gmail/v1` → JSON.',
		rationale:
			'Drive file download uses `alt=media` on the same URL as metadata; the LLM otherwise treats every `/files/{id}` as metadata JSON and breaks the download path.',
		addedAt: '2026-05-19',
	},
	{
		service: 'Googleapis',
		endpoint: 'GET /gmail/v1/users/me/messages',
		guidance:
			'Gmail messages.list → `{ "messages": [{ "id": "...", "threadId": "..." }], "resultSizeEstimate": <n> }`. The `messages` wrapper key is REQUIRED — never return a bare top-level array (the node reads `response.messages` and silently yields zero items without it). List entries need only `id` + `threadId`; subject/from/body come from the follow-up `GET /gmail/v1/users/me/messages/{id}`, which returns the full message with `payload.headers`.',
		rationale:
			'The Gmail node consumes `responseData.messages` from the list call; a bare array yields zero items with no error. Observed as the residual mock_issue in eval run mock-robustness-fixes-n3 (daily-gmail-action-digest).',
		addedAt: '2026-06-12',
	},
	{
		service: 'Googleapis',
		endpoint: 'GET /gmail/v1/users/*/messages/*',
		guidance:
			'Gmail messages.get — the response shape depends on the `format` query param, and the n8n Gmail node crashes on the wrong one:\n' +
			'  * `format=raw` (what the node sends whenever "Simplify" is off): the message JSON MUST include `raw` containing the FULL RFC822 email source — header lines (`From:`, `To:`, `Subject:`, `Date:`, `Content-Type:`), a blank line, then the body — alongside `id`, `threadId`, `labelIds`, `sizeEstimate`. Write `raw` as PLAIN multi-line text; the harness applies the base64 transport encoding for you. Prefer a simple single-part `Content-Type: text/plain; charset="UTF-8"` message unless the scenario needs attachments. NEVER answer a `format=raw` request with a `payload`-only message — the node decodes `raw` unconditionally.\n' +
			'  * `format=metadata` → `{ id, threadId, labelIds, snippet, sizeEstimate, payload: { headers: [{ name, value }, ...] } }` — headers array only, no body data, no `raw`.\n' +
			'  * `format=full` → `payload` tree where EVERY leaf part carries `body: { size: <n>, data: "<base64url>" }`; multipart containers use `mimeType: "multipart/..."`, `body: { size: 0 }`, and a `parts` array. Never emit a leaf part whose `body` has only `size` — nodes decode `body.data` and crash on undefined.',
		rationale:
			'The Gmail node fetches messages with format=raw and runs Buffer.from(message.raw, "base64") unconditionally; a payload-style mock without `raw` crashes it ("first argument must be of type string... Received undefined" — observed in eval run 28593025895, emails-with-action-items). Multipart `full` responses with data-less leaf parts crash the decode path the same way.',
		addedAt: '2026-07-02',
	},
	{
		service: 'Slack',
		// Covers files.slack.com (PUT /upload/v1/<token>), hooks.slack.com (incoming
		// webhooks), and any future subdomain — the service-name extractor maps these
		// to "Files" / "Hooks" otherwise and the quirk wouldn't fire.
		hostnames: ['*.slack.com'],
		guidance:
			'Slack file endpoints are ALL JSON metadata — NEVER pick `type: "binary"`. The response SHAPE differs per endpoint and matters: the Slack node parses specific keys and silently drops items when the shape is wrong.\n\n' +
			'  * `POST /api/files.getUploadURLExternal` → `{ ok: true, upload_url: "https://files.slack.com/upload/v1/<token>", file_id: "F0ABC123" }`. The next step (Slack v2.4 nodes) PUTs binary bytes to `upload_url`.\n' +
			'  * `PUT https://files.slack.com/upload/v1/<token>` → empty success body. Return `type: "json"` with `body: {}` and statusCode 200.\n' +
			'  * `POST /api/files.completeUploadExternal` → `{ ok: true, files: [{ id, title, mimetype, url_private, permalink, ... }] }` — note the **plural `files` array**, not singular. The Slack v2.4 node reads `files[0]`.\n' +
			'  * `POST /api/files.upload` (legacy single-step) → `{ ok: true, file: { id, name, mimetype, url_private, ... } }` — singular `file` object.\n' +
			'  * `GET /api/files.info` → `{ ok: true, file: { ... } }` (singular).\n' +
			'  * `GET /api/files.list` → `{ ok: true, files: [ ... ] }` (plural array).\n' +
			'  * `POST /api/chat.postMessage` → `{ ok: true, channel, ts, message: { ... } }`.\n\n' +
			'When the request multipart/PUT body contains a file part (`__redacted: "multipart"` or `__redacted: "buffer"`), still return the JSON envelope appropriate for the endpoint — the upload "succeeds" from the API perspective regardless of what bytes were sent. Use the same `file_id` (or `files[0].id`) across the three-step upload chain so downstream nodes can correlate.',
		rationale:
			'Slack file API is JSON-everywhere even when uploading bytes. Two failure modes happen in practice: (a) the LLM picks `binary` for `files.upload` because of the path + multipart body, breaking JSON consumers; (b) the LLM uses singular `file` for `files.completeUploadExternal` instead of the plural `files[]` array, which the v2.4 node then drops to an empty object, losing the file ID downstream.',
		addedAt: '2026-05-19',
	},
	{
		service: 'Dropboxapi',
		guidance:
			'Dropbox splits across two hosts: `api.dropboxapi.com` is JSON RPC, `content.dropboxapi.com` is binary. On `api.dropboxapi.com` (this request), return JSON only. Common paths:\n' +
			'  * `POST /2/files/list_folder`, `POST /2/files/get_metadata`, `POST /2/users/get_current_account` → JSON.\n' +
			'  * `POST /2/files/upload_session/...` → JSON. The `Dropbox-API-Arg` header carries the file metadata; the body is redacted binary.',
		rationale:
			'Dropbox file downloads happen on a different host; this service quirk covers only the JSON RPC host.',
		addedAt: '2026-05-19',
	},
	{
		service: 'S3',
		// Bucket-style hostnames resolve to the bucket name (e.g.
		// `my-bucket.s3.amazonaws.com` → service "My-bucket"), so virtual-hosted
		// requests would never match `service: 'S3'` alone. Path-style on
		// `s3.amazonaws.com` / `s3.<region>.amazonaws.com` already matches via
		// the service field.
		hostnames: [
			'*.s3.amazonaws.com',
			'*.s3.*.amazonaws.com',
			's3.amazonaws.com',
			's3.*.amazonaws.com',
		],
		guidance:
			'Amazon S3 routes by HTTP method on `<bucket>.s3.amazonaws.com` or `s3.<region>.amazonaws.com`:\n' +
			"  * `GET /<key>` (`GetObject`) → BINARY. Infer `contentType` from the key's file extension; default `application/octet-stream`. Set `filename` to the last path segment.\n" +
			'  * `PUT /<key>` (`PutObject`) → empty success body (return `type: "json"` with `body: {}` and statusCode 200; the actual response headers carry `ETag`).\n' +
			'  * `GET /?list-type=2` (`ListObjectsV2`) → XML: use `type: "text"` with the real `<ListBucketResult>` document in `textBody` and `contentType: "application/xml"`.\n' +
			'  * `DELETE /<key>` → empty body, `type: "json"`.',
		rationale:
			'S3 mixes binary and empty responses on the same path skeleton; downstream nodes (Extract from File, image processing) expect a real file body for GET.',
		addedAt: '2026-05-19',
	},
	{
		service: 'Generativelanguage',
		hostnames: ['generativelanguage.googleapis.com'],
		guidance:
			'Google Gemini `POST /v1beta/models/{model}:generateContent` (also `/v1/...`) → the FULL Gemini envelope: `{ "candidates": [{ "content": { "parts": [{ "text": "<answer>" }], "role": "model" }, "finishReason": "STOP", "index": 0 }], "usageMetadata": { "promptTokenCount": 10, "candidatesTokenCount": 20, "totalTokenCount": 30 } }`. The `candidates[].content.parts[].text` path is REQUIRED — the n8n Gemini node reads exactly that and yields nothing (or crashes) without it. NEVER return a bare `{ "text": ... }`, `{ "content": ... }`, or the answer object at the top level. When the request demands JSON output (`generationConfig.responseMimeType: "application/json"`, a `responseSchema`, or prompt instructions for a JSON document), the JSON goes INSIDE `parts[0].text` as a STRING — still wrapped in the full envelope.',
		rationale:
			'The Gemini node parses candidates[].content.parts; bare payload objects yield empty output that downstream IF/parse nodes then misroute. Observed as mock_issue rows in run 29012884140 (whatsapp-faq-assistant, weekly-social-content-scheduler).',
		addedAt: '2026-07-09',
	},
];

/**
 * Match on `${METHOD} ${pathname}` (case-insensitive; `*` in the pattern path
 * matches one path segment), or any endpoint if `quirk.endpoint` is omitted.
 * Exported for testing.
 */
export function quirkMatches(
	quirk: MockQuirk,
	service: string,
	method: string,
	pathname: string,
	hostname?: string,
): boolean {
	const serviceMatch = quirk.service === service;
	const hostnameMatch =
		hostname !== undefined &&
		quirk.hostnames !== undefined &&
		quirk.hostnames.some((pattern) => hostnameMatchesPattern(pattern, hostname));
	if (!serviceMatch && !hostnameMatch) return false;
	if (!quirk.endpoint) return true;
	return endpointMatchesPattern(quirk.endpoint, method, pathname);
}

/**
 * Match an endpoint pattern (`METHOD /path`, `*` = one path segment) against a
 * request method + pathname. Case-insensitive; without `*` it's an exact match.
 * Exported for testing.
 */
export function endpointMatchesPattern(pattern: string, method: string, pathname: string): boolean {
	const spaceIdx = pattern.indexOf(' ');
	if (spaceIdx === -1) return false;
	const patternMethod = pattern.slice(0, spaceIdx);
	const patternPath = pattern.slice(spaceIdx + 1);
	if (patternMethod.toUpperCase() !== method.toUpperCase()) return false;
	if (!patternPath.includes('*')) {
		return patternPath.toUpperCase() === pathname.toUpperCase();
	}
	const parts = patternPath
		.split('/')
		.map((p) => (p === '*' ? '[^/]+' : p.replace(/[.+^${}()|[\]\\?*]/g, '\\$&')));
	return new RegExp(`^${parts.join('/')}$`, 'i').test(pathname);
}

/** Returns all matching guidance lines (composes service-wide + endpoint-specific). */
export function findMockQuirks(
	service: string,
	method: string,
	pathname: string,
	hostname?: string,
): string[] {
	return MOCK_QUIRKS.filter((q) => quirkMatches(q, service, method, pathname, hostname)).map(
		(q) => q.guidance,
	);
}

/**
 * Match a hostname pattern against a DNS hostname. `*` matches exactly one
 * DNS label (no dots); literal dots are literal. Exported for testing.
 *
 * Examples:
 *   hostnameMatchesPattern('*.slack.com', 'files.slack.com')          → true
 *   hostnameMatchesPattern('*.slack.com', 'a.b.slack.com')            → false
 *   hostnameMatchesPattern('*.s3.*.amazonaws.com', 'b.s3.us-east-1.amazonaws.com') → true
 */
export function hostnameMatchesPattern(pattern: string, hostname: string): boolean {
	const parts = pattern
		.split('.')
		.map((p) => (p === '*' ? '[^.]+' : p.replace(/[.+^${}()|[\]\\?*]/g, '\\$&')));
	return new RegExp(`^${parts.join('\\.')}$`).test(hostname);
}
