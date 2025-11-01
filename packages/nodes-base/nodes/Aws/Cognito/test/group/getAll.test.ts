import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('AWS Cognito - Get All Groups', () => {
	beforeEach(() => {
		const baseUrl = 'https://cognito-idp.eu-central-1.amazonaws.com/';

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_KkXQgdCJv',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListGroups')
			.reply(200, {
				Groups: [
					{
						GroupName: 'MyNewGroup',
						Description: 'Updated',
						CreationDate: 1732740693.563,
						LastModifiedDate: 1733422336.443,
						Precedence: 0,
						RoleArn: 'arn:aws:iam::123456789012:group/Admins',
						UserPoolId: 'eu-central-1_KkXQgdCJv',
						Users: [
							{
								Username: 'user1',
								Attributes: [{ Name: 'email', Value: 'user1@example.com' }],
							},
							{
								Username: 'user2',
								Attributes: [{ Name: 'email', Value: 'user2@example.com' }],
							},
						],
					},
					{
						GroupName: 'MyNewTesttttt',
						Description: 'Updated description',
						CreationDate: 1733424987.825,
						LastModifiedDate: 1741609241.742,
						Precedence: 5,
						UserPoolId: 'eu-central-1_KkXQgdCJv',
						Users: [],
					},
					{
						GroupName: 'MyNewTest1',
						Description: 'test',
						CreationDate: 1733398042.783,
						LastModifiedDate: 1733691256.447,
						Precedence: 5,
						UserPoolId: 'eu-central-1_KkXQgdCJv',
						Users: [],
					},
				],
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_KkXQgdCJv',
				GroupName: 'MyNewGroup',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListUsersInGroup')
			.reply(200, {
				Users: [],
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_KkXQgdCJv',
				GroupName: 'MyNewTesttttt',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListUsersInGroup')
			.reply(200, {
				Users: [],
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_KkXQgdCJv',
				GroupName: 'MyNewTest1',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListUsersInGroup')
			.reply(200, {
				Users: [],
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_KkXQgdCJv',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListGroups')
			.reply(200, {
				Groups: [
					{
						GroupName: 'MyNewGroup',
						Description: 'Updated',
						CreationDate: 1732740693.563,
						LastModifiedDate: 1733422336.443,
						Precedence: 0,
						RoleArn: 'arn:aws:iam::123456789012:group/Admins',
						UserPoolId: 'eu-central-1_KkXQgdCJv',
						Users: [],
					},
					{
						GroupName: 'MyNewTesttttt',
						Description: 'Updated description',
						CreationDate: 1733424987.825,
						LastModifiedDate: 1741609241.742,
						Precedence: 5,
						UserPoolId: 'eu-central-1_KkXQgdCJv',
						Users: [],
					},
					{
						GroupName: 'MyNewTest1',
						Description: 'test',
						CreationDate: 1733398042.783,
						LastModifiedDate: 1733691256.447,
						Precedence: 5,
						UserPoolId: 'eu-central-1_KkXQgdCJv',
						Users: [],
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
