import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

import type { DurableLeaseService } from './durable-lease.service';

@BackendModule({ name: 'durable-leases', instanceTypes: ['main'] })
export class DurableLeasesModule implements ModuleInterface {
	private service: DurableLeaseService | undefined;

	async init(): Promise<void> {
		const { DurableLeaseService } = await import('./durable-lease.service.js');
		// Builds the service at startup, so invalid lease timings stop n8n before any kind registers.
		this.service = Container.get(DurableLeaseService);
	}

	// Runs on every instance that loads the module, so it stops only a service that init built.
	@OnShutdown()
	async shutdown(): Promise<void> {
		await this.service?.stop();
	}
}
