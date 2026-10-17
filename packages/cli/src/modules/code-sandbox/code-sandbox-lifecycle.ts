import { OnLifecycleEvent, type WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { SandboxLeaseManager } from './sandbox-lease-manager';

/**
 * Releases the sandboxes of an execution when it ends or goes to waiting.
 * Module hooks run for regular main, scaling workers and sub-executions.
 */
@Service()
export class CodeSandboxLifecycleHandler {
	constructor(private readonly leases: SandboxLeaseManager) {}

	@OnLifecycleEvent('workflowExecuteAfter')
	onWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext) {
		const reason = ctx.runData.waitTill ? 'execution_waiting' : 'execution_end';
		this.leases.releaseForExecution(ctx.executionId, reason);
	}
}
