// ---------------------------------------------------------------------------
// Client for a simulated-services server (the sim-admin API).
//
// The server fakes vendor APIs (Slack, Gmail, Notion, ...) behind their real
// hostnames: an n8n instance whose DNS points at it talks to the fakes as if
// they were the real services. Everything the harness needs to know about the
// fakes (hosts, credential types, world schemas, example worlds) is read from
// the server at run time, so the harness keeps no list of services.
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';

export interface SimCredentialInfo {
	id: string;
	/** n8n credential type the credential renders to, when the service declares it. */
	n8nType?: string;
	isDefault: boolean;
	/** Who the credential signs in as, from the manifest. */
	doc?: string;
}

export interface SimService {
	slug: string;
	hosts: string[];
	/** Vendor-neutral world entity kinds the service accepts. */
	kinds: string[];
	kindSchemas: unknown[];
	/** JSON schema of the service's `native` world block, when it has one. */
	native?: unknown;
	credentialInfo: SimCredentialInfo[];
	/** Example world document, when the server ships one. */
	example?: unknown;
	/** Simulated-user actions the service accepts on a live tenant (a delivered message, appended rows). */
	events?: SimServiceEvent[];
	/** Admin path prefix of the service's tenants: the core's `/_sim/v1`, or a legacy fake's own. */
	adminPrefix: string;
}

export interface SimServiceEvent {
	name: string;
	doc?: string;
	schema?: unknown;
}

/** A simulated-user action, as the world writer writes it. */
export interface SimArrival {
	service: string;
	type: string;
	params: Record<string, unknown>;
}

export interface SimCredential {
	/** n8n credential type, e.g. `slackApi`. */
	type: string;
	data: Record<string, unknown>;
}

/** One entry of a tenant's event log: the requests n8n sent and what the service did. */
export interface SimEvent {
	seq?: number;
	ts?: string;
	kind?: string;
	type?: string;
	outcome?: string;
	service?: string;
	request?: {
		method?: string;
		path?: string;
		status?: number;
		op?: string;
		listed?: boolean;
		/** Why a call failed (status 400 or more), in the vendor's words. */
		error?: string;
	};
}

export class SimAdminError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly responseBody: unknown,
	) {
		super(message);
	}
}

// Event logs are read field by field (`kind`, `request.status`), so any object is accepted.
const isSimEvent = (value: unknown): value is SimEvent => isRecord(value);

const strings = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

export class SimAdminClient {
	constructor(
		private readonly baseUrl: string,
		private readonly harnessToken: string,
	) {}

