import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'computer-use-gateway', instanceTypes: ['main'] })
export class ComputerUseGatewayModule implements ModuleInterface {
	async init() {
		const { ComputerUseGatewayService } = await import('./computer-use-gateway.service');
		Container.get(ComputerUseGatewayService);
	}

	@OnShutdown()
	async shutdown() {
		const { ComputerUseGatewayService } = await import('./computer-use-gateway.service');
		Container.get(ComputerUseGatewayService).disconnectAll();
	}
}
