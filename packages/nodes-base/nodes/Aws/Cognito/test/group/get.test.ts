import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Get Group', () => {
	const workflows = ['nodes/Aws/Cognito/test/group/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should retrieve group details from the user pool', () => {
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
							UserPoolId: 'eu-central-1_EUZ4iEF1T',
							GroupName: 'MyNewGroup',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.GetGroup',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							Group: {
								GroupName: 'MyNewGroup',
								Description: 'This is a new group',
								Precedence: 10,
								CreationDate: 1742927877.679,
								LastModifiedDate: 1742927877.679,
								UserPoolId: 'eu-central-1_EUZ4iEF1T',
							},
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
