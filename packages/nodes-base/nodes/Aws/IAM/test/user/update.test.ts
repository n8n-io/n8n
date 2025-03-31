import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Update User', () => {
	const workflows = ['nodes/Aws/Iam/test/user/update.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should update user', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=UpdateUser&Version=${CURRENT_VERSION}&NewUserName=NewName&UserName=UserTest101`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							UpdateUserResponse: {
								ResponseMetadata: {
									RequestId: '3fee55bf-1157-4db2-a63c-eab6b6ec1b3b',
								},
							},
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
