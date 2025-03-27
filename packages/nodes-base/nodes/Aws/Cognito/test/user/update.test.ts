import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('User - User Update', () => {
	const workflows = ['nodes/AWS/Cognito/test/user/update.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should update the user in the user pool with new attributes', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com/',
				mocks: [
					{
						method: 'post',
						path: '/admin-update-user-attributes',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'user-pool-id',
							Username: 'user-to-update',
							UserAttributes: [
								{ Name: 'email', Value: 'new-email@example.com' },
								{ Name: 'phone_number', Value: '+1234567891' },
							],
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes',
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
