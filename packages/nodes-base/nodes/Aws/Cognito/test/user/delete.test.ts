import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('User - User Deletion', () => {
	const workflows = ['nodes/AWS/Cognito/test/user/delete.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should delete user from the user pool', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com/',
				mocks: [
					{
						method: 'post',
						statusCode: 200,
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.AdminDeleteUser',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						requestBody: {
							UserPoolId: 'user-pool-id',
							Username: 'user-to-delete',
						},
						responseBody: {
							Status: 'SUCCESS', // Mock success response
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
