import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Get All Users', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should retrieve all users from the user pool', () => {
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
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListUsers',
						},
						responseBody: {
							Users: [
								{
									Username: '034448d2-4011-7079-9474-9a4fccd4247a',
									Attributes: [
										{ Name: 'email', Value: 'FinalUser@gmail.com' },
										{ Name: 'Sub', Value: '034448d2-4011-7079-9474-9a4fccd4247a' },
										{ Name: 'Enabled', Value: true },
										{ Name: 'UserCreateDate', Value: 1736343033.226 },
										{ Name: 'UserLastModifiedDate', Value: 1736343033.226 },
										{ Name: 'UserStatus', Value: 'FORCE_CHANGE_PASSWORD' },
									],
								},
								{
									Username: '03a438f2-10d1-70f1-f45a-09753ab5c4c3',
									Attributes: [
										{ Name: 'email', Value: 'mail.this1@gmail.com' },
										{ Name: 'Sub', Value: '03a438f2-10d1-70f1-f45a-09753ab5c4c3' },
										{ Name: 'Enabled', Value: true },
										{ Name: 'UserCreateDate', Value: 1733746687.223 },
										{ Name: 'UserLastModifiedDate', Value: 1733746687.223 },
										{ Name: 'UserStatus', Value: 'FORCE_CHANGE_PASSWORD' },
									],
								},
								{
									Username: '03f438d2-b0f1-70bc-04d9-f6dd31f2d878',
									Attributes: [
										{ Name: 'email', Value: 'test3@gmail.com' },
										{ Name: 'Sub', Value: '03f438d2-b0f1-70bc-04d9-f6dd31f2d878' },
										{ Name: 'Enabled', Value: true },
										{ Name: 'UserCreateDate', Value: 1742928785.796 },
										{ Name: 'UserLastModifiedDate', Value: 1742928785.796 },
										{ Name: 'UserStatus', Value: 'FORCE_CHANGE_PASSWORD' },
									],
								},
							],
						},
					},
				],
			};

			test(workflow.description, async () => {
				await equalityTest(workflow, nodeTypes);
			});
		}
	});
});
