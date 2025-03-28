import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Update Group', () => {
	const workflows = ['nodes/AwS/Cognito/test/group/update.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should update the group details in the user pool', () => {
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
							GroupName: 'MyNewTesttttt',
							Description: 'Updated description',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.UpdateGroup',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							Group: {
								GroupName: 'MyNewTesttttt',
								UserPoolId: 'eu-central-1_KkXQgdCJv',
								Description: 'Updated description',
							},
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
