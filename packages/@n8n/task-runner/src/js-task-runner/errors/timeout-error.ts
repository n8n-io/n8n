import { ApplicationError } from '@n8n/errors';

export class TimeoutError extends ApplicationError {
	description: string;

	constructor(taskTimeout: number) {
		super(
			`Task execution timed out after ${taskTimeout} ${taskTimeout === 1 ? 'second' : 'seconds'}`,
		);

		const subtitle = 'The task runner was taking too long on this task, so the task was aborted.';

		const fixes = {
			optimizeScript:
				'Optimize your script to prevent long-running tasks, e.g. by processing data in smaller batches.',
			ensureTermination:
				'Ensure that all paths in your script are able to terminate, i.e. no infinite loops.',
		};

		const suggestions = [fixes.optimizeScript, fixes.ensureTermination];

		const suggestionsText = suggestions
			.map((suggestion, index) => `${index + 1}. ${suggestion}`)
			.join('<br/>');

		const description = `${subtitle} You can try the following:<br/><br/>${suggestionsText}`;

		this.description = description;
	}
}
