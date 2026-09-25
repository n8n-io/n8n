import { OperationalError } from 'n8n-workflow';

export class TaskRequestTimeoutError extends OperationalError {
	description: string;

	constructor({
		elapsedSeconds,
		isSelfHosted,
		requestId,
		workflowId,
		executionId,
		nodeId,
		taskType,
	}: {
		elapsedSeconds: number;
		isSelfHosted: boolean;
		requestId: string;
		workflowId?: string;
		executionId?: string;
		nodeId?: string;
		taskType?: string;
	}) {
		// Keep the message static so Sentry groups all occurrences as one issue.
		// level 'error' + shouldReport so ErrorReporter.beforeSend does not drop this
		// (OperationalError defaults to warning / non-reportable).
		super('Task request timed out', {
			level: 'error',
			shouldReport: true,
			extra: {
				elapsedSeconds,
				requestId,
				workflowId,
				executionId,
				nodeId,
				taskType,
			},
		});

		const description = [
			`Your Code node task was not matched to a runner within the timeout period (waited ${elapsedSeconds} ${elapsedSeconds === 1 ? 'second' : 'seconds'}). This indicates that the task runner is currently down, or not ready, or at capacity, so it cannot service your task.`,
			'If you are repeatedly executing Code nodes with long-running tasks across your instance, please space them apart to give the runner time to catch up. If this does not describe your use case, please open a GitHub issue or reach out to support.',
		];

		if (isSelfHosted) {
			description.push(
				'If needed, you can increase the timeout using the N8N_RUNNERS_TASK_REQUEST_TIMEOUT environment variable.',
			);
		}

		this.description = description.join('<br/><br/>');
	}
}
