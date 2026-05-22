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
	/** `${METHOD} ${path}` pattern (no query, no host). Omit to apply service-wide. */
	endpoint?: string;
	guidance: string;
	rationale: string;
	/** ISO date (YYYY-MM-DD). */
	addedAt: string;
}

export const MOCK_QUIRKS: MockQuirk[] = [
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
			'  * `GET /?list-type=2` (`ListObjectsV2`) → XML, but the n8n eval framework accepts JSON `{ Contents: [...] }` as a stand-in.\n' +
			'  * `DELETE /<key>` → empty body, `type: "json"`.',
		rationale:
			'S3 mixes binary and empty responses on the same path skeleton; downstream nodes (Extract from File, image processing) expect a real file body for GET.',
		addedAt: '2026-05-19',
	},
];

/** Exact match on `${METHOD} ${pathname}` (case-insensitive), or any endpoint if `quirk.endpoint` is omitted. Exported for testing. */
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
	const key = `${method.toUpperCase()} ${pathname}`;
	return quirk.endpoint.toUpperCase() === key.toUpperCase();
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
