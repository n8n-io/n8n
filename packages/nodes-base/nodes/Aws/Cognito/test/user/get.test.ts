import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('AWS Cognito - Get User', () => {
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
					Name: 'UserPoolSimple',
				},
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_EUZ4iEF1T',
				Filter: 'sub = "b30498c2-d0f1-70a8-4b0c-3da25a3b998f"',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListUsers')
			.reply(200, {
				Users: [
					{
						Username: 'userName10',
						UserAttributes: [
							{ Name: 'sub', Value: 'b30498c2-d0f1-70a8-4b0c-3da25a3b998f' },
							{ Name: 'family_name', Value: 'New FamilyName 2' },
						],
						UserCreateDate: 1744206331.569,
						UserLastModifiedDate: 1744206366.034,
						Enabled: true,
						UserStatus: 'FORCE_CHANGE_PASSWORD',
					},
				],
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_EUZ4iEF1T',
				Username: 'userName10',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.AdminGetUser')
			.reply(200, {
				Username: 'userName10',
				UserAttributes: [
					{ Name: 'sub', Value: 'b30498c2-d0f1-70a8-4b0c-3da25a3b998f' },
					{ Name: 'family_name', Value: 'New FamilyName 2' },
				],
				UserCreateDate: 1744206331.569,
				UserLastModifiedDate: 1744206366.034,
				Enabled: true,
				UserStatus: 'FORCE_CHANGE_PASSWORD',
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
