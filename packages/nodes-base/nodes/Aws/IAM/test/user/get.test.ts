import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Get User', () => {
	beforeEach(() => {
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'GetUser',
				Version: CURRENT_VERSION,
				UserName: 'accounts@this.de',
			})
			.reply(200, {
				GetUserResponse: {
					GetUserResult: {
						User: {
							UserName: 'accounts@this.de',
							UserId: 'AIDAR4X3VE4ZANWXRN2L2',
							Arn: 'arn:aws:iam::130450532146:user/accounts@this.de',
							CreateDate: 1733911052,
							Path: '/',
							Tags: [
								{
									Key: 'AKIAR4X3VE4ZALQYFEMT',
									Value: 'API dev',
								},
							],
							PasswordLastUsed: null,
							PermissionsBoundary: null,
						},
					},
				},
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['get.workflow.json'],
		credentials: {
			aws: {
				region: 'eu-central-1',
				accessKeyId: 'test',
				secretAccessKey: 'test',
			},
		},
	});
});
