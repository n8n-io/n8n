import type { Logger } from '@n8n/backend-common';
import type { ErrorWorkflowResolver } from '@n8n/engine';
import { UserError } from '@n8n/errors';

import { createExecutionIdV2 } from '@/executions/execution-id';

import type { EngineWorkflowResolveClient } from './engine-workflow-resolve-client';

/**
 * The error workflow resolver that the engine calls after an execution failed.
 * It mints the id of the error execution, because the engine never mints one,
 * and asks the control plane through the shared client.
 *
 * A refusal that the caller can fix is an answer of `none`: a retry would send
 * the same request, and the engine would send it on every sweep. Every other
 * failure throws, and the engine asks again later.
 *
 * The engine asks only when the start found an error workflow, so a refusal
 * means that no error execution runs for a failure that expects one. v1 saves
 * a failed error execution for a credential refusal. Engine v2 saves none, so
 * the refusal is logged as a warning.
 */
export function createErrorWorkflowResolver(
	client: EngineWorkflowResolveClient,
	logger: Logger,
	signal: AbortSignal,
): ErrorWorkflowResolver {
	return async (source) => {
		const executionId = createExecutionIdV2();
		try {
			const {
				workflowId,
				graph,
				workflow,
				triggerOutputs,
				projectId,
				resolveErrorWorkflowOnFailure,
			} = await client.resolve({ kind: 'error-workflow', executionId, source }, signal);
			return {
				kind: 'start',
				executionId,
				workflowId,
				graph,
				workflow,
				triggerOutputs,
				callerContext: { hostMode: 'error', projectId },
				resolveErrorWorkflowOnFailure,
			};
		} catch (error) {
			if (!(error instanceof UserError)) throw error;
			logger.warn('The error workflow of a failed execution did not start', {
				executionId: source.executionId,
				workflowId: source.workflowId,
				reason: error.message,
			});
			return { kind: 'none', reason: error.message };
		}
	};
}
