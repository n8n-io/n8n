import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('User - Get All Users', () => {
	const workflows = ['nodes/AWS/Cognito/test/user/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should retrieve all users from the user pool', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com/',
				mocks: [
					{
						method: 'post',
						path: '/list-users',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'user-pool-id',
							Limit: 20,
							Filter: '"email"^="user@example.com"',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListUsers',
						},
						responseBody: {
							Users: [
								{
									Username: 'user1',
									Attributes: [
										{ Name: 'email', Value: 'user1@example.com' },
										{ Name: 'phone_number', Value: '+1234567890' },
									],
								},
								{
									Username: 'user2',
									Attributes: [
										{ Name: 'email', Value: 'user2@example.com' },
										{ Name: 'phone_number', Value: '+1234567891' },
									],
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
