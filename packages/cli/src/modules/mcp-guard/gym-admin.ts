export class GymAdmin {
	constructor(private readonly baseUrl: string) {}

	private async call(method: string, path: string, body?: unknown): Promise<unknown> {
		const res = await fetch(this.baseUrl + path, {
			method,
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const text = await res.text();
		// Do not put the request body in the error.
		if (!res.ok) throw new Error(`gym ${method} ${path} failed: ${res.status} ${text.slice(0, 200)}`);
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
			await this.deleteTenant(tenant);
			await create();
		}
	}

	async issueMcpCredential(tenant: string): Promise<string> {
		const res = await this.call('POST', `/_sim/v1/tenants/${tenant}/credentials`, {
			credential: 'mcp_oauth',
			service: 'linear',
		});
		const token = dig(res, ['credential', 'data', 'access_token']);
		if (typeof token !== 'string') throw new Error('gym credential has no access_token');
		return token;
	}

	async seed(tenant: string, overlay: unknown): Promise<void> {
		await this.call('POST', `/_sim/v1/tenants/${tenant}/seed`, overlay);
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

export function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function dig(v: unknown, path: string[]): unknown {
	let cur = v;
	for (const k of path) {
		if (!isRecord(cur)) return undefined;
		cur = cur[k];
	}
	return cur;
}
