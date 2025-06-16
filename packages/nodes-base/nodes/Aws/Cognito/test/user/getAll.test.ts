import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('AWS Cognito - Get All Users', () => {
	beforeEach(() => {
		const baseUrl = 'https://cognito-idp.eu-central-1.amazonaws.com/';

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_KkXQgdCJv',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListUsers')
			.reply(200, {
				Users: [
					{
						Username: '034448d2-4011-7079-9474-9a4fccd4247a',
						Attributes: [
							{ Name: 'email', Value: 'FinalUser@gmail.com' },
							{ Name: 'Sub', Value: '034448d2-4011-7079-9474-9a4fccd4247a' },
							{ Name: 'Enabled', Value: true },
							{ Name: 'UserCreateDate', Value: 1736343033.226 },
							{ Name: 'UserLastModifiedDate', Value: 1736343033.226 },
							{ Name: 'UserStatus', Value: 'FORCE_CHANGE_PASSWORD' },
						],
					},
					{
						Username: '03a438f2-10d1-70f1-f45a-09753ab5c4c3',
						Attributes: [
							{ Name: 'email', Value: 'mail.this1@gmail.com' },
							{ Name: 'Sub', Value: '03a438f2-10d1-70f1-f45a-09753ab5c4c3' },
							{ Name: 'Enabled', Value: true },
							{ Name: 'UserCreateDate', Value: 1733746687.223 },
							{ Name: 'UserLastModifiedDate', Value: 1733746687.223 },
							{ Name: 'UserStatus', Value: 'FORCE_CHANGE_PASSWORD' },
						],
					},
					{
						Username: '03f438d2-b0f1-70bc-04d9-f6dd31f2d878',
						Attributes: [
							{ Name: 'email', Value: 'test3@gmail.com' },
							{ Name: 'Sub', Value: '03f438d2-b0f1-70bc-04d9-f6dd31f2d878' },
							{ Name: 'Enabled', Value: true },
							{ Name: 'UserCreateDate', Value: 1742928785.796 },
							{ Name: 'UserLastModifiedDate', Value: 1742928785.796 },
							{ Name: 'UserStatus', Value: 'FORCE_CHANGE_PASSWORD' },
						],
					},
				],
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
