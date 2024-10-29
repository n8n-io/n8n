import { ApplicationError } from 'n8n-workflow';

import type { TaskRunner } from '../task-broker.service';

export class TaskRunnerOomError extends ApplicationError {
	public description: string;

	constructor(runnerId: TaskRunner['id'], isCloudDeployment: boolean) {
		super(`Task runner (${runnerId}) ran out of memory.`, { level: 'error' });

		const fixSuggestions = {
			reduceItems: 'Reduce the number of items processed at a time by batching the input.',
			increaseMemory:
				"Increase the memory available to the task runner with 'N8N_RUNNERS_MAX_OLD_SPACE_SIZE' environment variable.",
			upgradePlan: 'Upgrade your cloud plan to increase the available memory.',
		};

		const subtitle =
			'The runner executing the code ran out of memory. This usually happens when there are too many items to process. You can try the following:';
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
