import { Service } from '@n8n/di';
import type { WorkflowOperationError } from 'n8n-workflow';

/**
 * Executions cancelled by the memory guard, so the save path can persist them
 * without their run data. Serializing a large execution at the moment the
 * instance is nearly out of memory could itself cause the OOM the guard is
 * preventing.
 */
@Service()
export class ShedRegistry {
	private readonly shedExecutions = new Map<string, WorkflowOperationError>();

	markShed(executionId: string, error: WorkflowOperationError) {
		this.shedExecutions.set(executionId, error);
	}

	/** Returns the shed error for this execution and forgets it, or undefined. */
	consume(executionId: string): WorkflowOperationError | undefined {
		const error = this.shedExecutions.get(executionId);
		if (error) this.shedExecutions.delete(executionId);
		return error;
	}
}
