import type { IExecutionDb } from '@n8n/db';
import { Service } from '@n8n/di';

import type { ExecutionRedaction, ExecutionRedactionOptions } from './execution-redaction';

@Service()
export class ExecutionRedactionServiceProxy implements ExecutionRedaction {
	private executionRedaction?: ExecutionRedaction;

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
