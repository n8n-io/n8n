import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('User - User Creation', () => {
	const workflows = ['nodes/AWS/Cognito/test/user/create.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should create user in the user pool', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com/',
				mocks: [
					{
						method: 'post',
						path: '/create-user',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'user-pool-id',
							Username: 'user1',
							MessageAction: 'RESEND',
							ForceAliasCreation: false,
							DesiredDeliveryMediums: ['SMS'],
							TemporaryPassword: 'TempPassword123',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.CreateUser',
						},
						responseBody: {
							User: {
								Username: 'user1',
								UserPoolId: 'user-pool-id',
								Status: 'SUCCESS',
							},
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
