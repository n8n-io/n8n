import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Remove From Group', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/removeFromGroup.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should remove a user from a group', () => {
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
							UserPoolId: 'eu-central-1_W3WwpiBXV',
							Username: '53f4c8d2-f0f1-70f3-7a5a-acead2a90731',
							GroupName: 'MyNewGroupSimple',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.AdminRemoveUserFromGroup',
							'content-type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							StatusCode: 200,
							Message: 'User removed from group successfully.',
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'eu-central-1_W3WwpiBXV',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.DescribeUserPool',
							'content-type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							UserPool: {
								Id: 'eu-central-1_W3WwpiBXV',
								Name: 'User Pool Simple',
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
							UserPoolId: 'eu-central-1_W3WwpiBXV',
							MaxResults: 60,
						},
						requestHeaders: {
							'content-type': 'application/x-amz-json-1.1',
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListUsers',
						},
						responseBody: {
							Users: [
								{
									Username: '53f4c8d2-f0f1-70f3-7a5a-acead2a90731',
									Attributes: [
										{ Name: 'email', Value: 'john.doe@example.com' },
										{ Name: 'Sub', Value: '53f4c8d2-f0f1-70f3-7a5a-acead2a90731' },
										{ Name: 'Enabled', Value: true },
										{ Name: 'UserCreateDate', Value: 1634122735.226 },
										{ Name: 'UserLastModifiedDate', Value: 1634122735.226 },
										{ Name: 'UserStatus', Value: 'FORCE_CHANGE_PASSWORD' },
									],
								},
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
							],
						},
					},
				],
			};

			test(workflow.description, async () => {
				await equalityTest(workflow, nodeTypes);
			});
		}
	});
});
