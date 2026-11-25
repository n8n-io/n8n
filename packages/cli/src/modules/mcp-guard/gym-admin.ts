import { OperationalError, UnexpectedError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';

export class GymAdmin {
	private readonly baseUrl: string;

	constructor(baseUrl: string) {
		// Admin paths start with a slash. A trailing slash in the setting would double it.
		this.baseUrl = baseUrl.replace(/\/+$/, '');
	}

	private async call(method: string, path: string, body?: unknown): Promise<unknown> {
		const res = await fetch(this.baseUrl + path, {
			method,
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
		}).catch((error: unknown) => {
			// Name the target and the cause. A bare "fetch failed" does not say which gym is down.
			const cause =
				error instanceof Error && error.cause instanceof Error ? error.cause.message : '';
			throw new OperationalError(`gym ${method} ${this.baseUrl}${path} unreachable: ${cause}`);
		});
		const text = await res.text();
		// Do not put the request body in the error.
		if (!res.ok)
			throw new OperationalError(
				`gym ${method} ${path} failed: ${res.status} ${text.slice(0, 700)}`,
			);
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	}

	async createTenant(tenant: string): Promise<void> {
		const create = async () => {
			const adminToken = `guard-${tenant}-${Math.random().toString(36).slice(2)}-admin`;
			await this.call('PUT', `/_sim/v1/tenants/${tenant}`, { admin_token: adminToken });
		};
		try {
			await create();
		} catch (error) {
			// The tenant exists from an earlier server run. The guard's memory of it is gone.
			// Start it again, so the gym data matches the guard's seeded set.
			if (!(error instanceof Error) || !error.message.includes(' 409 ')) throw error;
			// Not `deleteTenant`: a subclass counts holders there, and this caller still needs the tenant.
			await this.call('DELETE', `/_sim/v1/tenants/${tenant}`);
			await create();
		}
	}

	// Issues a bearer for the gym MCP of one service. The field names where the bearer sits. A dot separates nested keys.
	async issueMcpCredential(
		tenant: string,
		service: string,
		kind: string,
		field: string,
	): Promise<string> {
		const res = await this.call('POST', `/_sim/v1/tenants/${tenant}/credentials`, {
			credential: kind,
			service,
		});
		const token = dig(res, ['credential', 'data', ...field.split('.')]);
		if (typeof token !== 'string') throw new UnexpectedError(`gym credential has no ${field}`);
		return token;
	}

	async seed(tenant: string, overlay: unknown): Promise<unknown> {
		return await this.call('POST', `/_sim/v1/tenants/${tenant}/seed`, overlay);
	}

	// An admin event of the gym, such as `append_blocks`.
	async event(tenant: string, event: unknown): Promise<void> {
		await this.call('POST', `/_sim/v1/tenants/${tenant}/events`, event);
	}

	async tenantExists(tenant: string): Promise<boolean> {
		const res = await this.call('GET', '/_sim/v1/tenants');
		const tenants = isRecord(res) && Array.isArray(res.tenants) ? res.tenants : [];
		return tenants.some((t) => isRecord(t) && t.tenant === tenant);
	}

	/** Drops what the guard remembers of a tenant that the gym lost. The gym keeps nothing here. */
	forgetTenant(_tenant: string): void {}

	async deleteTenant(tenant: string): Promise<void> {
		await this.call('DELETE', `/_sim/v1/tenants/${tenant}`);
	}
}

function dig(v: unknown, path: string[]): unknown {
	let cur = v;
	for (const k of path) {
		if (!isRecord(cur)) return undefined;
		cur = cur[k];
	}
	return cur;
}
