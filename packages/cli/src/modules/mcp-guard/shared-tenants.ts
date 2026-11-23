import { GymAdmin } from './gym-admin';

/**
 * A gym admin for the HTTP vendors of one chat, which share one tenant. The gym keeps one world for all
 * services, so a sheet that the Sheets vendor made is a file for the Drive vendor too.
 * Each vendor asks for the tenant and gives it back. The tenant is made once and deleted with the last vendor.
 */
export class SharedTenantAdmin extends GymAdmin {
	private readonly holders = new Map<string, number>();

	private readonly creating = new Map<string, Promise<void>>();

	override async createTenant(tenant: string): Promise<void> {
		this.holders.set(tenant, (this.holders.get(tenant) ?? 0) + 1);
		const pending = this.creating.get(tenant);
		try {
			if (pending) return await pending;
			const creation = super.createTenant(tenant);
			this.creating.set(tenant, creation);
			await creation;
		} catch (error) {
			this.creating.delete(tenant);
			this.release(tenant);
			throw error;
		}
	}

	override async deleteTenant(tenant: string): Promise<void> {
		if (this.release(tenant) > 0) return;
		this.creating.delete(tenant);
		try {
			await super.deleteTenant(tenant);
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
