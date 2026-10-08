import type { IExecutionResponse } from '@n8n/db';
import { Container } from '@n8n/di';

import { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import { isExecutionIdV2 } from '@/executions/execution-id';
import { ExecutionPersistence } from '@/executions/execution-persistence';

/**
 * Reads an execution with its run data, from whichever plane ran it. A v2
 * execution has no control-plane row, so its id, a UUID, says where to look.
 * Access is the caller's to check, on the returned `workflowId`.
 */
export async function loadInstanceAiExecution(
	executionId: string,
): Promise<IExecutionResponse | undefined> {
	if (isExecutionIdV2(executionId)) {
		return await Container.get(EngineV2ExecutionReader).findOneUnscoped(executionId);
	}

	return await Container.get(ExecutionPersistence).findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});
}
