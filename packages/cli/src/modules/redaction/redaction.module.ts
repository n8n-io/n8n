import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service.js';

@BackendModule({ name: 'redaction', instanceTypes: ['main'] })
export class RedactionModule implements ModuleInterface {
	async init() {
		await import('./redaction-context-hook.js');
		const { ExecutionRedactionService } = await import(
			'./executions/execution-redaction.service.js'
		);
		const executionRedactionService = Container.get(ExecutionRedactionService);
		await executionRedactionService.init();

		const executionRedactionServiceProxy = Container.get(ExecutionRedactionServiceProxy);
		executionRedactionServiceProxy.setExecutionRedaction(executionRedactionService);
	}
}
