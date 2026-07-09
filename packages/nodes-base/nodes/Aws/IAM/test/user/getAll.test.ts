import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Get All Users', () => {
	beforeEach(() => {
		nock.cleanAll();
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'ListUsers',
				Version: CURRENT_VERSION,
				MaxItems: 100,
			})
			.reply(200, {
				ListUsersResponse: {
					ListUsersResult: {
						Users: [
							{
								Arn: 'arn:aws:iam::130450532146:user/Johnnn',
								UserName: 'Johnnn',
								UserId: 'AIDAR4X3VE4ZAJGXLCVOP',
								Path: '/',
								CreateDate: 1739198010,
								PasswordLastUsed: null,
								PermissionsBoundary: null,
								Tags: null,
							},
							{
								Arn: 'arn:aws:iam::130450532146:user/rhis/path/Jonas',
								UserName: 'Jonas',
								UserId: 'AIDAR4X3VE4ZDJJFKI6OU',
								Path: '/rhis/path/',
								CreateDate: 1739198295,
								PasswordLastUsed: null,
								PermissionsBoundary: null,
								Tags: null,
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
