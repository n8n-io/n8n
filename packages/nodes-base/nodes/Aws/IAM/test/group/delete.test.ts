import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Delete Group', () => {
	const workflows = ['nodes/Aws/Iam/test/group/delete.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should delete IAM group successfully', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=GetGroup&Version=${CURRENT_VERSION}&GroupName=GroupTest1`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							GetGroupResponse: {
								GetGroupResult: {
									Users: [{ UserName: 'User1' }, { UserName: 'User2' }],
								},
							},
						},
					},
					{
						method: 'post',
						path: `/?Action=RemoveUserFromGroup&Version=${CURRENT_VERSION}&GroupName=GroupTest1&UserName=User1`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {},
					},
					{
						method: 'post',
						path: `/?Action=RemoveUserFromGroup&Version=${CURRENT_VERSION}&GroupName=GroupTest1&UserName=User2`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {},
					},
					{
						method: 'post',
						path: `/?Action=DeleteGroup&Version=${CURRENT_VERSION}&GroupName=GroupTest1`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							DeleteGroupResponse: {
								ResponseMetadata: {
									RequestId: '03eee660-ffc4-46ff-81ec-13e4cfc3aee8',
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
