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
							UserPoolId: 'eu-central-1_KkXQgdCJv',
							Username: '13e4a832-a091-70f5-dfc8-0f62fca5da22',
							GroupName: 'MyNewTesttttt',
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
