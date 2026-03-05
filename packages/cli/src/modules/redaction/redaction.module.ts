import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';

function isExecutionRedactionEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_EXECUTION_REDACTION === 'true';
}

@BackendModule({ name: 'redaction', instanceTypes: ['main'] })
export class RedactionModule implements ModuleInterface {
	async init() {
		if (!isExecutionRedactionEnabled()) {
			return;
		}
		const { ExecutionRedactionService } = await import('./executions/execution-redaction.service');
		const executionRedactionService = Container.get(ExecutionRedactionService);
		await executionRedactionService.init();

		const executionRedactionServiceProxy = Container.get(ExecutionRedactionServiceProxy);
		executionRedactionServiceProxy.setExecutionRedaction(executionRedactionService);
	}
}
