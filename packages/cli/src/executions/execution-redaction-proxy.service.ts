import { Service } from '@n8n/di';
import { ExecutionRedaction, ExecutionRedactionOptions } from './execution-redaction';
import { IExecutionDb } from '@n8n/db';

/**
 * Performs a persistence operation on an execution and its blob of data.
 * Writes per the configured storage mode. Reads per the recorded `storedAt` value.
 */
@Service()
export class ExecutionRedactionServiceProxy implements ExecutionRedaction {
	private executionRedaction?: ExecutionRedaction;

	constructor() {}

	setExecutionRedaction(executionRedaction: ExecutionRedaction) {
		this.executionRedaction = executionRedaction;
	}

	async processExecution(
		execution: IExecutionDb,
		options: ExecutionRedactionOptions,
	): Promise<IExecutionDb> {
		if (!this.executionRedaction) {
			return execution;
		}
		return await this.executionRedaction.processExecution(execution, options);
	}
}
