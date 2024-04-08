import { faker } from '@faker-js/faker/locale/en';
import type {
	ICredentialsResponse,
	ITemplatesWorkflowFull,
	IWorkflowTemplateNode,
} from '@/Interface';

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
	...opts,
});

export const credentialsTelegram1: ICredentialsResponse = {
	createdAt: '2023-11-23T14:26:07.969Z',
	updatedAt: '2023-11-23T14:26:07.964Z',
	id: 'YaSKdvEcT1TSFrrr1',
	name: 'Telegram account',
	type: 'telegramApi',
	ownedBy: {
		id: '713ef3e7-9e65-4b0a-893c-8a653cbb2c4f',
		email: 'user@n8n.io',
		firstName: 'Player',
		lastName: 'One',
	},
	sharedWithProjects: [],
};

export const credentialsTelegram2: ICredentialsResponse = {
	createdAt: '2023-11-23T14:26:07.969Z',
	updatedAt: '2023-11-23T14:26:07.964Z',
	id: 'YaSKdvEcT1TSFrrr2',
	name: 'Telegram account',
	type: 'telegramApi',
	ownedBy: {
		id: '713ef3e7-9e65-4b0a-893c-8a653cbb2c4f',
		email: 'user@n8n.io',
		firstName: 'Player',
		lastName: 'One',
	},
	sharedWithProjects: [],
};

export {
	fullSaveEmailAttachmentsToNextCloudTemplate,
	fullShopifyTelegramTwitterTemplate,
} from '@/utils/testData/templateTestData';

export { credentialTypeTelegram, newCredentialType } from '@/utils/testData/credentialTypeTestData';

export {
	nodeTypeHttpRequestV1,
	nodeTypeNextCloudV1,
	nodeTypeReadImapV1,
	nodeTypeReadImapV2,
	nodeTypeShopifyTriggerV1,
	nodeTypeTelegramV1,
	nodeTypeTelegramV1_1,
	nodeTypeTwitterV1,
	nodeTypeTwitterV2,
} from '@/utils/testData/nodeTypeTestData';
