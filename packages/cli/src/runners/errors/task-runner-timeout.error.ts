import { ApplicationError } from 'n8n-workflow';

export class TaskRunnerTimeoutError extends ApplicationError {
	description: string;

	constructor(taskTimeout: number, isSelfHosted: boolean) {
		super(
			`Task execution timed out after ${taskTimeout} ${taskTimeout === 1 ? 'second' : 'seconds'}`,
		);

		const subtitle =
			'The task runner was taking too long on this task, so it was suspected of being unresponsive and restarted, and the task was aborted. You can try the following:';

		const fixes = {
			optimizeScript:
				'Optimize your script to prevent long-running tasks, e.g. by processing data in smaller batches.',
			ensureTermination:
				'Ensure that all paths in your script are able to terminate, i.e. no infinite loops.',
			increaseTimeout: `If your task can reasonably take more than ${taskTimeout} ${taskTimeout === 1 ? 'second' : 'seconds'}, increase the timeout using the N8N_RUNNERS_TASK_TIMEOUT environment variable.`,
		};

		const suggestions = [fixes.optimizeScript, fixes.ensureTermination];

		if (isSelfHosted) suggestions.push(fixes.increaseTimeout);

		const suggestionsText = suggestions
			.map((suggestion, index) => `${index + 1}. ${suggestion}`)
			.join('<br/>');

		const description = `${subtitle}<br/><br/>${suggestionsText}`;

		this.description = description;
	}
}
