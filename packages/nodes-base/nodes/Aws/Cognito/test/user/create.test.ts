import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('AWS Cognito - Create User', () => {
	beforeEach(() => {
		const baseUrl = 'https://cognito-idp.eu-central-1.amazonaws.com/';
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_W3WwpiBXV',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.DescribeUserPool')
			.reply(200, {
				UserPool: {
					Id: 'eu-central-1_W3WwpiBXV',
					Name: 'MyUserPool',
					CreationDate: 1627891230,
				},
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_W3WwpiBXV',
				Username: 'Johnn12',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.AdminCreateUser')
			.reply(200, {
				User: {
					Username: 'Johnn12',
					UserStatus: 'FORCE_CHANGE_PASSWORD',
					Attributes: [
						{
							Name: 'sub',
							Value: '03d43812-00c1-7098-075e-8a535fdefc1b',
						},
					],
					UserCreateDate: 1743068750.761,
					UserLastModifiedDate: 1743068750.761,
					Enabled: true,
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
