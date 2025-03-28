import * as Helpers from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Get User', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/get.workflow.json'];
	const workflowTests = Helpers.workflowToTests(workflows);

	describe('should fetch user data', () => {
		const nodeTypes = Helpers.setup(workflowTests);

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
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminGetUser',
						},
						requestBody: JSON.stringify({
							UserPoolId: 'eu-central-1_EUZ4iEF1T',
							Username: 'Johnn',
						}),
						responseBody: {
							Username: 'Johnn',
							Enabled: true,
							UserAttributes: [
								{
									Name: 'sub',
									Value: '43045822-80e1-70f6-582d-78ae7992e9d9',
								},
							],
							UserCreateDate: 1742928038.451,
							UserLastModifiedDate: 1742928038.451,
							UserStatus: 'FORCE_CHANGE_PASSWORD',
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-amz-json-1.1',
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool',
						},
						requestBody: JSON.stringify({
							UserPoolId: 'eu-central-1_EUZ4iEF1T',
						}),
						responseBody: {
							UserPool: {
								Id: 'eu-central-1_EUZ4iEF1T',
								Name: 'UserPoolTwo',
								Status: 'ACTIVE',
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
						requestBody: JSON.stringify({
							UserPoolId: 'eu-central-1_EUZ4iEF1T',
							MaxResults: 60,
						}),
						responseBody: {
							Users: [
								{
									Username: 'Johnn',
									Attributes: [
										{
											Name: 'sub',
											Value: '43045822-80e1-70f6-582d-78ae7992e9d9',
										},
									],
									UserStatus: 'FORCE_CHANGE_PASSWORD',
								},
							],
						},
					},
				],
			};

			test(workflow.description, async () => await Helpers.equalityTest(workflow, nodeTypes));
		}
	});
});
