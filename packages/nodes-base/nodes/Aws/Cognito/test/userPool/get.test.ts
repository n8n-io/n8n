import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Get User Pool', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should get user pool details', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-amz-json-1.1',
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool',
						},
						requestBody: {
							UserPoolId: 'eu-central-1_EUZ4iEF1T',
						},
						responseBody: {
							UserPool: {
								Id: 'eu-central-1_EUZ4iEF1T',
								Name: 'UserPoolSimple',
								Status: 'ACTIVE',
								CreationDate: 1739527771.267,
								LastModifiedDate: 1739527771.267,
								MfaConfiguration: 'OFF',
								DeletionProtection: 'INACTIVE',
								EstimatedNumberOfUsers: 6,
								Arn: 'arn:aws:cognito-idp:eu-central-1:130450532146:userpool/eu-central-1_EUZ4iEF1T',
							},
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-amz-json-1.1',
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers',
						},
						requestBody: {
							UserPoolId: 'eu-central-1_EUZ4iEF1T',
							MaxResults: 60,
						},
						responseBody: {
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
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-amz-json-1.1',
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminGetUser',
						},
						requestBody: {
							UserPoolId: 'eu-central-1_EUZ4iEF1T',
						},
						responseBody: {
							Username: 'Johnn',
							Enabled: true,
							UserAttributes: [{ Name: 'sub', Value: '43045822-80e1-70f6-582d-78ae7992e9d9' }],
							UserCreateDate: 1742928038.451,
							UserLastModifiedDate: 1742928038.451,
							UserStatus: 'FORCE_CHANGE_PASSWORD',
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
