import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { WAIT_INDEFINITELY, type INodeExecutionData } from 'n8n-workflow';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { WaitTracker } from '@/wait-tracker';
import { preserveInputOverride } from '@/workflow-helpers';

import { ExecutionPersistence } from './execution-persistence';

/** Complete an indefinite response wait. The core tracker owns execution and recovery. */
@Service()
export class ResponseWaitTracker {
	constructor(
		private readonly executions: ExecutionPersistence,
		private readonly waitTracker: WaitTracker,
		private readonly logger: Logger,
	) {}

	/**
	 * Resolves `false` when the resume-attempt limit refuses the resume. The
	 * execution then stops and does not use the response.
	 */
	async respond(
		executionId: string,
		response: { nodeId: string; data: INodeExecutionData[] },
	): Promise<boolean> {
		const execution = await this.executions.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		if (!execution || execution.status !== 'waiting')
			throw new ExecutionAlreadyResumingError(executionId);

		const entry = execution.data.executionData?.nodeExecutionStack[0];
		if (
			execution.waitTill?.getTime() !== WAIT_INDEFINITELY.getTime() ||
			execution.data.waitReason === 'suspended' ||
			!entry ||
			entry.node.id !== response.nodeId ||
			entry.node.disabled
		)
			throw new ExecutionAlreadyResumingError(executionId);

		const runData = execution.data.resultData.runData[entry.node.name];
		if (!runData?.length) throw new UnexpectedError('The waiting node has no execution data');
		preserveInputOverride(runData);
		entry.node.disabled = true;
		entry.data.main = [response.data];
		execution.data.waitTill = undefined;

		// Save the result and its wake-up together. Only the first reply can replace the indefinite wait.
		const saved = await this.executions.updateExistingExecution(
			executionId,
			{ data: execution.data, waitTill: new Date() },
			{ requireStatus: 'waiting', requireWaitTill: WAIT_INDEFINITELY },
		);
		if (!saved) throw new ExecutionAlreadyResumingError(executionId);

		try {
			return await this.waitTracker.startExecution(executionId);
		} catch (error) {
			if (error instanceof ExecutionAlreadyResumingError) return true;
			this.logger.warn('Response saved; the waiting execution will resume on its next poll', {
				executionId,
				error: ensureError(error).message,
			});
			return true;
		}
	}
}
