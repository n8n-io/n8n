import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Update User', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/update.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should update user attributes in the user pool', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.us-east-1.amazonaws.com/',
				mocks: [
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'us-east-1_RbwZXygrI',
							Username: 'a4583478-f091-7038-7681-b00374bc1ed4',
							UserAttributes: [
								{
									Name: 'address',
									Value: 'New',
								},
							],
						},
						requestHeaders: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							Message: 'Successfully updated user attributes',
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
