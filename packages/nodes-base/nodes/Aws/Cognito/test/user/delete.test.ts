import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Delete User', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/delete.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should delete user', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-amz-json-1.1',
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminDeleteUser',
						},
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
							Username: '63c44842-9021-70a9-0c39-9c0b8fe539b4',
						},
						responseBody: {
							Status: 'SUCCESS',
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-amz-json-1.1',
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool',
						},
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
						},
						responseBody: {
							UserPool: {
								Id: 'eu-central-1_KkXQgdCJv',
								Name: 'MyUserPool',
								CreationDate: 1627891230,
							},
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-amz-json-1.1',
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers',
						},
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
							MaxResults: 60,
						},
						responseBody: {
							Users: [],
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
