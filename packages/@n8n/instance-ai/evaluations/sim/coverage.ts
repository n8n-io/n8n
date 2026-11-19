// ---------------------------------------------------------------------------
// Which simulated service each node of a built workflow talks to.
//
// Two run-time sources, no list of services: n8n's node descriptions (which
// credential types a node accepts, and the parameter values that require each
// one) and the sim server's manifests (which hosts it serves and which n8n
// credential types it issues).
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';

import type { SimService } from './sim-admin-client';
import type { WorkflowNodeResponse } from '../clients/n8n-client';

export interface NodeCredentialOption {
	type: string;
	/** The credential's `displayOptions.show`: parameter values that require it. */
	show: Record<string, unknown[]>;
}

export interface NodeVersionInfo {
	credentials: NodeCredentialOption[];
	/** Parameter defaults: a node that keeps a default does not store the value. */
	defaults: Record<string, unknown>;
}

export interface NodeTypeInfo {
	isTrigger: boolean;
	/** The trigger polls its service (Gmail Trigger, Google Sheets Trigger). */
	isPolling: boolean;
	versions: Map<number, NodeVersionInfo>;
}

export type NodeTypeIndex = Map<string, NodeTypeInfo>;

/** Indexes n8n's `/types/nodes.json` per node type and type version. */
export function indexNodeTypes(descriptions: unknown): NodeTypeIndex {
	const index: NodeTypeIndex = new Map();
	if (!Array.isArray(descriptions)) return index;
	for (const description of descriptions) {
		if (!isRecord(description) || typeof description.name !== 'string') continue;
		const info = index.get(description.name) ?? {
			isTrigger: false,
			isPolling: false,
			versions: new Map(),
		};
		const group = Array.isArray(description.group) ? description.group : [];
		info.isTrigger ||= group.includes('trigger');
		info.isPolling ||= description.polling === true;
		const entry: NodeVersionInfo = { credentials: [], defaults: {} };
		for (const property of Array.isArray(description.properties) ? description.properties : []) {
			if (isRecord(property) && typeof property.name === 'string') {
				entry.defaults[property.name] ??= property.default;
			}
		}
		for (const credential of Array.isArray(description.credentials)
			? description.credentials
			: []) {
			if (!isRecord(credential) || typeof credential.name !== 'string') continue;
			const show =
				isRecord(credential.displayOptions) && isRecord(credential.displayOptions.show)
					? credential.displayOptions.show
					: {};
			entry.credentials.push({
				type: credential.name,
				show: Object.fromEntries(
					Object.entries(show).map(([key, values]) => [key, [values].flat()]),
				),
			});
		}
		for (const version of [description.version ?? 1].flat()) {
			if (typeof version === 'number') info.versions.set(version, entry);
		}
		index.set(description.name, info);
	}
	return index;
}

/** The description of a node's type version; the newest one when n8n no longer has that version. */
export function versionInfo(
	info: NodeTypeInfo | undefined,
	typeVersion: number | undefined,
): NodeVersionInfo | undefined {
	if (!info) return undefined;
	const exact = typeVersion === undefined ? undefined : info.versions.get(typeVersion);
	return exact ?? info.versions.get(Math.max(...info.versions.keys()));
}

function holds(expected: unknown[], actual: unknown): boolean {
	return expected.some((value) => {
		if (!isRecord(value) || !isRecord(value._cnd)) return value === actual;
		const [operator, bound] = Object.entries(value._cnd)[0] ?? [];
		if (typeof actual !== 'number' || typeof bound !== 'number') return true;
		if (operator === 'gte') return actual >= bound;
		if (operator === 'gt') return actual > bound;
		if (operator === 'lte') return actual <= bound;
		if (operator === 'lt') return actual < bound;
		if (operator === 'eq') return actual === bound;
		return true;
	});
}

