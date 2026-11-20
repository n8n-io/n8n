import { isRecord } from '@n8n/utils/is-record';
import { looksLikeId, type HttpToolArgs } from './http-tool-caller';
import { REDACTED_SECRET, type PathSecretPattern } from './path-secret';

/** What the guard needs to run one HTTP vendor on a gym. The instructions are in `vendors/<name>.md`. */
export interface HttpVendorProfile {
	// Name of the vendor file.
	name: string;
	// The service name that the gym knows, when it differs from the vendor file name.
	gymService?: string;
	// True when the real ids are no UUIDs (Google ids). The hydration then keeps an id that the real
	// data shows word for word, so the agent can use the real id in the gym.
	opaqueIds?: boolean;
	// How the gym issues a bearer, and where the bearer sits in its answer.
	credentialKind: string;
	credentialField: string;
	// The gym issues a credential only for a tenant with an account. Seed one placeholder.
	placeholderSeed: unknown;
	// Set when the API puts a secret in the URL path. The guard removes the secret from the path at once.
	// The real reads get it back, and the gym path gets the token of the tenant.
	pathSecret?: PathSecretPattern;
	// Adds fields to a real JSON answer that the model needs to copy it (decoded text, flat headers).
	enrich?: (json: unknown) => unknown;
	// Last change to an overlay, after the checks. Code adds data here that the real data does not hold.
	finalize?: (overlay: Record<string, unknown>) => Record<string, unknown>;
	// Real reads for the objects that a call needs in the gym, before the first model turn.
	lookups?: (
		tool: string,
		args: Record<string, unknown>,
		result?: unknown,
	) => Array<{ tool: string; args: Record<string, unknown> }>;
	// False when a real read needs no copy in the gym.
	hydrateRead?: (args: HttpToolArgs, real: unknown) => boolean;
	// True when a write names an object that the gym must get first. `gymIds` are the ids the gym made.
	hydrateWrite?: (args: HttpToolArgs, gymIds: ReadonlySet<string>) => boolean;
}

const MAX_BODY = 20_000;
const MAX_LOOKUPS = 8;

const decode = (data: unknown): string =>
	typeof data === 'string' ? Buffer.from(data, 'base64url').toString('utf8') : '';

// The text of the first part of a type, looking through nested parts.
function findBody(part: unknown, mime: string): string | undefined {
	if (!isRecord(part)) return undefined;
	const data = isRecord(part.body) ? part.body.data : undefined;
	if (part.mimeType === mime && typeof data === 'string') return decode(data);
	for (const child of Array.isArray(part.parts) ? part.parts : []) {
		const found = findBody(child, mime);
		if (found !== undefined) return found;
	}
	return undefined;
}

const HEADER_FIELDS: Record<string, string> = {
	from: 'from',
	to: 'to',
	cc: 'cc',
	subject: 'subject',
	'message-id': 'messageId',
	'in-reply-to': 'inReplyTo',
	references: 'references',
};

function enrichMessage(message: Record<string, unknown>): Record<string, unknown> {
	const payload = message.payload;
	if (!isRecord(payload)) return message;
	const hdr: Record<string, string> = {};
	for (const header of Array.isArray(payload.headers) ? payload.headers : []) {
		if (!isRecord(header) || typeof header.name !== 'string' || typeof header.value !== 'string') {
			continue;
		}
		const field = HEADER_FIELDS[header.name.toLowerCase()];
		if (field) hdr[field] = header.value;
	}
	const body = findBody(payload, 'text/plain') ?? findBody(payload, 'text/html') ?? '';
	const out: Record<string, unknown> = {
		...message,
		hdr,
		decodedBody: body.slice(0, MAX_BODY),
		isRead: !(Array.isArray(message.labelIds) ? message.labelIds : []).includes('UNREAD'),
	};
	const millis = Number(message.internalDate);
	if (Number.isFinite(millis)) out.isoDate = new Date(millis).toISOString();
	return out;
}

/** Adds `hdr`, `decodedBody`, `isoDate` and `isRead` to every message, also those in a thread. */
export function enrichGmail(json: unknown): unknown {
	if (Array.isArray(json)) return json.map(enrichGmail);
	if (!isRecord(json)) return json;
	const withMessages = Array.isArray(json.messages)
		? { ...json, messages: json.messages.map(enrichGmail) }
		: json;
	return isRecord(withMessages) && isRecord(withMessages.payload)
		? enrichMessage(withMessages)
		: withMessages;
}

const GMAIL_BASE = '/gmail/v1/users/me';
const OBJECT_IN_PATH = /\/(messages|threads)\/([^/?]+)/;

const fullRead = (kind: 'messages' | 'threads', id: string) => ({
	tool: `read_get_${kind}`,
	args: { method: 'GET', path: `${GMAIL_BASE}/${kind}/${id}`, query: { format: 'full' } },
});

const idsOf = (result: unknown, key: string): string[] => {
	const items = isRecord(result) && Array.isArray(result[key]) ? result[key] : [];
	return items.flatMap((item) => (isRecord(item) && typeof item.id === 'string' ? [item.id] : []));
};

const PLACEHOLDER_ACCOUNT = 'guard@unknown.invalid';

