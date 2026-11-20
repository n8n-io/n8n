import { isRecord } from './gym-admin';
import { looksLikeId, type HttpToolArgs } from './http-tool-caller';
import type { PathSecretPattern } from './path-secret';

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

const YOUTUBE_RESOURCE =
	/^\/(?:upload\/)?youtube\/v3\/(playlists|playlistItems|videos|channels)(?:\/|$)/;
// The parts that a copy of an object needs. A get costs 1 quota unit, with any parts.
const YOUTUBE_PARTS: Record<string, string> = {
	playlists: 'snippet,status,contentDetails',
	playlistItems: 'snippet,contentDetails,status',
	videos: 'snippet,status,contentDetails',
	channels: 'snippet,contentDetails,brandingSettings',
};
// A YouTube id is letters, digits, `-` and `_`. Anything else is not put in a real read.
const YOUTUBE_ID = /^[A-Za-z0-9_-]{1,64}$/;
// The real data that these lists give is the same in every account. The gym has its own copy.
const YOUTUBE_STATIC_LISTS = /\/(videoCategories|i18nLanguages)$/;
const YOUTUBE_OWNER = 'person:me';

const idIn = (value: unknown): string | undefined =>
	typeof value === 'string' && YOUTUBE_ID.test(value) ? value : undefined;

// The objects that a write names: the target (`id` in the body or the query) and, for a playlist item,
// the playlist and the video in its snippet. Each entry is [resource, id].
function youtubeNamed(args: Record<string, unknown>): Array<[string, string]> {
	const resource = YOUTUBE_RESOURCE.exec(String(args.path))?.[1];
	if (!resource) return [];
	const body = isRecord(args.body) ? args.body : {};
	const query = isRecord(args.query) ? args.query : {};
	const snippet = isRecord(body.snippet) ? body.snippet : {};
	const target = idIn(body.id) ?? idIn(query.id);
	const named: Array<[string, string | undefined]> = [
		[resource, target],
		['playlists', idIn(snippet.playlistId)],
		['videos', isRecord(snippet.resourceId) ? idIn(snippet.resourceId.videoId) : undefined],
	];
	return named.flatMap(([kind, id]) => (id === undefined ? [] : [[kind, id] as [string, string]]));
}

// The gym has one account. Code sets it as the owner, so a model cannot name a person that is missing.
export function withYoutubeOwner(overlay: Record<string, unknown>): Record<string, unknown> {
	const native = isRecord(overlay.native) ? overlay.native : undefined;
	const youtube = native && isRecord(native.google_youtube) ? native.google_youtube : undefined;
	if (!native || !youtube) return overlay;
	const own = (items: unknown) =>
		Array.isArray(items)
			? items.map((item) =>
					isRecord(item) ? { ...item, owner: YOUTUBE_OWNER, visibility: 'tenant' } : item,
				)
			: items;
	const owned = { ...youtube };
	for (const key of ['channels', 'videos', 'playlists']) {
		if (owned[key] !== undefined) owned[key] = own(owned[key]);
	}
	return { ...overlay, native: { ...native, google_youtube: owned } };
}

// Needs the gym of `google-wildcard` (service "youtube"). It shares www.googleapis.com with Gmail.
export const YOUTUBE_PROFILE: HttpVendorProfile = {
	name: 'youtube',
	defaultAdminUrl: 'http://127.0.0.1:9098',
	defaultGymUrl: 'http://127.0.0.1:8088',
	credentialKind: 'google_oauth',
	credentialField: 'oauthTokenData.access_token',
	placeholderSeed: {
		world_version: 1,
		persona: { ref: YOUTUBE_OWNER, name: 'Guard', email: 'guard@unknown.invalid' },
	},
	finalize: withYoutubeOwner,
	lookups: (tool, args) => {
		// A write on an object needs that object in the gym. A get of one object costs 1 quota unit.
		if (!tool.startsWith('write_')) return [];
		return youtubeNamed(args).map(([resource, id]) => ({
			tool: `read_list_${resource}`,
			args: {
				method: 'GET',
				path: `/youtube/v3/${resource}`,
				query: { part: YOUTUBE_PARTS[resource], id },
			},
		}));
	},
	hydrateRead: (args) => !YOUTUBE_STATIC_LISTS.test(args.path),
	// An id that the gym made is not in the real service. Skip the real lookups of it.
	hydrateWrite: (args, gymIds) => youtubeNamed(args).some(([, id]) => !gymIds.has(id)),
};

export const HTTP_PROFILES: readonly HttpVendorProfile[] = [GMAIL_PROFILE, YOUTUBE_PROFILE];
