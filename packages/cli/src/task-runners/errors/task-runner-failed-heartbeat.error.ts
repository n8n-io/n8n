import { UserError } from 'n8n-workflow';

export class TaskRunnerFailedHeartbeatError extends UserError {
	description: string;

	constructor(heartbeatInterval: number, isSelfHosted: boolean) {
		super('Task execution aborted because runner became unresponsive');

		const subtitle =
			'The task runner failed to respond as expected, so it was considered unresponsive, and the task was aborted. You can try the following:';

		const fixes = {
			optimizeScript:
				'Optimize your script to prevent CPU-intensive operations, e.g. by breaking them down into smaller chunks or batch processing.',
			ensureTermination:
				'Ensure that all paths in your script are able to terminate, i.e. no infinite loops.',
			increaseInterval: `If your task can reasonably keep the task runner busy for more than ${heartbeatInterval} ${heartbeatInterval === 1 ? 'second' : 'seconds'}, increase the heartbeat interval using the N8N_RUNNERS_HEARTBEAT_INTERVAL environment variable.`,
		};

		const suggestions = [fixes.optimizeScript, fixes.ensureTermination];

		if (isSelfHosted) suggestions.push(fixes.increaseInterval);

		const suggestionsText = suggestions
			.map((suggestion, index) => `${index + 1}. ${suggestion}`)
			.join('<br/>');

		const description = `${subtitle}<br/><br/>${suggestionsText}`;

		this.description = description;
	}
}
