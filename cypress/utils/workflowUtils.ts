import { nanoid } from 'nanoid';

export function getUniqueWorkflowName(workflowNamePrefix?: string) {
	return workflowNamePrefix ? `${workflowNamePrefix} ${nanoid(12)}` : nanoid(12);
}
