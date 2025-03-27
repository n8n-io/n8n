import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('Group - Update Group', () => {
	const workflows = ['nodes/AWS/Cognito/test/group/update.workflow.json'];
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
							UserPoolId: 'eu-central-1_ab12cdefgh',
							GroupName: 'Admins',
							Description: 'Updated group description',
							Precedence: 10,
							Arn: 'arn:aws:iam::123456789012:role/UpdatedGroupRole',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.UpdateGroup',
						},
						responseBody: {
							Group: {
								GroupName: 'Admins',
								UserPoolId: 'eu-central-1_ab12cdefgh',
								Description: 'Updated group description',
								Precedence: 10,
								RoleArn: 'arn:aws:iam::123456789012:role/UpdatedGroupRole',
							},
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
