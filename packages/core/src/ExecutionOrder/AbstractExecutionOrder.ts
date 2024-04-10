import type { ExecutionOrderVersion, Workflow } from "n8n-workflow";

export abstract class AbstractExecutionOrder {
	abstract forceInputNodeExecution: boolean;

	constructor(
		readonly version: ExecutionOrderVersion,
		readonly enqueueFn: 'unshift' | 'push',
		readonly workflow: Workflow,
	) {}
}
