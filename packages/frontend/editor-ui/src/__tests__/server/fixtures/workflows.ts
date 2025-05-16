import type { IWorkflowDb } from '@/Interface';
import { faker } from '@faker-js/faker';

export const workflows = [
	{
		id: '1',
		name: 'workflow1',
		tags: [],
	},
	{
		id: '2',
		name: 'workflow2',
		tags: [
			{ id: '1', name: 'tag1' },
			{ id: '2', name: 'tag2' },
		],
	},
	{
		id: '3',
		name: 'workflow3',
		tags: [
			{ id: '1', name: 'tag1' },
			{ id: '3', name: 'tag3' },
		],
	},
	{
		id: '4',
		name: 'workflow4',
		tags: [
			{ id: '2', name: 'tag2' },
			{ id: '3', name: 'tag3' },
		],
	},
	{
		id: '5',
		name: 'workflow5',
		tags: [
			{ id: '1', name: 'tag1' },
			{ id: '2', name: 'tag2' },
			{ id: '3', name: 'tag3' },
		],
	},
].map((wf, idx) => ({
	...wf,
	createdAt: faker.date.recent().toISOString(),
	updatedAt: new Date(`2024-1-${idx + 1}`).toISOString(),
})) as IWorkflowDb[];
