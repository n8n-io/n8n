/**
 * A client of the gym's sim-admin API (`/_sim/v1/…`, `/_gym/v1/…`) with the
 * harness token: tenants, worlds, credentials, snapshots and state.
 * See `ai-gym/docs/services/00_common.md` section 5 and `00_seeding.md`.
 */
import type { JsonRecord } from './sample.ts';
import { isRecord } from './sample.ts';

export class GymError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'GymError';
		this.status = status;
	}
}

export interface CredentialInfo {
	id: string;
	n8nType?: string;
	isDefault: boolean;
}

export class GymAdmin {
	private readonly describeCache = new Map<string, Promise<JsonRecord>>();

	readonly adminUrl: string;

	private readonly token: string;

	constructor(adminUrl: string, token: string) {
		this.adminUrl = adminUrl;
		this.token = token;
	}

	private async request(method: string, path: string, body?: unknown): Promise<unknown> {
		const res = await fetch(`${this.adminUrl}${path}`, {
			method,
			headers: {
				authorization: `Bearer ${this.token}`,
				...(body === undefined ? {} : { 'content-type': 'application/json' }),
			},
			body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
		});
		const text = await res.text();
		if (!res.ok)
			throw new GymError(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`, res.status);
		if (text === '') return undefined;
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	}

	async op(name: string, input: JsonRecord = {}): Promise<JsonRecord> {
		const out = await this.request('POST', `/_gym/v1/ops/${name}`, input);
		return isRecord(out) ? out : {};
	}

	/** The vendor host patterns of every linked service. */
	async hosts(): Promise<string[]> {
		const out = await this.op('list_services');
		const hosts = new Set<string>();
		for (const s of Array.isArray(out.services) ? out.services : []) {
			if (!isRecord(s) || !Array.isArray(s.hosts)) continue;
			for (const h of s.hosts) if (typeof h === 'string') hosts.add(h);
		}
		return [...hosts];
	}

	async describe(service: string): Promise<JsonRecord> {
		let hit = this.describeCache.get(service);
		if (!hit) {
			hit = this.op('describe_service', { service });
			this.describeCache.set(service, hit);
		}
		return await hit;
	}

	async credentialInfo(service: string): Promise<CredentialInfo[]> {
		const d = await this.describe(service);
		const list = Array.isArray(d.credential_info) ? d.credential_info : [];
		return list.filter(isRecord).map((c) => ({
			id: String(c.id),
			n8nType: typeof c.n8n_type === 'string' ? c.n8n_type : undefined,
			isDefault: c.default === true,
		}));
	}

	/** The example world of a service (`services/<slug>/examples/world.json`). */
	async example(service: string): Promise<JsonRecord | undefined> {
		try {
			const out = await this.request('GET', `/_gym/v1/examples/${encodeURIComponent(service)}`);
			if (isRecord(out) && isRecord(out.world)) return out.world;
			return isRecord(out) ? out : undefined;
		} catch (e) {
			if (e instanceof GymError && e.status === 404) return undefined;
			throw e;
		}
	}

	async putTenant(tenant: string, body: JsonRecord): Promise<JsonRecord> {
		const out = await this.request('PUT', `/_sim/v1/tenants/${encodeURIComponent(tenant)}`, body);
		return isRecord(out) ? out : {};
	}

	async seed(tenant: string, world: JsonRecord): Promise<JsonRecord> {
		const out = await this.request(
			'POST',
			`/_sim/v1/tenants/${encodeURIComponent(tenant)}/seed`,
			world,
		);
		return isRecord(out) ? out : {};
	}

	async getTenant(tenant: string): Promise<JsonRecord> {
		const out = await this.request('GET', `/_sim/v1/tenants/${encodeURIComponent(tenant)}`);
		return isRecord(out) ? out : {};
	}

	async deleteTenant(tenant: string): Promise<void> {
		try {
			await this.request('DELETE', `/_sim/v1/tenants/${encodeURIComponent(tenant)}`);
		} catch (e) {
			if (!(e instanceof GymError && e.status === 404)) throw e;
		}
	}

	async issue(tenant: string, service: string, credential: string): Promise<JsonRecord> {
		const out = await this.request(
			'POST',
			`/_sim/v1/tenants/${encodeURIComponent(tenant)}/credentials`,
			{
				service,
				credential,
			},
		);
		return isRecord(out) ? out : {};
	}

	async state(tenant: string): Promise<JsonRecord> {
		const out = await this.request('GET', `/_sim/v1/tenants/${encodeURIComponent(tenant)}/state`);
		return isRecord(out) ? out : {};
	}

	async snapshot(tenant: string): Promise<string> {
		const res = await fetch(
			`${this.adminUrl}/_gym/v1/tenants/${encodeURIComponent(tenant)}/snapshot`,
			{
				headers: { authorization: `Bearer ${this.token}` },
			},
		);
		const text = await res.text();
		if (!res.ok)
			throw new GymError(`snapshot ${tenant}: ${res.status} ${text.slice(0, 300)}`, res.status);
		return text;
	}

	async restore(tenant: string, snapshot: string): Promise<void> {
		await this.request('PUT', `/_gym/v1/tenants/${encodeURIComponent(tenant)}/snapshot`, snapshot);
	}
}
