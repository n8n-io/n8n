import { Service } from 'typedi';
import type { ExecutionTracesController, ExecutionTraceRecord } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

@Service()
export class WorkflowExecutionTracer implements ExecutionTracesController {
	private executionTraces: ExecutionTraceRecord[] = [];

	constructor() {
		this.executionTraces = [];
	}

	getTraces(): ExecutionTraceRecord[] {
		return this.executionTraces;
	}

	addTrace(nodeName: string, log: unknown) {
		// console.log('WorkflowExecutionTracer.addTrade', JSON.stringify(log, null, 2));

		this.executionTraces.push({
			log,
			time: new Date(),
			nodeName,
			uuid: uuid(),
		});
	}
}
