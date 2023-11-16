import { Service } from 'typedi';
import type { ExecutionLogsController, ExecutionLogRecord } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

@Service()
export class WorkflowExecutionLogger implements ExecutionLogsController {
	private executionLogs: ExecutionLogRecord[] = [];

	constructor() {
		this.executionLogs = [];
	}

	getLogs(): ExecutionLogRecord[] {
		return this.executionLogs;
	}

	addLog(nodeName: string, log: unknown) {
		console.log('WorkflowExecutionLogger.addLog', JSON.stringify(log, null, 2));

		this.executionLogs.push({
			log,
			time: new Date(),
			nodeName,
			uuid: uuid(),
		});
	}
}
