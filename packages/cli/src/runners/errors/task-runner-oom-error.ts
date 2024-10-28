import { ApplicationError } from 'n8n-workflow';

import type { TaskRunner } from '../task-broker.service';

export class TaskRunnerOomError extends ApplicationError {
	constructor(runnerId: TaskRunner['id'], isCloudDeployment: boolean) {
		const fixSuggestions = {
			reduceItems: 'Reduce the number of items being processed by batching the input.',
			increaseMemory:
				"Increase the memory available to the task runner with 'N8N_RUNNERS_MAX_OLD_SPACE_SIZE' environment variable.",
			upgradePlan: 'Upgrade your cloud plan to increase the available memory.',
		};

		const headline = `The task runner (${runnerId}) executing the code ran out of memory. This usually happens when there are too many items to process. You can try the following:`;
		const suggestions = isCloudDeployment
			? [fixSuggestions.reduceItems, fixSuggestions.upgradePlan]
			: [fixSuggestions.reduceItems, fixSuggestions.increaseMemory];
		const message = `${headline} ${suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join(' ')}`;

		super(message, { level: 'error' });
	}
}
