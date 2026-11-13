import { GymAdmin } from './gym-admin';
import { LinearHydrator } from './hydrator';
import { createMcpCaller } from './mcp-upstream';
import { GuardRouter } from './router';

export interface Run {
	tenant: string;
	tokenRef: { value: string }; // Real Linear token. In memory only. Never logged.
	router: GuardRouter;
}

export interface RunConfig {
	admin: GymAdmin;
	linearMcpUrl: string;
	gymMcpUrl: string;
}

export class RunRegistry {
	private readonly runs = new Map<string, Run>();

	constructor(private readonly cfg: RunConfig) {}

	// The tenant is created on the first request of a run.
	async getOrCreate(runId: string, token: string): Promise<Run> {
		const existing = this.runs.get(runId);
		if (existing) {
			// Someone can delete the tenant in the gym. Then build the run again.
			if (await this.cfg.admin.tenantExists(existing.tenant)) {
				existing.tokenRef.value = token;
				return existing;
			}
			this.runs.delete(runId);
		}
		const tenant = `guard-${runId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
		await this.cfg.admin.createTenant(tenant);
		// The gym issues a credential only for a tenant with an account. Seed one placeholder user.
		await this.cfg.admin.seed(tenant, {
			world_version: 1,
			native: { linear: { users: [{
				id: '00000000-0000-4000-8000-000000000001', ref: 'user:guard',
				email: 'guard@unknown.invalid', name: 'Guard',
			}] } },
		});
		const gymToken = await this.cfg.admin.issueMcpCredential(tenant);
		const tokenRef = { value: token };
		// Read the token at call time, so a refreshed token is used.
		const upstream = lazyCaller(() => createMcpCaller(this.cfg.linearMcpUrl, tokenRef.value));
		const router = new GuardRouter({
			upstream,
			// Gym MCP is reached by Host header. Never use the credential url.
			gym: createMcpCaller(this.cfg.gymMcpUrl, gymToken, { Host: 'mcp.linear.app' }),
			hydrator: new LinearHydrator({
				admin: this.cfg.admin, tenant, upstream,
			}),
		});
		const run: Run = { tenant, tokenRef, router };
		this.runs.set(runId, run);
		return run;
	}

	async delete(runId: string): Promise<boolean> {
		const run = this.runs.get(runId);
		if (!run) return false;
		this.runs.delete(runId);
		await this.cfg.admin.deleteTenant(run.tenant);
		return true;
	}
}

function lazyCaller(make: () => ReturnType<typeof createMcpCaller>): ReturnType<typeof createMcpCaller> {
	return {
		listTools: async () => await make().listTools(),
		callTool: async (n, a) => await make().callTool(n, a),
	};
}
