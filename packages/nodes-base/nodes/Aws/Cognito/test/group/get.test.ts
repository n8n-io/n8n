import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('AWS Cognito - Get Group', () => {
	beforeEach(() => {
		const baseUrl = 'https://cognito-idp.eu-central-1.amazonaws.com/';
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_qqle3XBUA',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.DescribeUserPool')
			.reply(200, {
				UserPool: {
					Arn: 'arn:aws:cognito-idp:eu-central-1:123456789012:userpool/eu-central-1_qqle3XBUA',
					CreationDate: 1739530218.869,
					DeletionProtection: 'INACTIVE',
					EstimatedNumberOfUsers: 4,
					Id: 'eu-central-1_qqle3XBUA',
					LastModifiedDate: 1739530218.869,
					MfaConfiguration: 'OFF',
					Name: 'UserPoolThree',
				},
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_qqle3XBUA',
				Limit: 50,
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListGroups')
			.reply(200, {
				Groups: [
					{
						CreationDate: 1741609269.287,
						GroupName: 'MyNewGroup2',
						LastModifiedDate: 1741609269.287,
						UserPoolId: 'eu-central-1_qqle3XBUA',
					},
				],
			});
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_qqle3XBUA',
				GroupName: 'MyNewGroup2',
				Limit: 50,
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListUsersInGroup')
			.reply(200, {
				Users: [],
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_qqle3XBUA',
				GroupName: 'MyNewGroup2',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.GetGroup')
			.reply(200, {
				Group: {
					CreationDate: 1741609269.287,
					GroupName: 'MyNewGroup2',
					LastModifiedDate: 1741609269.287,
					UserPoolId: 'eu-central-1_qqle3XBUA',
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
