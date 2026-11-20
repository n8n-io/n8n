import { readFileSync } from 'node:fs';
import path from 'node:path';

import { UnexpectedError } from '@n8n/errors';

/**
 * What the guard knows about one vendor: which requests are its own, and the instructions for the
 * model that fills the gym. It lives in `vendors/<name>.md`. The guard loads a file only when a
 * request of its vendor is captured, so the context holds no text of other vendors.
 */
export interface VendorKnowledge {
	name: string;
	hosts: string[];
	// Only paths under one of these prefixes belong to the vendor. A host can serve several APIs.
	// A `*` stands for the rest of one path segment, such as the token in `/bot<token>`.
	pathPrefixes: string[];
	// Hosts whose requests go to the real network as they are (sign-in and token refresh).
	passthroughHosts: string[];
	// Paths of `POST` requests that only read.
	readPaths: RegExp[];
	// Paths of GraphQL endpoints. Only a `POST` to one of them can be a GraphQL query.
	graphqlPaths: RegExp[];
	instructions: string;
}

// `api.test.` and `API.test` name the same host.
export const canonicalHost = (host: string): string => host.toLowerCase().replace(/\.+$/, '');

const list = (value: string | undefined): string[] =>
	(value ?? '')
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item !== '');

function toRegExp(pattern: string, kind: string, source: string): RegExp {
	try {
		return new RegExp(pattern);
	} catch {
		throw new UnexpectedError(`${source}: "${pattern}" is not a valid ${kind} path`);
	}
}

export function parseVendorFile(text: string, source: string): VendorKnowledge {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
	if (!match) throw new UnexpectedError(`${source}: the file has no front block`);
	const fields = new Map<string, string>();
	const lists: Record<'read_paths' | 'graphql_paths', string[]> = {
		read_paths: [],
		graphql_paths: [],
	};
	let current: string | undefined;
	for (const line of match[1].split(/\r?\n/)) {
		const item = /^-\s+(.*)$/.exec(line);
		if (item && (current === 'read_paths' || current === 'graphql_paths')) {
			lists[current].push(item[1].trim());
			continue;
		}
		const field = /^([a-z_]+):\s*(.*)$/.exec(line);
		if (!field) continue;
		current = field[1];
		fields.set(field[1], field[2]);
	}
	const name = fields.get('name')?.trim();
	const hosts = [...new Set(list(fields.get('hosts')).map(canonicalHost))];
	const instructions = match[2].trim();
	if (!name) throw new UnexpectedError(`${source}: the front block has no name`);
	if (hosts.length === 0) throw new UnexpectedError(`${source}: the front block has no hosts`);
	if (instructions === '') throw new UnexpectedError(`${source}: the file has no instructions`);
	return {
		name,
		hosts,
		pathPrefixes: list(fields.get('path_prefixes')),
		passthroughHosts: list(fields.get('passthrough_hosts')).map(canonicalHost),
		readPaths: lists.read_paths.map((source_) => toRegExp(source_, 'read', source)),
		graphqlPaths: lists.graphql_paths.map((source_) => toRegExp(source_, 'GraphQL', source)),
		instructions,
	};
}

const loaded = new Map<string, VendorKnowledge>();

/** Reads `vendors/<name>.md` next to this file, once. */
export function loadVendorKnowledge(name: string): VendorKnowledge {
	const known = loaded.get(name);
	if (known) return known;
	const file = path.join(__dirname, 'vendors', `${name}.md`);
	const vendor = parseVendorFile(readFileSync(file, 'utf8'), `${name}.md`);
	loaded.set(name, vendor);
	return vendor;
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A prefix without `*` is a plain text. With `*`, each one matches one or more characters of a segment.
function matchesPrefix(prefix: string, pathname: string): boolean {
	if (!prefix.includes('*')) return pathname === prefix || pathname.startsWith(`${prefix}/`);
	const source = prefix.split('*').map(escapeRegExp).join('[^/]+');
	return new RegExp(`^${source}(?:/|$)`).test(pathname);
}

export function matchesVendor(vendor: VendorKnowledge, host: string, pathname: string): boolean {
	if (!vendor.hosts.includes(canonicalHost(host))) return false;
	if (vendor.pathPrefixes.length === 0) return true;
	return vendor.pathPrefixes.some((prefix) => matchesPrefix(prefix, pathname));
}

// The vendors that have a file. Add a name here when a file is added.
const VENDOR_NAMES = ['gmail', 'googlesheets', 'googlecalendar'] as const;

export function vendorForRequest(host: string, pathname: string): VendorKnowledge | undefined {
	return VENDOR_NAMES.map(loadVendorKnowledge).find((vendor) =>
		matchesVendor(vendor, host, pathname),
	);
}

/** True for a host whose requests the guard sends to the real network as they are. */
export function isPassthroughHost(host: string): boolean {
	return VENDOR_NAMES.map(loadVendorKnowledge).some((vendor) =>
		vendor.passthroughHosts.includes(canonicalHost(host)),
	);
}

/**
 * True for a token exchange or refresh on a sign-in host: a POST to a path that ends in `/token`.
 * Any other request on that host, such as a token revocation, is not passed through.
 */
export function isTokenExchange(req: { method: string; url: URL }): boolean {
	return (
		req.url.protocol === 'https:' &&
		isPassthroughHost(req.url.hostname) &&
		req.method.toUpperCase() === 'POST' &&
		/\/token$/.test(req.url.pathname)
	);
}
