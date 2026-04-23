export const workflowHistoryLookupFields = [
	'authors',
	'createdAt',
	'updatedAt',
	'name',
	'description',
] as const;

export type WorkflowHistoryLookupField = (typeof workflowHistoryLookupFields)[number];