// The gym placeholder account is the only mailbox that the credential of the tenant reads. The checks
// of the plan remove text that the real data lacks, so code sets the account, not the model.
export function withMailbox(overlay: Record<string, unknown>): Record<string, unknown> {
	const native = isRecord(overlay.native) ? overlay.native : undefined;
	const gmail = native && isRecord(native.gmail) ? native.gmail : undefined;
	if (!native || !gmail) return overlay;
	const place = (items: unknown) =>
		Array.isArray(items)
			? items.map((item) => (isRecord(item) ? { ...item, account: PLACEHOLDER_ACCOUNT } : item))
			: items;
	return {
		...overlay,
		native: {
			...native,
			gmail: {
				...gmail,
				...(gmail.messages !== undefined && { messages: place(gmail.messages) }),
				...(gmail.labels !== undefined && { labels: place(gmail.labels) }),
			},
		},
	};
}

export const GMAIL_PROFILE: HttpVendorProfile = {
	name: 'gmail',
	credentialKind: 'google_oauth',
	credentialField: 'oauthTokenData.access_token',
	placeholderSeed: {
		world_version: 1,
		persona: { ref: 'person:me', name: 'Guard', email: PLACEHOLDER_ACCOUNT },
	},
	enrich: enrichGmail,
	finalize: withMailbox,
	lookups: (tool, args, result) => {
		// A list shows only ids. The messages themselves come from reads, and the model copies them.
		if (tool === 'read_list_messages') {
			return idsOf(result, 'messages')
				.slice(0, MAX_LOOKUPS)
				.map((id) => fullRead('messages', id));
		}
		if (tool === 'read_list_threads') {
			return idsOf(result, 'threads')
				.slice(0, MAX_LOOKUPS)
				.map((id) => fullRead('threads', id));
		}
		// A write on an object needs that object in the gym.
		if (tool.startsWith('write_')) {
			const named = OBJECT_IN_PATH.exec(String(args.path));
			if (named && looksLikeId(named[2]))
				return [fullRead(named[1] as 'messages' | 'threads', named[2])];
		}
		return [];
	},
	hydrateRead: (args, real) => {
		// The gym has the system labels. Only a label that the user made needs a copy.
		if (args.path.endsWith('/labels')) {
			const labels = isRecord(real) && Array.isArray(real.labels) ? real.labels : [];
			return labels.some((label) => isRecord(label) && label.type === 'user');
		}
		return true;
	},
	hydrateWrite: (args, gymIds) => {
		const named = OBJECT_IN_PATH.exec(args.path);
		return named !== null && looksLikeId(named[2]) && !gymIds.has(named[2]);
	},
};

// `/bot<token>/<method>` and `/file/bot<token>/<path>`. Group 1 is `/bot`, group 2 is the token.
const TELEGRAM_PATH_SECRET: PathSecretPattern = /^(\/(?:file\/)?bot)([^/]+)/;
const TELEGRAM_BASE = `/bot${REDACTED_SECRET}`;
const MAX_CHAT_ID = 128;

// A chat id is a number or text such as `@name`. It sits in the body, or in the query of a GET.
// It can be short, so `looksLikeId` is no help: look at the field itself.
function chatIdOf(args: Record<string, unknown>): string | undefined {
	const raw = isRecord(args.body) ? args.body.chat_id : undefined;
	const fromQuery = isRecord(args.query) ? args.query.chat_id : undefined;
	return idText(raw ?? fromQuery);
}

function idText(raw: unknown): string | undefined {
	const id = typeof raw === 'number' ? String(raw) : raw;
	return typeof id === 'string' && id !== '' && id.length <= MAX_CHAT_ID ? id : undefined;
}

const methodOf = (path: string): string => path.split('/').pop() ?? '';

export const TELEGRAM_PROFILE: HttpVendorProfile = {
	name: 'telegram',
	defaultAdminUrl: 'http://127.0.0.1:9097',
	defaultGymUrl: 'http://127.0.0.1:8087',
	credentialKind: 'bot_token',
	credentialField: 'accessToken',
	placeholderSeed: {
		world_version: 1,
		persona: {
			ref: 'person:me',
			name: 'Guard',
			email: 'guard@unknown.invalid',
			telegram: { username: 'guard_user', first_name: 'Guard', started: true },
		},
	},
	pathSecret: TELEGRAM_PATH_SECRET,
	lookups: (tool, args) => {
		// A write on a chat needs that chat in the gym. The real chat gives its type, title and name.
		const chat = tool.startsWith('write_') ? chatIdOf(args) : undefined;
		return chat === undefined
			? []
			: [
					{
						tool: 'read_getChat',
						args: { method: 'POST', path: `${TELEGRAM_BASE}/getChat`, body: { chat_id: chat } },
					},
				];
	},
	hydrateRead: (args) => {
		// The gym has its own bot. A file has no content in a copy.
		if (args.path.startsWith('/file/')) return false;
		return !['getMe', 'getFile'].includes(methodOf(args.path));
	},
	// The gym makes its own chat ids, so an id of the gym never equals a real chat id. Check the field.
	hydrateWrite: (args) => chatIdOf(args) !== undefined,
};

export const HTTP_PROFILES: readonly HttpVendorProfile[] = [GMAIL_PROFILE, TELEGRAM_PROFILE];
