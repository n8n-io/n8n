import { faker } from '@faker-js/faker';
import type { WorkflowHistory, WorkflowVersion } from '@n8n/rest-api-client/api/workflowHistory';

export const workflowHistoryDataFactory: () => WorkflowHistory = () => ({
	versionId: faker.string.nanoid(),
	createdAt: faker.date.past().toDateString(),
	updatedAt: faker.date.past().toDateString(),
	authors: Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, faker.person.fullName).join(
		', ',
	),
});

export const workflowVersionDataFactory: () => WorkflowVersion = () => ({
	...workflowHistoryDataFactory(),
	workflowId: faker.string.nanoid(),
	connections: {},
	nodes: [],
});
