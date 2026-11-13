import { OnLifecycleEvent, type WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { SandboxScopeClient } from './sandbox-scope-client';

/**
 * Closes the scopes of an execution when it ends or goes to waiting.
 * Module hooks run for regular main, scaling workers and sub-executions.
 */
@Service()
export class CodeSandboxLifecycleHandler {
	constructor(private readonly scopes: SandboxScopeClient) {}

	@OnLifecycleEvent('workflowExecuteAfter')
	onWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext) {
		this.scopes.closeExecution(ctx.executionId);
	}
}
