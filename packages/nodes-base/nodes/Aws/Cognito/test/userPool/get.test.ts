import nock from 'nock';
import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Get User Pool', () => {
	const workflows = ['nodes/AWS/Cognito/test/userPool/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('should retrieve a user pool', () => {
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
						},
						requestOptions: {
							headers: {
								'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool',
								'Content-Type': 'application/x-amz-json-1.1',
							},
						},
						responseBody: {
							UserPool: {
								Id: 'eu-central-1_ab12cdefgh',
								Name: 'MyUserPool',
								Arn: 'arn:aws:cognito-idp:eu-central-1:123456789012:userpool/eu-central-1_ab12cdefgh',
								Status: 'ACTIVE',
							},
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
