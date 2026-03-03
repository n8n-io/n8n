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
}
