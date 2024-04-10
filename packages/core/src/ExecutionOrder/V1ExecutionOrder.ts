import type { Workflow } from 'n8n-workflow';
import { AbstractExecutionOrder } from './AbstractExecutionOrder';

export class V1ExecutionOrder extends AbstractExecutionOrder {
	override forceInputNodeExecution = false;

	constructor(workflow: Workflow) {
		super('v1', 'unshift', workflow);
	}
}
