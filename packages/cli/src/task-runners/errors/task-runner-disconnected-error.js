'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TaskRunnerDisconnectedError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class TaskRunnerDisconnectedError extends n8n_workflow_1.UnexpectedError {
	constructor(runnerId, isCloudDeployment) {
		super('Node execution failed');
		this.runnerId = runnerId;
		const fixSuggestions = {
			reduceItems:
				'Reduce the number of items processed at a time, by batching them using a loop node',
			increaseMemory:
				"Increase the memory available to the task runner with 'N8N_RUNNERS_MAX_OLD_SPACE_SIZE' environment variable",
			upgradePlan: 'Upgrade your cloud plan to increase the available memory',
		};
		const subtitle =
			'This can happen for various reasons. Please try executing the node again. If the problem persists, you can try the following:';
		const suggestions = isCloudDeployment
			? [fixSuggestions.reduceItems, fixSuggestions.upgradePlan]
			: [fixSuggestions.reduceItems, fixSuggestions.increaseMemory];
		const suggestionsText = suggestions
			.map((suggestion, index) => `${index + 1}. ${suggestion}`)
			.join('<br/>');
		const description = `${subtitle}<br/><br/>${suggestionsText}`;
		this.description = description;
	}
}
exports.TaskRunnerDisconnectedError = TaskRunnerDisconnectedError;
//# sourceMappingURL=task-runner-disconnected-error.js.map
