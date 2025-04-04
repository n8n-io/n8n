import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Add User to Group', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/addToGroup.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should add user to group in the user pool', () => {
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
							GroupName: 'MyNewGroup3',
						},
						requestHeaders: {
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminAddUserToGroup',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						responseBody: {},
					},
				],
			};

			test(workflow.description, async () => {
				await equalityTest(workflow, nodeTypes);
			});
		}
	});
});
