import type { AgentSkill } from '@n8n/api-types';

/**
 * Share links for skills. The browser encrypts the skill with a new key, the relay
 * stores only the ciphertext, and the key travels in the link fragment, which browsers
 * never send to a server. Neither instance URL is in the link.
 */

/** The relay that stores the ciphertext. A localStorage value overrides it for local testing. */
const DEFAULT_RELAY_URL = 'https://internal.users.n8n.cloud/webhook/skill-share';
const RELAY_URL_STORAGE_KEY = 'N8N_SKILL_SHARE_RELAY_URL';
const SHARE_FORMAT = 'n8n-skill-share/1';
const LINKS_STORAGE_KEY = 'N8N_SKILL_SHARE_LINKS';

export type SharedSkill = Pick<AgentSkill, 'name' | 'description' | 'instructions' | 'references'>;

export type SkillSharePayload = {
	format: typeof SHARE_FORMAT;
	skill: SharedSkill;
	source: { author: string; version: number; sharedAt: string };
};

/** A link this browser created. Kept so the sender can revoke it later. */
export type SkillShareLinkRecord = {
	id: string;
	deleteToken: string;
	url: string;
	version: number;
	expiresAt: string;
	createdAt: string;
};

export class SkillShareError extends Error {
	constructor(
		readonly reason: 'not_found' | 'expired' | 'bad_key' | 'bad_payload' | 'relay',
		message?: string,
	) {
		super(message ?? reason);
	}
}

export function relayUrl(): string {
	return (localStorage.getItem(RELAY_URL_STORAGE_KEY) ?? DEFAULT_RELAY_URL).replace(/\/+$/, '');
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
	const base64 = text.replaceAll('-', '+').replaceAll('_', '/');
	const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function streamThrough(
	bytes: Uint8Array,
	stream: GenericTransformStream,
): Promise<Uint8Array> {
	const source = new Response(bytes).body;
	if (!source) throw new SkillShareError('bad_payload');
	const piped = source.pipeThrough(stream);
	return new Uint8Array(await new Response(piped).arrayBuffer());
}

/** Gzip, then AES-256-GCM. The result is base64url of the IV followed by the ciphertext. */
export async function encryptPayload(
	payload: SkillSharePayload,
): Promise<{ ciphertext: string; key: string }> {
	const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const plain = await streamThrough(
		new TextEncoder().encode(JSON.stringify(payload)),
		new CompressionStream('gzip'),
	);
	const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
	const joined = new Uint8Array(iv.length + sealed.length);
	joined.set(iv);
	joined.set(sealed, iv.length);
	const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
	return { ciphertext: toBase64Url(joined), key: toBase64Url(rawKey) };
}

function isSharedSkill(value: unknown): value is SharedSkill {
	if (typeof value !== 'object' || value === null) return false;
	const skill = value as Record<string, unknown>;
	return (
		typeof skill.name === 'string' &&
		typeof skill.description === 'string' &&
		typeof skill.instructions === 'string' &&
		(skill.references === undefined || Array.isArray(skill.references))
	);
}

function isPayload(value: unknown): value is SkillSharePayload {
	if (typeof value !== 'object' || value === null) return false;
	const payload = value as Record<string, unknown>;
	const source = payload.source as Record<string, unknown> | undefined;
	return (
		payload.format === SHARE_FORMAT &&
		isSharedSkill(payload.skill) &&
		typeof source?.author === 'string' &&
		typeof source?.version === 'number' &&
		typeof source?.sharedAt === 'string'
	);
}

/** A wrong or cut-off key fails the GCM check, so changed content never decrypts. */
export async function decryptPayload(ciphertext: string, key: string): Promise<SkillSharePayload> {
	let plain: Uint8Array;
	try {
		const bytes = fromBase64Url(ciphertext);
		const cryptoKey = await crypto.subtle.importKey('raw', fromBase64Url(key), 'AES-GCM', false, [
			'decrypt',
		]);
		const opened = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: bytes.slice(0, 12) },
			cryptoKey,
			bytes.slice(12),
		);
		plain = await streamThrough(new Uint8Array(opened), new DecompressionStream('gzip'));
	} catch {
		throw new SkillShareError('bad_key');
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(new TextDecoder().decode(plain));
	} catch {
		throw new SkillShareError('bad_payload');
	}
	if (!isPayload(parsed)) throw new SkillShareError('bad_payload');
	return parsed;
}

