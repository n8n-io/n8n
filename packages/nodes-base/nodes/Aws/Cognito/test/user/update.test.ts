import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('AWS Cognito - Update User', () => {
	beforeEach(() => {
		const baseUrl = 'https://cognito-idp.eu-central-1.amazonaws.com/';

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_EUZ4iEF1T',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.DescribeUserPool')
			.reply(200, {
				UserPool: {
					Arn: 'arn:aws:cognito-idp:eu-central-1:130450532146:userpool/eu-central-1_EUZ4iEF1T',
					CreationDate: 1739530218.869,
					DeletionProtection: 'INACTIVE',
					EstimatedNumberOfUsers: 4,
					Id: 'eu-central-1_EUZ4iEF1T',
					LastModifiedDate: 1739530218.869,
					MfaConfiguration: 'OFF',
					Name: 'UserPoolTwo',
				},
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_EUZ4iEF1T',
				Filter: 'sub = "43045822-80e1-70f6-582d-78ae7992e9d9"',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListUsers')
			.reply(200, {
				Users: [
					{
						Username: '43045822-80e1-70f6-582d-78ae7992e9d9',
						Attributes: [
							{ Name: 'email', Value: 'UserSimple' },
							{ Name: 'Sub', Value: '43045822-80e1-70f6-582d-78ae7992e9d9' },
							{ Name: 'Enabled', Value: true },
							{ Name: 'UserCreateDate', Value: 1736343033.226 },
							{ Name: 'UserLastModifiedDate', Value: 1736343033.226 },
							{ Name: 'UserStatus', Value: 'FORCE_CHANGE_PASSWORD' },
						],
					},
				],
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_EUZ4iEF1T',
				Username: '43045822-80e1-70f6-582d-78ae7992e9d9',
				UserAttributes: [
					{
						Name: 'address',
						Value: 'New',
					},
				],
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes')
			.reply(200, {});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['update.workflow.json'],
		credentials: {
			aws: {
				region: 'eu-central-1',
				accessKeyId: 'test',
				secretAccessKey: 'test',
			},
		},
	});
});
