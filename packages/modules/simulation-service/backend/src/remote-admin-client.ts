import { OperationalError, UnexpectedError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';

function dig(value: unknown, path: string[]): unknown {
	let current = value;
	for (const key of path) {
		if (!isRecord(current)) return undefined;
		current = current[key];
	}
	return current;
}

/**
 * HTTP admin client for a remote simulation server's `/_sim/v1/tenants` API.
 *
 * Used by consumers such as `mcp-guard` that run against an external simulation server
 * for vendor MCP protocols or remote tenant management.
 */
export class SimulationServiceRemoteAdminClient {
	private readonly baseUrl: string;

	constructor(baseUrl: string) {
		// Admin paths start with a slash. Remove trailing slashes so URLs never double them.
		this.baseUrl = baseUrl.replace(/\/+$/, '');
	}

	private async call(method: string, path: string, body?: unknown): Promise<unknown> {
		const res = await fetch(this.baseUrl + path, {
			method,
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
		}).catch((error: unknown) => {
			// Name the target and cause so callers can tell which gym server is unreachable.
			const cause =
				error instanceof Error && error.cause instanceof Error ? error.cause.message : '';
			throw new OperationalError(`gym ${method} ${this.baseUrl}${path} unreachable: ${cause}`);
		});
		const text = await res.text();
		// Do not include the request body in the error message.
		if (!res.ok) {
			throw new OperationalError(
				`gym ${method} ${path} failed: ${res.status} ${text.slice(0, 700)}`,
			);
		}
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
			// Recreate stale tenants left behind by an earlier server run so state matches local memory.
			if (!(error instanceof Error) || !error.message.includes(' 409 ')) throw error;
			await this.deleteTenant(tenant);
			await create();
		}
	}

	/**
	 * Issues a bearer token for one service on a tenant.
	 * The `field` path uses dots for nested keys under `credential.data`.
	 */
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
		if (typeof token !== 'string') {
			throw new UnexpectedError(`gym credential has no ${field}`);
		}
		return token;
	}

	async seed(tenant: string, overlay: unknown): Promise<unknown> {
		return await this.call('POST', `/_sim/v1/tenants/${tenant}/seed`, overlay);
	}

	/** Posts a remote gym admin event such as `append_blocks`. */
	async event(tenant: string, event: unknown): Promise<void> {
		await this.call('POST', `/_sim/v1/tenants/${tenant}/events`, event);
	}

	async tenantExists(tenant: string): Promise<boolean> {
		const res = await this.call('GET', '/_sim/v1/tenants');
		const tenants = isRecord(res) && Array.isArray(res.tenants) ? res.tenants : [];
		return tenants.some((t) => isRecord(t) && t.tenant === tenant);
	}

	async deleteTenant(tenant: string): Promise<void> {
		await this.call('DELETE', `/_sim/v1/tenants/${tenant}`);
	}
}
