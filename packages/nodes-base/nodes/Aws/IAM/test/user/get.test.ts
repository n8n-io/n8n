import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Get User', () => {
	const workflows = ['nodes/Aws/Iam/test/user/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should retrieve an IAM user', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=GetUser&Version=${CURRENT_VERSION}&UserName=accounts@this.de`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							GetUserResponse: {
								GetUserResult: {
									User: {
										UserName: 'accounts@this.de',
										UserId: 'AIDAR4X3VE4ZANWXRN2L2',
										Arn: 'arn:aws:iam::130450532146:user/accounts@this.de',
										CreateDate: 1733911052,
										Path: '/',
										Tags: [
											{
												Key: 'AKIAR4X3VE4ZALQYFEMT',
												Value: 'API dev',
											},
										],
										PasswordLastUsed: null,
										PermissionsBoundary: null,
									},
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
