import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('User - Get User', () => {
	const workflows = ['nodes/AWS/Cognito/test/user/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should retrieve user details from the user pool', () => {
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
							UserPoolId: 'eu-central-1_ab12cdefgh',
							Username: 'user-to-retrieve',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.AdminGetUser',
						},
						responseBody: {
							Username: 'user-to-retrieve',
							UserAttributes: [
								{
									Name: 'email',
									Value: 'user-to-retrieve@example.com',
								},
								{
									Name: 'phone_number',
									Value: '+1234567890',
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
