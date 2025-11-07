import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Create user', () => {
	beforeEach(() => {
		nock.cleanAll();
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'CreateUser',
				Version: CURRENT_VERSION,
				UserName: 'UserTest1',
			})
			.reply(200, {
				CreateUserResponse: {
					CreateUserResult: {
						User: {
							Arn: 'arn:aws:iam::130450532146:user/UserTest1',
							CreateDate: 1744115235,
							PasswordLastUsed: null,
							Path: '/',
							PermissionsBoundary: null,
							UserId: 'AIDAR4X3VE4ZHHMNF7NBB',
							UserName: 'UserTest1',
						},
					},
					ResponseMetadata: {
						RequestId: 'ce14481c-5629-4ae4-9eae-3722f48bb3e0',
					},
				},
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
		credentials: {
			aws: {
				region: 'eu-central-1',
				accessKeyId: 'test',
				secretAccessKey: 'test',
			},
		},
	});
});
