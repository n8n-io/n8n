import { Service } from '@n8n/di';

import type {
	ExecutionRedaction,
	ExecutionRedactionOptions,
	RedactableExecution,
} from './execution-redaction';

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
		if (!this.executionRedaction) {
			return execution;
		}
		return await this.executionRedaction.processExecution(execution, options);
	}

	async processExecutions(
		executions: RedactableExecution[],
		options: ExecutionRedactionOptions,
	): Promise<void> {
		if (!this.executionRedaction) return;
		await this.executionRedaction.processExecutions(executions, options);
	}
}
