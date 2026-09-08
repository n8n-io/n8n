import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';

/**
 * Context is established by whichever instance runs the workflow — main, queue worker or
 * dedicated webhook — and `init()` registers the hook that snapshots the redaction policy
 * onto the record. Keep this module free of an `instanceTypes` restriction.
 */
@BackendModule({ name: 'redaction' })
export class RedactionModule implements ModuleInterface {
	async init() {
		// Import side-effect registers RedactionContextHook.
		await import('./redaction-context-hook.js');

		// Importing the service here registers its @OnPubSubEvent handler with the
		// pubsub metadata before PubSubRegistry.init() wires up the listeners.
		// The decorator runs at class-evaluation (import) time, so the import
		// side-effect alone is sufficient — the registry instantiates the handler
		// lazily on event receipt, so we must not eagerly resolve it here.
		await import('./instance-redaction-enforcement.service.js');

		const { ExecutionRedactionService } = await import(
			'./executions/execution-redaction.service.js'
		);
		const executionRedactionService = Container.get(ExecutionRedactionService);
		await executionRedactionService.init();

		const executionRedactionServiceProxy = Container.get(ExecutionRedactionServiceProxy);
		executionRedactionServiceProxy.setExecutionRedaction(executionRedactionService);
	}
}
