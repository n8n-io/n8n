import { Service } from '@n8n/di';

import { ServiceAccountUsage } from './service-account-usage.contracts';

/**
 * Holds the `ServiceAccountUsage` of the agents module, which registers it on
 * init. Services that the container creates before then still get a working
 * instance. Until the registration (the agents module is off), no agent acts as
 * a service account.
 */
@Service()
export class ServiceAccountUsageProxy extends ServiceAccountUsage {
	private impl: ServiceAccountUsage | null = null;

	register(impl: ServiceAccountUsage): void {
		this.impl = impl;
	}

	/** Whether the agents module registered its `ServiceAccountUsage`. */
	get isRegistered(): boolean {
		return this.impl !== null;
	}

	async findAgent(serviceAccountId: string) {
		if (!this.impl) return null;
		return await this.impl.findAgent(serviceAccountId);
	}
}
