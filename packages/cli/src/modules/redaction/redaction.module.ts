import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';

@BackendModule({ name: 'redaction', instanceTypes: ['main'] })
export class RedactionModule implements ModuleInterface {
	async init() {
		await import('./redaction-context-hook');

		// Importing the service here registers its @OnPubSubEvent handler with the
		// pubsub metadata before PubSubRegistry.init() wires up the listeners.
		const { InstanceRedactionEnforcementService } = await import(
			'./instance-redaction-enforcement.service'
		);
		Container.get(InstanceRedactionEnforcementService);

		const { ExecutionRedactionService } = await import('./executions/execution-redaction.service');
		const executionRedactionService = Container.get(ExecutionRedactionService);
		await executionRedactionService.init();

		const executionRedactionServiceProxy = Container.get(ExecutionRedactionServiceProxy);
		executionRedactionServiceProxy.setExecutionRedaction(executionRedactionService);
	}
}
