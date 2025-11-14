import { OperationalError } from 'n8n-workflow';

export class TaskRequestTimeoutError extends OperationalError {
	description: string;

	constructor({ timeout, isSelfHosted }: { timeout: number; isSelfHosted: boolean }) {
		super(`Task request timed out after ${timeout} ${timeout === 1 ? 'second' : 'seconds'}`);

		const description = [
			'Your Code node task was not matched to a runner within the timeout period. This indicates that the task runner is currently down, or not ready, or at capacity, so it cannot service your task.',
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
