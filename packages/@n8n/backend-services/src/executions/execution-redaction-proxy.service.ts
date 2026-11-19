import { Service } from '@n8n/di';

import type {
	ExecutionRedaction,
	ExecutionRedactionOptions,
	RedactableExecution,
} from './execution-redaction';

/** Removes the editor session that a waiting manual run stores, so no read hands it out. */
function hidePushSession(execution: RedactableExecution): void {
	if (execution.data) {
		delete execution.data.pushRef;
		delete execution.data.pushRefUserId;
	}
}

@Service()
export class ExecutionRedactionServiceProxy implements ExecutionRedaction {
	private executionRedaction?: ExecutionRedaction;

	setExecutionRedaction(executionRedaction: ExecutionRedaction) {
		this.executionRedaction = executionRedaction;
	}

	async processExecution(
		execution: RedactableExecution,
		options: ExecutionRedactionOptions,
	): Promise<RedactableExecution> {
		hidePushSession(execution);
		if (!this.executionRedaction) {
			return execution;
		}
		return await this.executionRedaction.processExecution(execution, options);
	}

	async processExecutions(
		executions: RedactableExecution[],
		options: ExecutionRedactionOptions,
	): Promise<void> {
		executions.forEach(hidePushSession);
		if (!this.executionRedaction) return;
		await this.executionRedaction.processExecutions(executions, options);
	}
}