	private async request(
		method: string,
		path: string,
		body?: unknown,
		token = this.harnessToken,
	): Promise<{ status: number; body: unknown }> {
		const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
			method,
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json',
				accept: 'application/json',
			},
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(60_000),
		});
		const text = await response.text();
		let parsed: unknown = text;
		try {
			parsed = text ? JSON.parse(text) : undefined;
		} catch {
			// Not JSON: keep the text for the error message.
		}
		return { status: response.status, body: parsed };
	}

	private async ok(method: string, path: string, body?: unknown, token?: string): Promise<unknown> {
		const result = await this.request(method, path, body, token);
		if (result.status >= 300) {
			const detail = JSON.stringify(result.body ?? '').slice(0, 600);
			throw new SimAdminError(
				`${method} ${path}: HTTP ${result.status} ${detail}`,
				result.status,
				result.body,
			);
		}
		return result.body;
	}

	/** Every service the server fakes right now, read from its own discovery API. */
	async discover(): Promise<SimService[]> {
		const resources = await this.ok('GET', '/_gym/v1/resources');
		const uris =
			isRecord(resources) && Array.isArray(resources.resources) ? resources.resources : [];
		const slugs = new Set<string>();
		for (const resource of uris) {
			const uri = isRecord(resource) && typeof resource.uri === 'string' ? resource.uri : '';
			const match = /^gym:\/\/services\/([^/]+)\/manifest$/.exec(uri);
			if (match) slugs.add(match[1]);
		}
		return await Promise.all([...slugs].sort().map(async (slug) => await this.describe(slug)));
	}

	private async describe(slug: string): Promise<SimService> {
		const manifest = await this.ok('GET', `/_gym/v1/services/${encodeURIComponent(slug)}/manifest`);
		const m = isRecord(manifest) ? manifest : {};
		const example = await this.request('GET', `/_gym/v1/examples/${encodeURIComponent(slug)}`);
		// A fake not yet moved onto the server's core keeps its own admin API.
		const legacy = await this.request(
			'GET',
			`/_legacy/${encodeURIComponent(slug)}/_sim/v1/healthz`,
		);
		return {
			slug,
			hosts: strings(m.hosts).map((h) => h.toLowerCase()),
			kinds: strings(m.kinds),
			kindSchemas: Array.isArray(m.kind_schemas) ? m.kind_schemas : [],
			native: m.native ?? undefined,
			credentialInfo: (Array.isArray(m.credential_info) ? m.credential_info : [])
				.filter(isRecord)
				.map((c) => ({
					id: String(c.id),
					n8nType: typeof c.n8n_type === 'string' && c.n8n_type ? c.n8n_type : undefined,
					isDefault: c.default === true,
					...(typeof c.doc === 'string' ? { doc: c.doc } : {}),
				})),
			example: example.status === 200 ? example.body : (m.example ?? undefined),
			events: (Array.isArray(m.event_schemas) ? m.event_schemas : [])
				.filter(isRecord)
				.filter((e) => typeof e.name === 'string')
				.map((e) => ({
					name: String(e.name),
					...(typeof e.doc === 'string' ? { doc: e.doc } : {}),
					schema: e.schema,
				})),
			adminPrefix:
				legacy.status === 200 ? `/_legacy/${encodeURIComponent(slug)}/_sim/v1` : '/_sim/v1',
		};
	}

	private tenantPath(service: SimService, tenant: string): string {
		return `${service.adminPrefix}/tenants/${encodeURIComponent(tenant)}`;
	}

	/** Creates the tenant from a world document and returns its ref map (world ref -> native id). */
	async createTenant(
		service: SimService,
		tenant: string,
		adminToken: string,
		world: unknown,
	): Promise<{ refs: Record<string, string>; view: Record<string, unknown> }> {
		const view = await this.ok('PUT', this.tenantPath(service, tenant), {
			admin_token: adminToken,
			world,
		});
		const v = isRecord(view) ? view : {};
		const refs: Record<string, string> = {};
		if (isRecord(v.refs)) {
			for (const [ref, id] of Object.entries(v.refs)) refs[ref] = String(id);
		}
		return { refs, view: v };
	}

	async issueCredential(
		service: SimService,
		tenant: string,
		adminToken: string,
		request: Record<string, unknown>,
	): Promise<SimCredential> {
		const body = await this.ok(
			'POST',
			`${this.tenantPath(service, tenant)}/credentials`,
			request,
			adminToken,
		);
		const credential = isRecord(body) && isRecord(body.credential) ? body.credential : undefined;
		if (!credential || typeof credential.type !== 'string' || !isRecord(credential.data)) {
			throw new SimAdminError(
				`${service.slug}: credential response has no type or data`,
				200,
				body,
			);
		}
		return { type: credential.type, data: credential.data };
	}

	/** Server settings such as `force_429` and `force_status` (a harness-token route). */
	async patchSettings(
		service: SimService,
		tenant: string,
		settings: Record<string, unknown>,
	): Promise<void> {
		await this.ok('PATCH', `${this.tenantPath(service, tenant)}/settings`, settings);
	}

	async revokeTokens(service: SimService, tenant: string, adminToken: string): Promise<void> {
		await this.ok('POST', `${this.tenantPath(service, tenant)}/tokens:revoke`, {}, adminToken);
	}

	async state(service: SimService, tenant: string, adminToken: string): Promise<unknown> {
		return await this.ok('GET', `${this.tenantPath(service, tenant)}/state`, undefined, adminToken);
	}

	async events(service: SimService, tenant: string, adminToken: string): Promise<SimEvent[]> {
		const body = await this.ok(
			'GET',
			`${this.tenantPath(service, tenant)}/monitor?limit=10000`,
			undefined,
			adminToken,
		);
		// The monitor answers with a plain array of events.
		return (Array.isArray(body) ? body : []).filter(isSimEvent);
	}

	/** Applies simulated-user actions to a live tenant, in order; the server stops at the first error. */
	async applyEvents(
		service: SimService,
		tenant: string,
		adminToken: string,
		events: Array<Omit<SimArrival, 'service'>>,
	): Promise<void> {
		await this.ok(
			'POST',
			`${this.tenantPath(service, tenant)}/events`,
			events.map((event) => ({ service: service.slug, ...event })),
			adminToken,
		);
	}

	async deleteTenant(service: SimService, tenant: string): Promise<void> {
		const result = await this.request('DELETE', this.tenantPath(service, tenant));
		if (result.status >= 300 && result.status !== 404) {
			throw new SimAdminError(
				`DELETE tenant ${tenant}: HTTP ${result.status}`,
				result.status,
				result.body,
			);
		}
	}
}