async function relayRequest<T>(path: string, body?: object): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${relayUrl()}${path}`, {
			method: body ? 'POST' : 'GET',
			// No credentials: the relay never learns who the user is.
			credentials: 'omit',
			...(body
				? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
				: {}),
		});
	} catch {
		throw new SkillShareError('relay');
	}
	if (response.status === 404) throw new SkillShareError('not_found');
	if (response.status === 410) throw new SkillShareError('expired');
	if (!response.ok) throw new SkillShareError('relay', await response.text().catch(() => ''));
	return (await response.json()) as T;
}

export async function uploadToRelay(
	ciphertext: string,
	expiresInDays: number,
): Promise<{ id: string; deleteToken: string; expiresAt: string }> {
	return await relayRequest('/blobs', { ciphertext, expiresInDays });
}

export async function fetchFromRelay(id: string): Promise<string> {
	const { ciphertext } = await relayRequest<{ ciphertext: string }>(
		`/blob?id=${encodeURIComponent(id)}`,
	);
	return ciphertext;
}

export async function revokeOnRelay(id: string, deleteToken: string): Promise<void> {
	await relayRequest('/revoke', { id, deleteToken });
}

export function shareLinkUrl(id: string, key: string): string {
	return `${relayUrl()}/s?id=${encodeURIComponent(id)}#k=${key}`;
}

/** The import route carries the relay id and the key in the fragment: `#share=<id>&k=<key>`. */
export function parseImportHash(hash: string): { id: string; key: string } | null {
	const params = new URLSearchParams(hash.replace(/^#/, ''));
	const id = params.get('share');
	const key = params.get('k');
	return id && key ? { id, key } : null;
}

const PENDING_SHARE_STORAGE_KEY = 'N8N_SKILL_SHARE_PENDING';

/**
 * The sign-in redirect keeps the path but drops the fragment. Runs when the app loads,
 * before the route guards, and keeps an incoming share for this tab until the Skills
 * page reads it.
 */
export function keepIncomingShare(location: Pick<Location, 'pathname' | 'hash'>) {
	if (!location.pathname.endsWith('/settings/context/skills')) return;
	if (parseImportHash(location.hash))
		sessionStorage.setItem(PENDING_SHARE_STORAGE_KEY, location.hash);
}

/** The incoming share from the fragment, or the one kept before a sign-in. Read once. */
export function takeIncomingShare(hash: string): { id: string; key: string } | null {
	const kept = sessionStorage.getItem(PENDING_SHARE_STORAGE_KEY);
	sessionStorage.removeItem(PENDING_SHARE_STORAGE_KEY);
	return parseImportHash(hash) ?? (kept ? parseImportHash(kept) : null);
}

function readLinks(): Record<string, SkillShareLinkRecord[]> {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(LINKS_STORAGE_KEY) ?? '{}');
		return typeof parsed === 'object' && parsed !== null
			? (parsed as Record<string, SkillShareLinkRecord[]>)
			: {};
	} catch {
		return {};
	}
}

/** Links for one skill that have not expired yet. */
export function linksFor(skillId: string): SkillShareLinkRecord[] {
	const now = Date.now();
	return (readLinks()[skillId] ?? []).filter((link) => Date.parse(link.expiresAt) > now);
}

export function saveLinks(skillId: string, links: SkillShareLinkRecord[]) {
	const all = readLinks();
	all[skillId] = links;
	localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(all));
}
