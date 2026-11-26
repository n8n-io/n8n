import { OperationalError } from '@n8n/errors';

import { AgentHydrator } from './agent-hydrator';
import type { GymAdmin } from './gym-admin';
import { createHydrationLlm, createPlanLlm, type HydrationModel } from './hydration-llm';
import { PLAN_INSTRUCTIONS } from './hydration-prompts';
import { PlanHydrator } from './plan-hydrator';
import { createMcpCaller, type McpCaller } from './mcp-upstream';
import { GuardRouter, type Hydrator } from './router';
import { guardMode, type GuardServiceProfile } from './services';

export interface Run {
	tenant: string;
	lastUsed: number;
	verifiedAt: number; // When the gym last confirmed that the tenant exists.
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

// `tenantExists` lists every tenant of the gym. Check a run at most once in this time.
const VERIFY_MS = 30 * 1000;

export class RunRegistry {
	private readonly runs = new Map<string, Run>();

	// Runs that are being created. A second request for the same run waits for the first.
	private readonly creating = new Map<string, Promise<Run>>();

	constructor(private readonly cfg: RunConfig) {}

	// The tenant is created on the first request of a run. A run is one chat of one agent.
	async getOrCreate(runId: string, token: string, model?: HydrationModel): Promise<Run> {
		const existing = this.runs.get(runId);
		if (existing) {
			// Mark the run as used before the check, so the idle cleanup does not delete it meanwhile.
			const now = Date.now();
			existing.lastUsed = now;
			// Someone can delete the tenant in the gym. Then build the run again.
			const recentlyVerified = now - existing.verifiedAt < VERIFY_MS;
			// Only a real check moves `verifiedAt`. A cache hit must not extend the window.
			const exists = recentlyVerified || (await this.cfg.admin.tenantExists(existing.tenant));
			if (exists) {
				if (!recentlyVerified) existing.verifiedAt = Math.max(existing.verifiedAt, now);
				existing.tokenRef.value = token;
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
		// The gym is filled by a model. Without one the gym would answer with nothing.
		if (!model)
			throw new OperationalError('mcp-guard needs the model of the agent to fill the gym');
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
		const now = Date.now();
		const run: Run = { tenant, lastUsed: now, verifiedAt: now, tokenRef, router };
		this.runs.set(runId, run);
		return run;
	}

	// MCP_GUARD_HYDRATION picks the hydrator: plan or agent. Both use the model of the agent under test.
	private createHydrator(
		profile: GuardServiceProfile,
		tenant: string,
		upstream: McpCaller,
		gym: McpCaller,
		model: HydrationModel,
	): Hydrator {
		const { admin } = this.cfg;
		if (guardMode() === 'agent') {
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
			keepParents: profile.keepParents,
		});
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
