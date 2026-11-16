import { GymAdmin } from './gym-admin';
import { createMcpCaller } from './mcp-upstream';
import { GuardRouter } from './router';
import type { GuardServiceProfile } from './services';

export interface Run {
	tenant: string;
	tokenRef: { value: string }; // Real upstream token. In memory only. Never logged.
	router: GuardRouter;
}

export interface RunConfig {
	profile: GuardServiceProfile;
	admin: GymAdmin;
	// MCP url of the real server and of the gym.
	upstreamMcpUrl: string;
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
		// The gym issues a credential only for a tenant with an account. Seed one placeholder account.
		const { profile } = this.cfg;
		await this.cfg.admin.seed(tenant, profile.placeholderSeed);
		const gymToken = await this.cfg.admin.issueMcpCredential(
			tenant,
			profile.name,
			profile.credentialKind,
			profile.credentialField,
		);
		const tokenRef = { value: token };
		// Read the token at call time, so a refreshed token is used.
		const upstream = lazyCaller(() => createMcpCaller(this.cfg.upstreamMcpUrl, tokenRef.value));
		const router = new GuardRouter({
			upstream,
			// Gym MCP is reached by Host header. Never use the credential url.
			gym: createMcpCaller(this.cfg.gymMcpUrl, gymToken, { Host: profile.host }),
			hydrator: profile.createHydrator({ admin: this.cfg.admin, tenant, upstream }),
			readTools: profile.readTools,
			writeTools: profile.writeTools,
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

function lazyCaller(
	make: () => ReturnType<typeof createMcpCaller>,
): ReturnType<typeof createMcpCaller> {
	return {
		listTools: async () => await make().listTools(),
		callTool: async (n, a) => await make().callTool(n, a),
	};
}
