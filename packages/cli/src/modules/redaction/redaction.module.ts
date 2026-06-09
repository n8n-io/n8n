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
		// The decorator runs at class-evaluation (import) time, so the import
		// side-effect alone is sufficient — the registry instantiates the handler
		// lazily on event receipt, so we must not eagerly resolve it here.
		await import('./instance-redaction-enforcement.service');

		const { ExecutionRedactionService } = await import('./executions/execution-redaction.service');
		const executionRedactionService = Container.get(ExecutionRedactionService);
		await executionRedactionService.init();

		const executionRedactionServiceProxy = Container.get(ExecutionRedactionServiceProxy);
		executionRedactionServiceProxy.setExecutionRedaction(executionRedactionService);
	}
}
