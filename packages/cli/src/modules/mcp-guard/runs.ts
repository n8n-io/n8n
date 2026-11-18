import { AgentHydrator } from './agent-hydrator';
import type { GymAdmin } from './gym-admin';
import { createHydrationLlm, createPlanLlm, type HydrationModel } from './hydration-llm';
import { PLAN_INSTRUCTIONS } from './hydration-prompts';
import { PlanHydrator } from './plan-hydrator';
import { createMcpCaller, type McpCaller } from './mcp-upstream';
import { GuardRouter, type Hydrator } from './router';
import type { GuardServiceProfile } from './services';

export interface Run {
	tenant: string;
	lastUsed: number;
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

const IDLE_MS = 6 * 60 * 60 * 1000;

export class RunRegistry {
	private readonly runs = new Map<string, Run>();

	// Runs that are being created. A second request for the same run waits for the first.
	private readonly creating = new Map<string, Promise<Run>>();

	constructor(private readonly cfg: RunConfig) {}

	// The tenant is created on the first request of a run. A run is one chat of one agent.
	async getOrCreate(runId: string, token: string, model?: HydrationModel): Promise<Run> {
		const existing = this.runs.get(runId);
		if (existing) {
			// Someone can delete the tenant in the gym. Then build the run again.
			if (await this.cfg.admin.tenantExists(existing.tenant)) {
				existing.tokenRef.value = token;
				existing.lastUsed = Date.now();
				return existing;
			}
			this.runs.delete(runId);
		}
		let creating = this.creating.get(runId);
		if (!creating) {
			creating = this.create(runId, token, model).finally(() => this.creating.delete(runId));
			this.creating.set(runId, creating);
		}
		return await creating;
	}

	private async create(runId: string, token: string, model?: HydrationModel): Promise<Run> {
		await this.deleteIdle();
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
		// Gym MCP is reached by Host header. Never use the credential url.
		const gym = createMcpCaller(this.cfg.gymMcpUrl, gymToken, { Host: profile.host });
		const hydrator = this.createHydrator(profile, tenant, upstream, gym, model);
		const router = new GuardRouter({
			upstream,
			gym,
			hydrator,
			readTools: profile.readTools,
			writeTools: profile.writeTools,
			upstreamArgs: profile.upstreamReadArgs,
		});
		const run: Run = { tenant, lastUsed: Date.now(), tokenRef, router };
		this.runs.set(runId, run);
		return run;
	}

	// MCP_GUARD_HYDRATION picks the hydrator: plan (default), agent or deterministic. The plan and agent
	// hydrators need the model of the agent under test. Without it the parser hydrators run.
	private createHydrator(
		profile: GuardServiceProfile,
		tenant: string,
		upstream: McpCaller,
		gym: McpCaller,
		model?: HydrationModel,
	): Hydrator {
		const { admin } = this.cfg;
		const mode = process.env.MCP_GUARD_HYDRATION ?? 'plan';
		if (model && mode === 'agent') {
			return new AgentHydrator({
				admin,
				tenant,
				upstream,
				gym,
				readTools: profile.readTools,
				serviceInstructions: profile.instructions,
				llm: createHydrationLlm(model),
			});
		}
		if (model && mode !== 'deterministic') {
			return new PlanHydrator({
				admin,
				tenant,
				upstream,
				gym,
				readTools: profile.readTools,
				instructions: `${PLAN_INSTRUCTIONS}\n${profile.instructions}`,
				llm: createPlanLlm(model),
				lookups: profile.lookups,
				finalize: profile.finalize,
				gymFirst: profile.gymFirst,
				listTools: profile.listTools,
				keepParents: profile.keepParents,
			});
		}
		return profile.createHydrator({ admin, tenant, upstream });
	}

	// A chat that nobody has used for a while is over. Remove its tenant, so the gym does not fill up.
	private async deleteIdle(): Promise<void> {
		const cutoff = Date.now() - IDLE_MS;
		for (const [runId, run] of this.runs) {
			if (run.lastUsed < cutoff) await this.delete(runId).catch(() => undefined);
		}
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
