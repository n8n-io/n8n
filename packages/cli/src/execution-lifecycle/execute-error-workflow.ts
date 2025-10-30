import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IRun, IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

import type { IWorkflowErrorData } from '@/interfaces';
import { OwnershipService } from '@/services/ownership.service';
import { UrlService } from '@/services/url.service';
// eslint-disable-next-line import-x/no-cycle
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

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
		pastExecutionUrl = `${Container.get(UrlService).getWebhookBaseUrl()}workflow/${
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
				.then((project) => {
					void Container.get(WorkflowExecutionService).executeErrorWorkflow(
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
				.then((project) => {
					void Container.get(WorkflowExecutionService).executeErrorWorkflow(
						workflowId,
						workflowErrorData,
						project,
					);
				});
		}
	}
}
