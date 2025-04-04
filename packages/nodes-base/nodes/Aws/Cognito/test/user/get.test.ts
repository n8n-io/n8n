import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Get User', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should retrieve user details and describe user pool', () => {
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
							Username: '0394e8e2-5081-7020-06bd-44bdfc84dd10',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.AdminGetUser',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							User: {
								Enabled: true,
								UserAttributes: [
									{
										Name: 'sub',
										Value: '0394e8e2-5081-7020-06bd-44bdfc84dd10',
									},
								],
								UserCreateDate: 1739528018.102,
								UserLastModifiedDate: 1740655109.821,
								UserStatus: 'FORCE_CHANGE_PASSWORD',
								Username: 'UserSimple',
							},
						},
					},
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
								Arn: 'arn:aws:cognito-idp:eu-central-1:130450532146:userpool/eu-central-1_W3WwpiBXV',
								CreationDate: 1739527771.267,
								DeletionProtection: 'INACTIVE',
								EstimatedNumberOfUsers: 8,
								Id: 'eu-central-1_W3WwpiBXV',
								LastModifiedDate: 1739527771.267,
								MfaConfiguration: 'OFF',
								Name: 'UserPoolSimple',
							},
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
