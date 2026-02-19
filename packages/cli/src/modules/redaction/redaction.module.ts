import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'redaction', instanceTypes: ['main'] })
export class RedactionModule implements ModuleInterface {
	async init() {
		const { ExecutionRedactionService } = await import('./executions/execution-redaction.service');
		await Container.get(ExecutionRedactionService).init();
	}
}