/** Whether the node's parameters (or their defaults) require a credential, ignoring `skip`. */
function requires(
	option: NodeCredentialOption,
	node: WorkflowNodeResponse,
	defaults: Record<string, unknown>,
	skip?: string,
): boolean {
	return Object.entries(option.show).every(([key, expected]) => {
		const name = key.replace(/^\//, '');
		if (name === skip) return true;
		const actual =
			name === '@version' ? node.typeVersion : (node.parameters?.[name] ?? defaults[name]);
		return holds(expected, actual);
	});
}

/** How to get an n8n credential of one type from the sim server. */
export interface CredentialSource {
	service: SimService;
	request: Record<string, unknown>;
}

export interface SimCatalog {
	services: SimService[];
	serviceForHost(host: string): SimService | undefined;
	credentialSource(type: string): CredentialSource | undefined;
}

function hostMatches(pattern: string, host: string): boolean {
	if (pattern.startsWith('*.')) return host.endsWith(pattern.slice(1)) || host === pattern.slice(2);
	if (pattern.includes('{')) return host.endsWith(pattern.slice(pattern.indexOf('}') + 1));
	return host === pattern;
}

/**
 * Indexes the discovered services. `extraSources` holds credential types found by
 * probing services whose manifests do not name them yet (see `credentialProbes`).
 */
export function buildCatalog(
	services: SimService[],
	extraSources: Map<string, CredentialSource> = new Map(),
): SimCatalog {
	// Shared hosts and credential types (googleapis.com, googleSheetsOAuth2Api): a service with a
	// world model beats a legacy fake, and a dedicated service beats a combined one (google-sheets over google).
	const ranked = [...services].sort(
		(a, b) =>
			Number(b.kinds.length > 0) - Number(a.kinds.length > 0) || a.hosts.length - b.hosts.length,
	);
	const sources = new Map<string, CredentialSource>();
	for (const service of ranked) {
		for (const info of service.credentialInfo) {
			if (!info.n8nType) continue;
			const current = sources.get(info.n8nType);
			if (!current || (info.isDefault && current.service === service)) {
				// A core tenant spans every core service, so the request names the service.
				sources.set(info.n8nType, {
					service,
					request: { service: service.slug, credential: info.id },
				});
			}
		}
	}
	return {
		services,
		serviceForHost: (host) => {
			const h = host.toLowerCase();
			return ranked.find((s) => s.hosts.some((pattern) => hostMatches(pattern, h)));
		},
		credentialSource: (type) => sources.get(type) ?? extraSources.get(type),
	};
}

/**
 * Requests that may issue `type` from a service whose manifest does not map its
 * credentials to n8n types yet: `{service: <product>}` names derived from the
 * type (`gmailOAuth2` -> gmail, `googleSheetsOAuth2Api` -> googlesheets, sheets),
 * then the service's default. The caller keeps the one whose response has `type`.
 */
export function credentialProbes(type: string): Array<Record<string, unknown>> {
	const base = type.replace(/(OAuth2Api|OAuth2|Api)$/i, '');
	const lower = base.toLowerCase();
	const kebab = base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
	const names = [lower, kebab, lower.replace(/^google/, ''), kebab.replace(/^google-/, '')];
	return [...[...new Set(names)].filter((n) => n).map((service) => ({ service })), {}];
}

export type NodeCoverage =
	| { kind: 'internal' }
	| { kind: 'service'; service: SimService; credentialType?: string; authValue?: string }
	| { kind: 'not-covered'; reason: string };

/** The static host of a node's URL parameter; `undefined` when there is none or it is computed. */
export function staticHost(node: WorkflowNodeResponse): string | undefined | null {
	const params = node.parameters ?? {};
	const raw = typeof params.url === 'string' ? params.url : params.endpoint;
	if (typeof raw !== 'string' || raw.trim() === '') return undefined;
	const url = raw.trim().replace(/^=/, '');
	const match = /^https?:\/\/([^/?#]+)/i.exec(url);
	if (!match) return null;
	if (match[1].includes('{{') || match[1].includes('$')) return null;
	return match[1].replace(/:\d+$/, '').toLowerCase();
}

/** Which simulated service a node needs, the credential to give it, or why it cannot run. */
export function classifyNode(
	node: WorkflowNodeResponse,
	nodeTypes: NodeTypeIndex,
	catalog: SimCatalog,
): NodeCoverage {
	const params = node.parameters ?? {};
	const info = nodeTypes.get(node.type.replace(/Tool$/, '')) ?? nodeTypes.get(node.type);
	const host = staticHost(node);

	if (host === null) return { kind: 'internal' }; // a computed URL: the sealed DNS answers it at run time
	if (host !== undefined && typeof params.url === 'string') {
		const service = catalog.serviceForHost(host);
		if (!service) return { kind: 'not-covered', reason: `no simulated service for ${host}` };
		if (params.authentication === 'predefinedCredentialType') {
			const type = typeof params.nodeCredentialType === 'string' ? params.nodeCredentialType : '';
			if (!catalog.credentialSource(type)) {
				return { kind: 'not-covered', reason: `the simulation issues no ${type} credential` };
			}
			return { kind: 'service', service, credentialType: type };
		}
		if (params.authentication === 'genericCredentialType') {
			return { kind: 'not-covered', reason: `generic credential on a call to ${host}` };
		}
		return { kind: 'service', service };
	}

	const entry = versionInfo(info, node.typeVersion);
	const options = entry?.credentials ?? [];
	const defaults = entry?.defaults ?? {};
	const required = options.filter((o) => requires(o, node, defaults));
	if (required.length === 0) return { kind: 'internal' };
	const chosen = Object.keys(node.credentials ?? {});
	const issuable = (list: NodeCredentialOption[]) =>
		list.filter((o) => catalog.credentialSource(o.type));
	const best = (list: NodeCredentialOption[]) =>
		issuable(list).find((o) => chosen.includes(o.type)) ?? issuable(list)[0];
	// How the user signs in does not change what the workflow does: another
	// authentication method the simulation issues is a fair substitute.
	const byAuthentication = options.filter(
		(o) => o.show.authentication && requires(o, node, defaults, 'authentication'),
	);
	const pick = best(required) ?? best(byAuthentication);
	if (!pick) {
		return {
			kind: 'not-covered',
			reason: `the simulation issues none of ${required.map((o) => o.type).join(', ')} (${node.type})`,
		};
	}
	const source = catalog.credentialSource(pick.type);
	if (!source) return { kind: 'not-covered', reason: `no source for ${pick.type}` };
	const switched = !required.includes(pick);
	const authValue = switched ? pick.show.authentication?.[0] : undefined;
	return {
		kind: 'service',
		service: source.service,
		credentialType: pick.type,
		...(typeof authValue === 'string' ? { authValue } : {}),
	};
}
