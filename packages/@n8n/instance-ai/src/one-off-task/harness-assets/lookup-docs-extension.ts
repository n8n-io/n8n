/**
 * `lookup_docs` pi extension tool, written to
 * `.pi/extensions/n8n-lookup-docs.ts`. Queries the Context7 public HTTP API
 * for current SDK documentation (search endpoint plus per-library docs
 * endpoint, both verified against https://context7.com/api/v1). An API key is
 * optional — Context7 serves anonymous requests with tighter rate limits — and
 * is read from CONTEXT7_API_KEY when present. Every failure degrades to a
 * "documentation unavailable" result so a docs outage never fails a task.
 */
export const LOOKUP_DOCS_EXTENSION_SOURCE = String.raw`/**
 * n8n one-off task: lookup_docs tool (Context7).
 *
 * Self-contained on purpose: pi loads this file with jiti inside the sandbox,
 * where the n8n workspace does not exist. Do not add imports beyond node
 * built-ins and the modules pi bundles for extensions.
 */
import { Type } from 'typebox';

const CONTEXT7_BASE_URL = 'https://context7.com/api/v1';
const DOCS_TOKEN_BUDGET = 5000;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RESULT_CHARS = 60000;

// Minimal structural slice of pi's extension API — local because this file
// cannot import n8n workspace types.
interface ToolContext {
	cwd: string;
}
interface ToolTextContent {
	type: 'text';
	text: string;
}
interface ToolResult {
	content: ToolTextContent[];
	details: unknown;
	terminate?: boolean;
}
interface ToolsExtensionApi {
	registerTool(tool: {
		name: string;
		label: string;
		description: string;
		parameters: unknown;
		execute(
			toolCallId: string,
			params: Record<string, unknown>,
			signal: AbortSignal | undefined,
			onUpdate: unknown,
			ctx: ToolContext,
		): Promise<ToolResult>;
	}): void;
}

function unavailable(reason: string): ToolResult {
	return {
		content: [
			{
				type: 'text',
				text:
					'Documentation unavailable (' +
					reason +
					'). Proceed with your existing knowledge of the SDK, and rely on read-back' +
					' verification to catch mistakes.',
			},
		],
		details: { available: false, reason },
	};
}

async function context7Fetch(
	pathname: string,
	signal: AbortSignal | undefined,
): Promise<{ status: number; body: string }> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	const onOuterAbort = () => controller.abort();
	if (signal !== undefined) signal.addEventListener('abort', onOuterAbort, { once: true });
	try {
		const headers: Record<string, string> = {};
		const apiKey = process.env.CONTEXT7_API_KEY;
		if (typeof apiKey === 'string' && apiKey.length > 0) {
			headers.Authorization = 'Bearer ' + apiKey;
		}
		const response = await fetch(CONTEXT7_BASE_URL + pathname, {
			headers,
			signal: controller.signal,
		});
		const body = await response.text();
		return { status: response.status, body };
	} finally {
		clearTimeout(timeout);
		if (signal !== undefined) signal.removeEventListener('abort', onOuterAbort);
	}
}

export default function (pi: ToolsExtensionApi) {
	pi.registerTool({
		name: 'lookup_docs',
		label: 'Look up SDK docs',
		description:
			'Fetch current documentation for an SDK or API from Context7. Provide the library name' +
			' (e.g. "googleapis" or "@slack/web-api") and optionally a topic to narrow the docs.' +
			' Use this before coding against an unfamiliar SDK instead of guessing from memory.',
		parameters: Type.Object({
			libraryName: Type.String({
				description: 'Package or product name to look up, e.g. "googleapis" or "notion sdk"',
			}),
			topic: Type.Optional(
				Type.String({ description: 'Narrow the docs to a topic, e.g. "append values to sheet"' }),
			),
			libraryId: Type.Optional(
				Type.String({
					description:
						'Exact Context7 library id from a previous lookup, e.g.' +
						' "/googleapis/google-api-nodejs-client" — skips the search step',
				}),
			),
		}),
		async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
			try {
				let libraryId =
					typeof params.libraryId === 'string' && params.libraryId.length > 0
						? params.libraryId
						: undefined;
				let libraryTitle;
				if (libraryId === undefined) {
					const query = typeof params.libraryName === 'string' ? params.libraryName : '';
					if (query.length === 0) return unavailable('libraryName is required');
					const search = await context7Fetch('/search?query=' + encodeURIComponent(query), signal);
					if (search.status !== 200) {
						return unavailable('search failed with HTTP ' + search.status);
					}
					let results = [];
					try {
						const parsed = JSON.parse(search.body);
						if (parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.results)) {
							results = parsed.results;
						}
					} catch {
						return unavailable('search returned malformed JSON');
					}
					const first = results.find(
						(result) => result !== null && typeof result === 'object' && typeof result.id === 'string',
					);
					if (first === undefined) return unavailable('no library matched "' + query + '"');
					libraryId = first.id;
					libraryTitle = typeof first.title === 'string' ? first.title : undefined;
				}
				const normalizedId = libraryId.startsWith('/') ? libraryId.slice(1) : libraryId;
				let docsPath = '/' + normalizedId + '?type=txt&tokens=' + DOCS_TOKEN_BUDGET;
				if (typeof params.topic === 'string' && params.topic.length > 0) {
					docsPath += '&topic=' + encodeURIComponent(params.topic);
				}
				const docs = await context7Fetch(docsPath, signal);
				if (docs.status !== 200) {
					return unavailable('docs fetch failed with HTTP ' + docs.status);
				}
				const body =
					docs.body.length > MAX_RESULT_CHARS
						? docs.body.slice(0, MAX_RESULT_CHARS) + '\n[truncated]'
						: docs.body;
				const header =
					'Context7 docs for ' +
					(libraryTitle !== undefined ? libraryTitle + ' (' + libraryId + ')' : libraryId) +
					(typeof params.topic === 'string' && params.topic.length > 0
						? ', topic: ' + params.topic
						: '') +
					':\n\n';
				return {
					content: [{ type: 'text', text: header + body }],
					details: { available: true, libraryId },
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return unavailable(message);
			}
		},
	});
}
`;
