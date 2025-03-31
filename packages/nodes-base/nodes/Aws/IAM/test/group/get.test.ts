import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Get Group', () => {
	const workflows = ['nodes/Aws/Iam/test/group/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should retrieve group details along with its users', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=GetGroup&Version=${CURRENT_VERSION}&GroupName=GroupNameUpdated2`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							GetGroupResponse: {
								GetGroupResult: {
									Group: {
										Arn: 'arn:aws:iam::130450532146:group/New/Path/GroupNameUpdated2',
										CreateDate: 1739193696,
										GroupId: 'AGPAR4X3VE4ZKHNKBQHBZ',
										GroupName: 'GroupNameUpdated2',
										Path: '/New/Path/',
									},
									Users: [
										{
											Arn: 'arn:aws:iam::130450532146:user/rhis/path/Jonas',
											CreateDate: 1739198295,
											PasswordLastUsed: null,
											PermissionsBoundary: null,
											Tags: null,
											Path: '/rhis/path/',
											UserId: 'AIDAR4X3VE4ZDJJFKI6OU',
											UserName: 'Jonas',
										},
									],
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
