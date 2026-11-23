import { isRecord } from '@n8n/utils/is-record';
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
	// The gym warns about an unknown field when two vendors share an entity kind and each knows other
	// fields (`calendar_event` of Google Calendar and Outlook). Names the paths of such warnings.
	ignoreSeedWarning?: (path: string) => boolean;
	// A read under an id that only the gym knows (a calendar, a folder) has no real twin by that id.
	// This names the real read that holds the same data, so the gym gets a copy of it first.
	// `ask` reads a path from the gym.
	mirrorRead?: (
		args: HttpToolArgs,
		ask: (path: string) => Promise<unknown>,
	) => Promise<HttpToolArgs | undefined>;
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

// ---- Microsoft Outlook (Graph) ----

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
};

// Plain text of an HTML body. The model reads it and copies it. It is not a security filter.
export function htmlToText(html: string): string {
	return html
		.replace(/<(style|script|head)\b[\s\S]*?<\/\1\s*>/gi, '')
		.replace(/<br\s*\/?>|<\/(?:p|div|li|tr|h[1-6])\s*>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (whole, dec, hex, name) => {
			const code = dec ? Number(dec) : hex ? parseInt(hex, 16) : undefined;
			if (code === undefined) return NAMED_ENTITIES[String(name).toLowerCase()] ?? whole;
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
		})
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

const addressOf = (recipient: unknown): string | undefined => {
	const email = isRecord(recipient) ? recipient.emailAddress : undefined;
	return isRecord(email) && typeof email.address === 'string' ? email.address : undefined;
};

const addressesOf = (list: unknown): string[] =>
	(Array.isArray(list) ? list : []).flatMap((item) => addressOf(item) ?? []);

function enrichGraphObject(item: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = { ...item };
	const body = item.body;
	if (isRecord(body) && typeof body.content === 'string') {
		const text =
			String(body.contentType).toLowerCase() === 'html' ? htmlToText(body.content) : body.content;
		out.decodedBody = text.slice(0, MAX_BODY);
	}
	const from = addressOf(item.from);
	if (from !== undefined) out.fromAddress = from;
	if (Array.isArray(item.toRecipients)) out.toAddresses = addressesOf(item.toRecipients);
	if (Array.isArray(item.ccRecipients)) out.ccAddresses = addressesOf(item.ccRecipients);
	// A message has a received time. An event has a start time with a zone, so it is not a plain ISO text.
	if (typeof item.receivedDateTime === 'string') out.isoDate = item.receivedDateTime;
	else if (isRecord(item.start) && typeof item.start.dateTime === 'string') {
		const zone = item.start.timeZone === 'UTC' || item.start.timeZone === undefined ? 'Z' : '';
		out.isoDate = `${item.start.dateTime}${zone}`;
		const end = isRecord(item.end) ? item.end.dateTime : undefined;
		const minutes =
			typeof end === 'string'
				? (Date.parse(`${end}${zone}`) - Date.parse(`${item.start.dateTime}${zone}`)) / 60_000
				: Number.NaN;
		if (Number.isFinite(minutes) && minutes > 0) out.duration = `${Math.round(minutes)}m`;
	}
	return out;
}

/** Adds `decodedBody`, `fromAddress`, `toAddresses`, `ccAddresses` and `isoDate` to messages and events. */
export function enrichOutlook(json: unknown): unknown {
	if (Array.isArray(json)) return json.map(enrichOutlook);
	if (!isRecord(json)) return json;
	if (Array.isArray(json.value)) return { ...json, value: json.value.map(enrichOutlook) };
	return enrichGraphObject(json);
}

const OUTLOOK_PERSONA = 'person:me';

// The gym placeholder account is the only mailbox that the credential of the tenant reads. Code sets
// it, so that a message of a real address with no account in the gym has a mailbox.
export function withOutlookMailbox(overlay: Record<string, unknown>): Record<string, unknown> {
	return withEventKind(withOutlookMailboxNative(overlay));
}

// The kind of an event is no data of the real result, so the checks of the plan remove it. Code sets it.
function withEventKind(overlay: Record<string, unknown>): Record<string, unknown> {
	if (!Array.isArray(overlay.entities)) return overlay;
	const isEvent = (entity: unknown): entity is Record<string, unknown> =>
		isRecord(entity) &&
		entity.kind === undefined &&
		entity.at !== undefined &&
		entity.messages === undefined;
	if (!overlay.entities.some(isEvent)) return overlay;
	return {
		...overlay,
		entities: overlay.entities.map((entity) =>
			isEvent(entity) ? { ...entity, kind: 'calendar_event' } : entity,
		),
	};
}

function withOutlookMailboxNative(overlay: Record<string, unknown>): Record<string, unknown> {
	const native = isRecord(overlay.native) ? overlay.native : undefined;
	const outlook = native && isRecord(native.outlook) ? native.outlook : undefined;
	if (!native || !outlook) return overlay;
	const place = (items: unknown) =>
		Array.isArray(items)
			? items.map((item) => (isRecord(item) ? { ...item, account: OUTLOOK_PERSONA } : item))
			: items;
	return {
		...overlay,
		native: {
			...native,
			outlook: {
				...outlook,
				...(outlook.messages !== undefined && { messages: place(outlook.messages) }),
				...(outlook.folders !== undefined && { folders: place(outlook.folders) }),
				...(outlook.contacts !== undefined && { contacts: place(outlook.contacts) }),
				...(outlook.calendars !== undefined && { calendars: place(outlook.calendars) }),
			},
		},
	};
}

// The last collection of the path that has an id after it, such as `/v1.0/me/messages/<id>/move`.
const GRAPH_OBJECT = /^(.*\/(?:messages|mailFolders|events|contacts|calendars))\/([^/?]+)/;

// `/v1.0/me` or `/v1.0/users/<address>`.
const MAILBOX_PREFIX = /^(\/v1\.0\/(?:me|users\/[^/]+))\//;

const decodeSegment = (segment: string): string => {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
};

const graphObject = (path: string): { base: string; id: string } | undefined => {
	const named = GRAPH_OBJECT.exec(path);
	if (!named) return undefined;
	const id = decodeSegment(named[2]);
	return looksLikeId(id) ? { base: named[1], id } : undefined;
};

const WELL_KNOWN_FOLDERS: ReadonlySet<string> = new Set(
	[
		'Inbox',
		'Drafts',
		'Sent Items',
		'Deleted Items',
		'Junk Email',
		'Archive',
		'Outbox',
		'Conversation History',
		'Clutter',
		'Notes',
		'Sync Issues',
		'Scheduled',
	].map((name) => name.toLowerCase()),
);

const readOf = (base: string, id: string) => ({
	tool: `read_get_${base.split('/').pop()}`,
	args: { method: 'GET', path: `${base}/${encodeURIComponent(id)}` },
});

const GRAPH_CALENDAR_READ =
	/^(\/v1\.0\/(?:me|users\/[^/]+))\/calendars\/[^/]+\/(events|calendarView)$/;
const GRAPH_FOLDER_READ =
	/^(\/v1\.0\/(?:me|users\/[^/]+))\/mailFolders\/([^/]+)\/(messages|childFolders)$/;

// The names that Graph accepts in place of the id of a system folder.
const WELL_KNOWN_FOLDER_NAMES: Readonly<Record<string, string>> = {
	inbox: 'inbox',
	drafts: 'drafts',
	'sent items': 'sentitems',
	'deleted items': 'deleteditems',
	'junk email': 'junkemail',
	archive: 'archive',
};

// The gym has one default calendar and the system folders. The agent sees their ids, which the real
// service does not know. The real twin is the default calendar and the system folder of the same name.
async function mirrorOutlookRead(
	args: HttpToolArgs,
	ask: (path: string) => Promise<unknown>,
): Promise<HttpToolArgs | undefined> {
	const calendar = GRAPH_CALENDAR_READ.exec(args.path);
	if (calendar) return { ...args, path: `${calendar[1]}/${calendar[2]}` };
	const folder = GRAPH_FOLDER_READ.exec(args.path);
	if (!folder) return undefined;
	const named = await ask(`${folder[1]}/mailFolders/${folder[2]}`).catch(() => undefined);
	const name = isRecord(named) && typeof named.displayName === 'string' ? named.displayName : '';
	const wellKnown = WELL_KNOWN_FOLDER_NAMES[name.toLowerCase()];
	return wellKnown === undefined
		? undefined
		: { ...args, path: `${folder[1]}/mailFolders/${wellKnown}/${folder[3]}` };
}

export const OUTLOOK_PROFILE: HttpVendorProfile = {
	name: 'outlook',
	credentialKind: 'ms_oauth',
	credentialField: 'oauthTokenData.access_token',
	placeholderSeed: {
		world_version: 1,
		persona: { ref: OUTLOOK_PERSONA, name: 'Guard', email: PLACEHOLDER_ACCOUNT },
	},
	enrich: enrichOutlook,
	finalize: withOutlookMailbox,
	mirrorRead: mirrorOutlookRead,
	// Google Calendar also claims `calendar_event` and does not know these fields of an Outlook event.
	ignoreSeedWarning: (path) =>
		/^\$\.entities\[\d+\]\.(?:subject|body|show_as|private|categories|responses)$/.test(path),
	lookups: (tool, args) => {
		// A list holds full messages, so a list needs no extra read. A write on an object needs that
		// object in the gym.
		if (!tool.startsWith('write_')) return [];
		const reads: Array<{ tool: string; args: Record<string, unknown> }> = [];
		const named = graphObject(String(args.path));
		if (named) reads.push(readOf(named.base, named.id));
		// A move names its destination folder in the body.
		const body = isRecord(args.body) ? args.body : undefined;
		const destination = body && typeof body.destinationId === 'string' ? body.destinationId : '';
		const mailbox = MAILBOX_PREFIX.exec(String(args.path))?.[1];
		if (mailbox && looksLikeId(destination))
			reads.push(readOf(`${mailbox}/mailFolders`, destination));
		return reads.slice(0, MAX_LOOKUPS);
	},
	hydrateRead: (args, real) => {
		// The gym has a default calendar. Only a calendar that the user made needs a copy.
		if (/\/calendars$/.test(args.path)) {
			const calendars = isRecord(real) && Array.isArray(real.value) ? real.value : [];
			return calendars.some((c) => isRecord(c) && c.isDefaultCalendar !== true);
		}
		// The gym has the system folders. Only a folder that the user made needs a copy.
		if (/\/(?:mailFolders|childFolders)$/.test(args.path)) {
			const folders = isRecord(real) && Array.isArray(real.value) ? real.value : [];
			return folders.some(
				(folder) =>
					isRecord(folder) &&
					typeof folder.displayName === 'string' &&
					!WELL_KNOWN_FOLDERS.has(folder.displayName.toLowerCase()),
			);
		}
		return true;
	},
	hydrateWrite: (args, gymIds) => {
		const named = graphObject(args.path);
		return named !== undefined && !gymIds.has(named.id);
	},
};

export const HTTP_PROFILES: readonly HttpVendorProfile[] = [GMAIL_PROFILE, OUTLOOK_PROFILE];
