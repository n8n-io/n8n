import { Service } from '@n8n/di';
import type { ExecutionModeV1, WorkflowHooksV1, WorkflowPreExecuteEventV1 } from '@n8n/hooks-api';
import type { WorkflowExecuteMode } from 'n8n-workflow';

import { ExternalHooks } from '@/external-hooks';

/**
 * Fails to compile when n8n adds an execution mode that V1 does not know.
 * Then add the mode to a new contract version, or map it to a V1 mode here.
 */
const toExecutionModeV1 = (mode: WorkflowExecuteMode): ExecutionModeV1 => mode;

@Service()
export class PublicWorkflowHooksService implements WorkflowHooksV1 {
	readonly version = 1;

	constructor(private readonly externalHooks: ExternalHooks) {}

	onPreExecute(handler: (event: WorkflowPreExecuteEventV1) => Promise<void>): void {
		this.externalHooks.registerHook('workflow.preExecute', async (workflow, mode, _, source) => {
			await handler({
				workflow: { id: workflow.id, name: workflow.name ?? '', active: workflow.active },
				mode: toExecutionModeV1(mode),
				source,
			});
		});
	}
}
