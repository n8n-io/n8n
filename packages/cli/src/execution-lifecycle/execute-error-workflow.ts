import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IRun, IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

import type { IWorkflowErrorData } from '@/interfaces';
import { OwnershipService } from '@/services/ownership.service';
import { UrlService } from '@/services/url.service';

/**
 * Resolved lazily. A static import would close the cycle
 * `workflow-runner -> execution-lifecycle-hooks -> execute-error-workflow ->
 * workflow-execution.service -> workflow-runner`. Enter that graph at the wrong
 * point (`workflow-runner`, `wait-tracker`, `webhook-helpers` or
 * `test-webhooks`) and `emitDecoratorMetadata` captures an unresolved paramtype
 * for `WorkflowExecutionService`'s `workflowRunner`, which DI silently injects
 * as `undefined` — the next triggered execution then dies with "Cannot read
 * properties of undefined (reading 'run')".
 */
const getWorkflowExecutionService = async () => {
	// `no-cycle` counts a dynamic import as an edge. It isn't one that matters
	// here: the import is evaluated at call time, long after every module in the
	// chain is initialised, so it creates no evaluation-order dependency. That is
	// the whole reason this is a dynamic import.
	// eslint-disable-next-line import-x/no-cycle
	const { WorkflowExecutionService } = await import('@/workflows/workflow-execution.service.js');
	return Container.get(WorkflowExecutionService);
};

/**
 * Checks if there was an error and if errorWorkflow or a trigger is defined. If so it collects
 * all the data and executes it
 *
 * @param {IWorkflowBase} workflowData The workflow which got executed
 * @param {IRun} fullRunData The run which produced the error
 * @param {WorkflowExecuteMode} mode The mode in which the workflow got started in
 * @param {string} [executionId] The id the execution got saved as
 */
export function executeErrorWorkflow(
	workflowData: IWorkflowBase,
	fullRunData: IRun,
	mode: WorkflowExecuteMode,
	executionId?: string,
	retryOf?: string,
): void {
	const logger = Container.get(Logger);

	// Check if there was an error and if so if an errorWorkflow or a trigger is set
	let pastExecutionUrl: string | undefined;
	if (executionId !== undefined) {
		pastExecutionUrl = `${Container.get(UrlService).getInstanceBaseUrl()}/workflow/${
			workflowData.id
		}/executions/${executionId}`;
	}

	if (fullRunData.data.resultData.error !== undefined) {
		let workflowErrorData: IWorkflowErrorData;
		const workflowId = workflowData.id;

		if (executionId) {
			// The error did happen in an execution
			workflowErrorData = {
				execution: {
					id: executionId,
					url: pastExecutionUrl,
					error: fullRunData.data.resultData.error,
					lastNodeExecuted: fullRunData.data.resultData.lastNodeExecuted!,
					mode,
					retryOf,
					executionContext: fullRunData.data.executionData?.runtimeData,
				},
				workflow: {
					id: workflowId,
					name: workflowData.name,
				},
			};
		} else {
			// The error did happen in a trigger
			workflowErrorData = {
				trigger: {
					error: fullRunData.data.resultData.error,
					mode,
				},
				workflow: {
					id: workflowId,
					name: workflowData.name,
				},
			};
		}

		const { errorTriggerType } = Container.get(GlobalConfig).nodes;
		// Run the error workflow
		// To avoid an infinite loop do not run the error workflow again if the error-workflow itself failed and it is its own error-workflow.
		const { errorWorkflow } = workflowData.settings ?? {};
		if (errorWorkflow && !(mode === 'error' && workflowId && errorWorkflow === workflowId)) {
			logger.debug('Start external error workflow', {
				executionId,
				errorWorkflowId: errorWorkflow,
				workflowId,
			});
			// If a specific error workflow is set run only that one

			// First, do permission checks.
			if (!workflowId) {
				// Manual executions do not trigger error workflows
				// So this if should never happen. It was added to
				// make sure there are no possible security gaps
				return;
			}

			Container.get(OwnershipService)
				.getWorkflowProjectCached(workflowId)
				.then(async (project) => {
					const workflowExecutionService = await getWorkflowExecutionService();
					await workflowExecutionService.executeErrorWorkflow(
						errorWorkflow,
						workflowErrorData,
						project,
					);
				})
				.catch((error: Error) => {
					Container.get(ErrorReporter).error(error);
					logger.error(
						`Could not execute ErrorWorkflow for execution ID ${executionId} because of error querying the workflow owner`,
						{
							executionId,
							errorWorkflowId: errorWorkflow,
							workflowId,
							error,
							workflowErrorData,
						},
					);
				});
		} else if (
			mode !== 'error' &&
			workflowId !== undefined &&
			workflowData.nodes.some((node) => node.type === errorTriggerType)
		) {
			logger.debug('Start internal error workflow', { executionId, workflowId });
			void Container.get(OwnershipService)
				.getWorkflowProjectCached(workflowId)
				.then(async (project) => {
					const workflowExecutionService = await getWorkflowExecutionService();
					await workflowExecutionService.executeErrorWorkflow(
						workflowId,
						workflowErrorData,
						project,
					);
				})
				.catch((error: Error) => {
					Container.get(ErrorReporter).error(error);
					logger.error(`Could not execute internal ErrorWorkflow for execution ID ${executionId}`, {
						executionId,
						workflowId,
						error,
						workflowErrorData,
					});
				});
		}
	}
}
