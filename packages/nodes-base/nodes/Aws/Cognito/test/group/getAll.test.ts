import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('Group - Get All Groups', () => {
	const workflows = ['nodes/AWS/Cognito/test/group/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should retrieve all groups from the user pool', () => {
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
							Limit: 20,
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListGroups',
						},
						responseBody: {
							Groups: [
								{ GroupName: 'Admins', Description: 'Admin group' },
								{ GroupName: 'Developers', Description: 'Developer group' },
							],
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});

	describe('should retrieve all groups including users', () => {
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
							Limit: 20,
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListGroups',
						},
						responseBody: {
							Groups: [
								{ GroupName: 'Admins', Description: 'Admin group' },
								{ GroupName: 'Developers', Description: 'Developer group' },
							],
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListUsersInGroup',
						},
						requestBody: {
							UserPoolId: 'eu-central-1_ab12cdefgh',
							GroupName: 'Admins',
						},
						responseBody: {
							Users: [
								{
									Username: 'admin1',
									Attributes: [{ Name: 'email', Value: 'admin1@example.com' }],
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
