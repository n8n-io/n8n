import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Policies on the tool calls of agents. The agent runtime asks the `preToolExecution`
 * enforcement point before each tool call, and this module registers the checks for it.
 *
 * Runs on all instance types, because agents also run on workers and webhook processes.
 */
@BackendModule({ name: 'agent-tool-policies' })
export class AgentToolPoliciesModule implements ModuleInterface {
	async init() {
		// Imported for its side effect: `@PolicyCheck` registers the check on class definition.
		await import('./tool-call-log.check.js');
	}
}
