import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Create User', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/create.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should create user in the user pool', () => {
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
							UserPoolId: 'eu-central-1_W3WwpiBXV',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.DescribeUserPool',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							UserPool: {
								Id: 'eu-central-1_W3WwpiBXV',
								Name: 'MyUserPool',
								CreationDate: 1627891230,
							},
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'eu-central-1_W3WwpiBXV',
							Username: 'Johnn12',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.AdminCreateUser',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							User: {
								Username: 'Johnn12',
								UserStatus: 'FORCE_CHANGE_PASSWORD',
								Attributes: [
									{
										Name: 'sub',
										Value: '03d43812-00c1-7098-075e-8a535fdefc1b',
									},
								],
								UserCreateDate: 1743068750.761,
								UserLastModifiedDate: 1743068750.761,
								Enabled: true,
							},
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
