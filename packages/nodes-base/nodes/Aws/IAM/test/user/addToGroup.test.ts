import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Add User to Group', () => {
	const workflows = ['nodes/Aws/Iam/test/user/addToGroup.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should add user to group', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=AddUserToGroup&Version=${CURRENT_VERSION}&UserName=Jonas&GroupName=GroupNameUpdated2`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							AddUserToGroupResponse: {
								ResponseMetadata: {
									RequestId: '8192250c-9225-4903-af62-a521ce939968',
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
