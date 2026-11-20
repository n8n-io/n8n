import type { GymAdmin } from './gym-admin';
import { HttpGuardRouter } from './http-router';
import type { HttpVendorProfile } from './http-profiles';
import { createGymSender, createHttpToolCaller, isReadToolName } from './http-tool-caller';
import { createPlanLlm, type HydrationModel } from './hydration-llm';
import { PLAN_INSTRUCTIONS } from './hydration-prompts';
import { sendToNetwork } from './network';
import { PlanHydrator } from './plan-hydrator';
import { isReadShaped } from './request-classifier';
import { matchesVendor, type VendorKnowledge } from './vendor-knowledge';

export interface HttpRun {
	tenant: string;
	lastUsed: number;
	router: HttpGuardRouter;
}

export interface HttpRunConfig {
	profile: HttpVendorProfile;
	vendor: VendorKnowledge;
	admin: GymAdmin;
	// Address of the gym that serves the vendor over HTTP.
	gymUrl: string;
}

const IDLE_MS = 6 * 60 * 60 * 1000;

/** One gym tenant for each chat of an agent, for one HTTP vendor. */
export class HttpRunRegistry {
	private readonly runs = new Map<string, HttpRun>();

	// Runs that are being created. A second request for the same run waits for the first.
	private readonly creating = new Map<string, Promise<HttpRun>>();

	constructor(private readonly cfg: HttpRunConfig) {}

	async getOrCreate(runId: string, model: HydrationModel): Promise<HttpRun> {
		const existing = this.runs.get(runId);
		if (existing) {
			// Mark the run as used before the check, so the idle cleanup does not delete it meanwhile.
			existing.lastUsed = Date.now();
			// Someone can delete the tenant in the gym. Then build the run again.
			if (await this.cfg.admin.tenantExists(existing.tenant)) return existing;
			this.runs.delete(runId);
		}
		let creating = this.creating.get(runId);
		if (!creating) {
			creating = this.create(runId, model).finally(() => this.creating.delete(runId));
			this.creating.set(runId, creating);
		}
		return await creating;
	}

	private async create(runId: string, model: HydrationModel): Promise<HttpRun> {
		const { admin, profile, vendor, gymUrl } = this.cfg;
		await this.deleteIdle();
		const tenant = `guard-${runId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
		await admin.createTenant(tenant);
		// The gym issues a credential only for a tenant with an account. Seed one placeholder account.
		await admin.seed(tenant, profile.placeholderSeed);
		const token = await admin.issueMcpCredential(
			tenant,
			profile.name,
			profile.credentialKind,
			profile.credentialField,
		);

		const context: { authorization?: string; origin: string } = { origin: '' };
		// The real reads use the credential of the node, read at call time so a refreshed token is used.
		const upstream = createHttpToolCaller({
			origin: () => context.origin,
			send: sendToNetwork,
			headers: () => ({
				accept: 'application/json',
				...(context.authorization && { authorization: context.authorization }),
			}),
			enrich: profile.enrich,
			// The model writes the args of a real read. Code checks the request they make: it must use
			// HTTPS, be read-shaped, be on the host of the node, and be inside the vendor.
			allow: (req) =>
				req.url.protocol === 'https:' &&
				isReadShaped(req, vendor.readPaths) &&
				matchesVendor(vendor, req.url.hostname, req.url.pathname),
		});
		const gym = createHttpToolCaller({
			origin: () => context.origin,
			send: createGymSender({ gymUrl, bearer: () => token }),
			headers: () => ({ accept: 'application/json' }),
		});
		const hydrator = new PlanHydrator({
			admin,
			tenant,
			upstream,
			gym,
			readTools: isReadToolName,
			instructions: `${PLAN_INSTRUCTIONS}\n${vendor.instructions}`,
			llm: createPlanLlm(model),
			lookups: profile.lookups,
			finalize: profile.finalize,
		});
		const router = new HttpGuardRouter({
			upstream,
			gym,
			hydrator,
			profile,
			context,
		});
		const run: HttpRun = { tenant, lastUsed: Date.now(), router };
		this.runs.set(runId, run);
		return run;
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
		// Forget the run only after the gym deleted the tenant, so a failed delete is tried again.
		await this.cfg.admin.deleteTenant(run.tenant);
		this.runs.delete(runId);
		return true;
	}
}
