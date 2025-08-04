'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TaskRunnerExecutionTimeoutError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class TaskRunnerExecutionTimeoutError extends n8n_workflow_1.OperationalError {
	constructor({ taskTimeout, isSelfHosted, mode }) {
		super(
			`Task execution timed out after ${taskTimeout} ${taskTimeout === 1 ? 'second' : 'seconds'}`,
		);
		const subtitles = {
			internal:
				'The task runner was taking too long on this task, so it was suspected of being unresponsive and restarted, and the task was aborted.',
			external: 'The task runner was taking too long on this task, so the task was aborted.',
		};
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
		const description = `${mode === 'internal' ? subtitles.internal : subtitles.external} You can try the following:<br/><br/>${suggestionsText}`;
		this.description = description;
	}
}
exports.TaskRunnerExecutionTimeoutError = TaskRunnerExecutionTimeoutError;
//# sourceMappingURL=task-runner-execution-timeout.error.js.map
