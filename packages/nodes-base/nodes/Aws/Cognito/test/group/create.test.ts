import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Create Group', () => {
	const workflows = ['nodes/AWS/Cognito/test/group/create.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should create a new group in the user pool', () => {
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
							UserPoolId: 'eu-central-1_qqle3XBUA',
							GroupName: 'MyNewGroup11',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.CreateGroup',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							Group: {
								GroupName: 'MyNewGroup11',
								UserPoolId: 'eu-central-1_qqle3XBUA',
								CreationDate: 1743068959.243,
								LastModifiedDate: 1743068959.243,
							},
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
