import { GymAdmin } from './gym-admin';
import { SeededEntities } from './seeded-entities';

/** What the vendors of a chat know about the tenant: the ids that the gym made, and what a plan seeded. */
export interface TenantState {
	gymIds: Set<string>;
	seeded: SeededEntities;
}

/**
 * A gym admin for the HTTP vendors of one chat, which share one tenant. The gym keeps one world for all
 * services, so a sheet that the Sheets vendor made is a file for the Drive vendor too.
 * Each vendor asks for the tenant and gives it back. The tenant is made once and deleted with the last vendor.
 */
export class SharedTenantAdmin extends GymAdmin {
	private readonly holders = new Map<string, number>();

	private readonly creating = new Map<string, Promise<void>>();

	private readonly states = new Map<string, TenantState>();

	/** One state for the tenant, so a vendor knows an object that another vendor made. */
	stateFor(tenant: string): TenantState {
		let state = this.states.get(tenant);
		if (!state) {
			state = { gymIds: new Set(), seeded: new SeededEntities() };
			this.states.set(tenant, state);
		}
		return state;
	}

	override async createTenant(tenant: string): Promise<void> {
		this.holders.set(tenant, (this.holders.get(tenant) ?? 0) + 1);
		const pending = this.creating.get(tenant);
		try {
			if (pending) {
				await pending;
				// The gym can lose the tenant after it was made. Then make it again.
				if (await this.tenantExists(tenant)) return;
				this.forgetTenant(tenant);
				this.holders.set(tenant, 1);
			}
			const creation = super.createTenant(tenant);
			this.creating.set(tenant, creation);
			await creation;
		} catch (error) {
			this.creating.delete(tenant);
			this.release(tenant);
			throw error;
		}
	}

	/** The gym lost the tenant: drop the lease, the creation and what the vendors know of it. */
	override forgetTenant(tenant: string): void {
		this.holders.delete(tenant);
		this.creating.delete(tenant);
		const state = this.states.get(tenant);
		// The runs of the vendors hold this state, so empty it and keep the object.
		state?.gymIds.clear();
		state?.seeded.clear();
	}

	override async deleteTenant(tenant: string): Promise<void> {
		if (this.release(tenant) > 0) return;
		this.creating.delete(tenant);
		try {
			await super.deleteTenant(tenant);
			this.states.delete(tenant);
		} catch (error) {
			this.holders.set(tenant, 1);
			throw error;
		}
	}

	// Takes one holder away.
	private release(tenant: string): number {
		const left = Math.max(0, (this.holders.get(tenant) ?? 0) - 1);
		if (left === 0) this.holders.delete(tenant);
		else this.holders.set(tenant, left);
		return left;
	}
}
