import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

function isExecutionRedactionEnabled(): boolean {
	return process.env.N8N_ENABLE_EXECUTION_REDACTION === 'true';
}

@BackendModule({ name: 'redaction', instanceTypes: ['main'] })
export class RedactionModule implements ModuleInterface {
	async init() {
		if (!isExecutionRedactionEnabled()) {
			return;
		}
		const { ExecutionRedactionService } = await import('./executions/execution-redaction.service');
		await Container.get(ExecutionRedactionService).init();
	}
}
