import type { Workflow } from 'n8n-workflow';
import { AbstractExecutionOrder } from './AbstractExecutionOrder';

export class V0ExecutionOrder extends AbstractExecutionOrder {
	override forceInputNodeExecution = true;

	constructor(workflow: Workflow) {
		super('v0', 'push', workflow);
	}
}
