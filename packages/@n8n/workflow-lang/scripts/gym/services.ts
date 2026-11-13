/**
 * Reads the contracts of the gym services (`sim-service.json` of each vendor
 * in `ai-gym/services/gym/vendors/<slug>/`). A `needed_by` entry such as
 * `n8n:slack@2.7 message.post` says that the n8n Slack node calls the item
 * for the operation `message.post`. An entry `n8n:slackApi` on a credential
 * names the n8n credential type.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { isRecord, repoRoot } from './sample.ts';

export const gymSource = process.env.GYM_SRC ?? join(repoRoot, '..', 'ai-gym');

/** What the gym says about one n8n node type. */
export interface NodeCoverage {
	/** The services whose contracts name the node. */
	services: Set<string>;
	/** Operations (`resource.operation` or `operation`, lower case) with status implemented or partial. */
	ops: Set<string>;
	/** Operations that the contract lists as planned or out of scope. */
	missingOps: Set<string>;
	/** True when an entry names the node without an operation (the whole node). */
	whole: boolean;
}

export interface GymContracts {
	/** Node short name (`slack`, `lmChatOpenAi`) to coverage. */
	nodes: Map<string, NodeCoverage>;
	/** n8n credential type to the services that issue it. */
	credentialTypes: Map<string, Set<string>>;
	/** Service slug to its vendor host patterns. */
	hosts: Map<string, string[]>;
}

const GOOD = new Set(['implemented', 'partial']);

function visit(
	value: unknown,
	status: string,
	slug: string,
	inCredentials: boolean,
	out: GymContracts,
): void {
	if (Array.isArray(value)) {
		for (const v of value) visit(v, status, slug, inCredentials, out);
		return;
	}
	if (!isRecord(value)) return;
	const own = typeof value.status === 'string' ? value.status : status;
	const neededBy = Array.isArray(value.needed_by) ? value.needed_by : [];
	for (const entry of neededBy) {
		if (typeof entry !== 'string') continue;
		const m = /^n8n:([A-Za-z][\w-]*)(?:@[\d.]+)?(?:\s+(.*))?$/.exec(entry.trim());
		if (!m) continue;
		const name = m[1];
		const rest = (m[2] ?? '').trim();
		if (inCredentials || /Api$|OAuth2$|OAuth2Api$/.test(name)) {
			if (GOOD.has(own)) {
				const set = out.credentialTypes.get(name) ?? new Set<string>();
				set.add(slug);
				out.credentialTypes.set(name, set);
			}
			if (inCredentials) continue;
		}
		const cov = out.nodes.get(name) ?? {
			services: new Set<string>(),
			ops: new Set<string>(),
			missingOps: new Set<string>(),
			whole: false,
		};
		cov.services.add(slug);
		const op = /^([A-Za-z][\w]*(?:\.[A-Za-z][\w]*)?)\b/.exec(rest)?.[1]?.toLowerCase();
		if (!op || !/\./.test(op)) {
			if (GOOD.has(own) && rest === '') cov.whole = true;
			if (GOOD.has(own) && op) cov.ops.add(op);
		} else if (GOOD.has(own)) {
			cov.ops.add(op);
		} else {
			cov.missingOps.add(op);
		}
		out.nodes.set(name, cov);
	}
	for (const [k, v] of Object.entries(value)) {
		if (k === 'needed_by') continue;
		visit(v, own, slug, inCredentials || k === 'credentials', out);
	}
}

export function loadContracts(source = gymSource): GymContracts {
	const out: GymContracts = { nodes: new Map(), credentialTypes: new Map(), hosts: new Map() };
	// `services/<name>/sim-service.json` links to the contract in the gym module.
	const dir = join(source, 'services');
	if (!existsSync(join(dir, 'gym'))) throw new Error(`No gym services in ${dir}. Set GYM_SRC.`);
	for (const slug of readdirSync(dir).sort()) {
		const file = join(dir, slug, 'sim-service.json');
		if (!existsSync(file)) continue;
		const doc: unknown = JSON.parse(readFileSync(file, 'utf8'));
		if (!isRecord(doc)) continue;
		const service = typeof doc.service === 'string' ? doc.service : slug;
		const hosts = new Set<string>();
		const interfaces = isRecord(doc.interfaces) ? doc.interfaces : {};
		for (const list of Object.values(interfaces)) {
			if (!Array.isArray(list)) continue;
			for (const i of list) {
				if (!isRecord(i) || !Array.isArray(i.hosts)) continue;
				for (const h of i.hosts) if (typeof h === 'string') hosts.add(h.toLowerCase());
			}
		}
		out.hosts.set(service, [...hosts]);
		visit(doc, 'implemented', service, false, out);
	}
	return out;
}

/** `contract.MatchHost`: exact, `*.<rest>` with one first label, or `*-<tail>.<rest>`. */
export function hostMatches(pattern: string, hostIn: string): boolean {
	const host = hostIn.toLowerCase().replace(/\.$/, '');
	const p = pattern.toLowerCase();
	if (!p.startsWith('*')) return host === p;
	const dot = host.indexOf('.');
	if (dot <= 0) return false;
	if (p.startsWith('*.')) return host.slice(dot + 1) === p.slice(2);
	const rest = p.slice(1);
	const tailDot = rest.indexOf('.');
	const label = host.slice(0, dot);
	const tail = rest.slice(0, tailDot);
	return (
		tailDot > 0 &&
		host.slice(dot) === rest.slice(tailDot) &&
		label.endsWith(tail) &&
		label.length > tail.length
	);
}

/** The service that serves a host name, or undefined. */
export function serviceForHost(contracts: GymContracts, host: string): string | undefined {
	for (const [slug, patterns] of contracts.hosts) {
		if (patterns.some((p) => hostMatches(p, host))) return slug;
	}
	return undefined;
}
