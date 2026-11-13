import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

// No routes. The guard runs in-process and only when an Agent Builder test run calls it.
@BackendModule({ name: 'mcp-guard' })
export class McpGuardModule implements ModuleInterface {
	async init() {}
}
