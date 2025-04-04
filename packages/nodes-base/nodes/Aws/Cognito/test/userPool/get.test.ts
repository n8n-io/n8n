import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Get User Pool', () => {
	const workflows = ['nodes/Aws/Cognito/test/userPool/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should retrieve user pool details', () => {
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
