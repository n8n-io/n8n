import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/delete.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should delete a user', () => {
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
							'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminDeleteUser',
						},
						responseBody: {
							Status: 'SUCCESS',
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
