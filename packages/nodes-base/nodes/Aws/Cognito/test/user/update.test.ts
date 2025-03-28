import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - User Update', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/update.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should update the user in the user pool with new attributes', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com/',
				mocks: [
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
							Username: '530408b2-d071-7071-ceb8-2f9612693faf',
							UserAttributes: [{ Name: 'address', Value: 'New Address 2' }],
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes',
							'content-type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							Status: 'SUCCESS',
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.DescribeUserPool',
							'content-type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							UserPool: {
								Id: 'eu-central-1_KkXQgdCJv',
								Name: 'Test User Pool',
								Status: 'ACTIVE',
								CreationDate: 1634122735,
								LastModifiedDate: 1634122735,
								LambdaConfig: {
									PreSignUp: 'arn:aws:lambda:eu-central-1:123456789012:function:PreSignUpFunction',
								},
								MfaConfiguration: 'OFF',
							},
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
							MaxResults: 60,
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListUsers',
							'content-type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							Users: [
								{
									Username: 'user1',
									Attributes: [{ Name: 'email', Value: 'user1@example.com' }],
								},
							],
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
