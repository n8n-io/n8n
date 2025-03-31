import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Remove User From Group', () => {
	const workflows = ['nodes/Aws/Iam/test/user/removeFromGroup.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should remove a user from a group', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=RemoveUserFromGroup&Version=${CURRENT_VERSION}&UserName=UserTest1&GroupName=GroupCreatedAfter`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							RemoveUserFromGroupResponse: {
								ResponseMetadata: {
									RequestId: '48508b51-1506-496c-8455-7135269209f0',
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
