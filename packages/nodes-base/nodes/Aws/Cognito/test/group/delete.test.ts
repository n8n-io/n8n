import nock from 'nock';
import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Delete Group', () => {
	const workflows = ['nodes/AWS/Cognito/test/group/delete.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		// Ensure nock is active before tests run
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('should fetch and then delete a group from the user pool', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com/',
				mocks: [
					// First: Fetch the group details
					{
						method: 'get',
						path: '/',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'eu-central-1_ab12cdefgh',
							GroupName: 'Admins',
						},
						requestOptions: {
							headers: {
								'X-Amz-Target': 'AWSCognitoIdentityProviderService.GetGroup',
								'Content-Type': 'application/x-amz-json-1.1',
							},
						},
						responseBody: {
							Group: {
								GroupName: 'Admins',
								Description: 'Administrator group',
								Precedence: 1,
								RoleArn: 'arn:aws:iam::123456789012:role/AdminsRole',
							},
						},
					},

					// Then: Delete the group
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'eu-central-1_ab12cdefgh',
							GroupName: 'Admins',
						},
						requestOptions: {
							headers: {
								'X-Amz-Target': 'AWSCognitoIdentityProviderService.DeleteGroup',
								'Content-Type': 'application/x-amz-json-1.1',
							},
						},
						responseBody: {},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
