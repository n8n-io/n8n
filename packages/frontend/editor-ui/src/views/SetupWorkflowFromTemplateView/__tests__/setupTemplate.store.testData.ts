import { faker } from '@faker-js/faker/locale/en';
import type { ICredentialsResponse } from '@/Interface';
import type {
	ITemplatesWorkflowFull,
	IWorkflowTemplateNode,
} from '@n8n/rest-api-client/api/templates';

export const newFullOneNodeTemplate = (node: IWorkflowTemplateNode): ITemplatesWorkflowFull => ({
	full: true,
	id: faker.number.int(),
	name: faker.commerce.productName(),
	totalViews: 1,
	createdAt: '2021-08-24T10:40:50.007Z',
	description: faker.lorem.paragraph(),
	workflow: {
		nodes: [node],
		connections: {},
	},
	nodes: [
		{
			defaults: {},
			displayName: faker.commerce.productName(),
			icon: 'file:telegram.svg',
			iconData: {
				fileBuffer: '',
				type: 'file',
			},
			id: faker.number.int(),
			name: node.type,
		},
	],
	image: [],
	categories: [],
	user: {
		username: faker.internet.userName(),
	},
	workflowInfo: {
		nodeCount: 1,
		nodeTypes: {
			[node.type]: {
				count: 1,
			},
		},
	},
});

export const newCredential = (
	opts: Pick<ICredentialsResponse, 'type'> & Partial<ICredentialsResponse>,
): ICredentialsResponse => ({
	createdAt: faker.date.past().toISOString(),
	updatedAt: faker.date.past().toISOString(),
	id: faker.string.alphanumeric({ length: 16 }),
	name: faker.commerce.productName(),
	isManaged: false,
	...opts,
});
