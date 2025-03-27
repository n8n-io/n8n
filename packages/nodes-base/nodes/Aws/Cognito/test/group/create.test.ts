import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('Group - Create Group', () => {
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
							UserPoolId: 'eu-central-1_ab12cdefgh',
							GroupName: 'MyNewGroup',
							Description: 'New group description',
							Precedence: 10,
							Arn: 'arn:aws:iam::123456789012:role/GroupRole',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.CreateGroup',
						},
						responseBody: {
							Group: {
								GroupName: 'MyNewGroup',
								UserPoolId: 'eu-central-1_ab12cdefgh',
								Description: 'New group description',
								Precedence: 10,
								RoleArn: 'arn:aws:iam::123456789012:role/GroupRole',
							},
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
