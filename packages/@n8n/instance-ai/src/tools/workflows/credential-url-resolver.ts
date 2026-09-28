import { isRecord } from '@n8n/utils/is-record';

import type { CredentialHostInfo } from '../../types';

/**
 * Minimal structural view of a credential type's metadata needed to derive the
 * API host(s) it authenticates against. `ICredentialType` satisfies this shape,
 * so the adapter can pass loaded credential types straight in.
 */
export interface CredentialHostMeta {
	httpRequestNode?: unknown;
	test?: unknown;
	properties?: Array<{ name: string; default?: unknown }>;
}

export type CredentialUrlResolution =
	| { status: 'match'; credentialType: string }
	| { status: 'ambiguous'; candidates: string[] }
	| { status: 'none' };

// Property names that typically hold a service's base URL.
const URL_PROPERTY_NAME = /url|host|base|domain|endpoint|server|region|subdomain/i;

function hostOf(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	// Skip templated/dynamic URLs (self-hosted): we only map concrete hosts.
	if (value.includes('{{') || value.includes('$credentials')) return null;
	const match = value.match(/^https?:\/\/([^/?#'"\s{}]+)/i);
	return match ? match[1].toLowerCase() : null;
}

function propertyDefault(meta: CredentialHostMeta, name: string): unknown {
	return meta.properties?.find((p) => p.name === name)?.default;
}

/**
 * Derive the concrete API host(s) a credential authenticates against, read
 * purely from its declared metadata. Returns `[]` for self-hosted credentials
 * (dynamic base URL with no public default) so they are never auto-matched.
 */
export function deriveCredentialHosts(meta: CredentialHostMeta): string[] {
	const hosts = new Set<string>();
	const add = (value: unknown) => {
		const host = hostOf(value);
		if (host) hosts.add(host);
	};

	if (isRecord(meta.httpRequestNode)) {
		add(meta.httpRequestNode.apiBaseUrl);
		add(meta.httpRequestNode.apiBaseUrlPlaceholder);
	}

	// `test.request.baseURL`: a literal host, or a `{{$credentials.X}}` template
	// we resolve to the default of property X (this is what most API-key creds use).
	if (isRecord(meta.test) && isRecord(meta.test.request)) {
		const base = meta.test.request.baseURL;
		if (typeof base === 'string') {
			if (base.includes('{{')) {
				const ref = base.match(/\$credentials[?.]*\.([A-Za-z0-9_]+)/);
				if (ref) add(propertyDefault(meta, ref[1]));
			} else {
				add(base);
			}
		}
	}

	// Fallback: a URL-ish property default (e.g. a "Base URL" / "host" field).
	if (hosts.size === 0) {
		for (const prop of meta.properties ?? []) {
			if (URL_PROPERTY_NAME.test(prop.name)) add(prop.default);
		}
	}

	return [...hosts];
}

/** Build a `host -> credentialType[]` index. More than one type per host means ambiguous. */
export function buildCredentialHostIndex(infos: CredentialHostInfo[]): Map<string, string[]> {
	const index = new Map<string, string[]>();
	for (const info of infos) {
		for (const host of info.hosts) {
			const existing = index.get(host);
			if (existing) {
				if (!existing.includes(info.type)) existing.push(info.type);
			} else {
				index.set(host, [info.type]);
			}
		}
	}
	return index;
}

/** Resolve an HTTP node URL to a predefined credential type via the host index. */
export function resolveCredentialByUrl(
	url: string,
	index: Map<string, string[]>,
): CredentialUrlResolution {
	const match = url.match(/https?:\/\/([^/?#'"\s{}]+)/i);
	const host = match ? match[1].toLowerCase() : null;
	if (!host) return { status: 'none' };

	const candidates = index.get(host);
	if (!candidates || candidates.length === 0) return { status: 'none' };
	if (candidates.length === 1) return { status: 'match', credentialType: candidates[0] };
	return { status: 'ambiguous', candidates: [...candidates].sort() };
}
