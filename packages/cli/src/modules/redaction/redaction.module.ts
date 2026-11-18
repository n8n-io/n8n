import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import {
	ExecutingUserIdentifierProxy,
	ExecutionRedactionServiceProxy,
} from '@n8n/backend-services';

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

		// Import side-effect registers DynamicCredentialsContextHook, which stamps
		// the private-credential flag at execution start (unconditional of license).
		await import('./dynamic-credentials-context-hook.js');

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

		// Data table row rules need the run's user on every instance, not only where the
		// licensed dynamic-credentials module registers the identifier.
		// Resolved on first use, so start-up does not build the identifier's dependencies.
		Container.get(ExecutingUserIdentifierProxy).setProvider({
			identify: async (context) => {
				const { N8NIdentifier } = await import(
					'../dynamic-credentials.ee/credential-resolvers/identifiers/n8n-identifier.js'
				);
				return await Container.get(N8NIdentifier).identify(context);
			},
		});
	}
}
