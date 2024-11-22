import { nanoid } from 'nanoid';

export function getUniqueWorkflowName(workflowNamePrefix?: string) {
	return workflowNamePrefix ? `${workflowNamePrefix} ${nanoid(12)}` : nanoid(12);
}

export function isCanvasV2() {
	return Cypress.env('NODE_VIEW_VERSION') === 2;
}
