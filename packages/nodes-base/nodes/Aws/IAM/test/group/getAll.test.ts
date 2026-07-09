import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM -  Get All Groups', () => {
	beforeEach(() => {
		nock.cleanAll();
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'ListGroups',
				Version: CURRENT_VERSION,
				MaxItems: 100,
			})
			.reply(200, {
				ListGroupsResponse: {
					ListGroupsResult: {
						Groups: [
							{
								Arn: 'arn:aws:iam::130450532146:group/test/Admin7',
								CreateDate: 1733436631,
								GroupId: 'AGPAR4X3VE4ZAFFY5EDUJ',
								GroupName: 'Admin7',
								Path: '/test/',
							},
							{
								Arn: 'arn:aws:iam::130450532146:group/cognito',
								CreateDate: 1730804196,
								GroupId: 'AGPAR4X3VE4ZMVEFLBSRB',
								GroupName: 'cognito',
								Path: '/',
							},
							{
								Arn: 'arn:aws:iam::130450532146:group/GroupCreatedAfter',
								CreateDate: 1741589366,
								GroupId: 'AGPAR4X3VE4ZF5VE6UF2U',
								GroupName: 'GroupCreatedAfter',
								Path: '/',
							},
						],
					},
				},
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
		credentials: {
			aws: {
				region: 'eu-central-1',
				accessKeyId: 'test',
				secretAccessKey: 'test',
			},
		},
	});
});
