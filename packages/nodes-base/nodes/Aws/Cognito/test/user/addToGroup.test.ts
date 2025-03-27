import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('User - Add to Group', () => {
	const workflows = ['nodes/AWS/Cognito/test/user/addToGroup.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should add the user to the specified group', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com/',
				mocks: [
					{
						method: 'post',
						path: '/admin-add-user-to-group',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'user-pool-id',
							Username: 'user-to-add',
							GroupName: 'Admins',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.AdminAddUserToGroup',
						},
						responseBody: {
							Status: 'SUCCESS',
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
