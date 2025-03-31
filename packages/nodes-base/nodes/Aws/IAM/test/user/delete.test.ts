import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Delete User', () => {
	const workflows = ['nodes/Aws/Iam/test/user/delete.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should delete a user after removing from all groups', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=GetUser&Version=${CURRENT_VERSION}&UserName=JohnThis10`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							GetUserResponse: {
								GetUserResult: {
									User: {
										UserName: 'JohnThis10',
									},
								},
							},
						},
					},
					{
						method: 'post',
						path: `/?Action=ListGroups&Version=${CURRENT_VERSION}`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							ListGroupsResponse: {
								ListGroupsResult: {
									Groups: [{ GroupName: 'GroupA' }],
								},
							},
						},
					},
					{
						method: 'post',
						path: `/?Action=GetGroup&Version=${CURRENT_VERSION}&GroupName=GroupA`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							GetGroupResponse: {
								GetGroupResult: {
									Users: [{ UserName: 'JohnThis10' }],
								},
							},
						},
					},
					{
						method: 'post',
						path: `/?Action=RemoveUserFromGroup&Version=${CURRENT_VERSION}&GroupName=GroupA&UserName=JohnThis10`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							ResponseMetadata: {
								RequestId: 'remove-groupA-id',
							},
						},
					},
					{
						method: 'post',
						path: `/?Action=DeleteUser&Version=${CURRENT_VERSION}&UserName=JohnThis10`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							DeleteUserResponse: {
								ResponseMetadata: {
									RequestId: '44c7c6c0-260b-4dfd-beee-2cce8f05bed3',
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
