import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Create User', () => {
	const workflows = ['nodes/Aws/Iam/test/user/create.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should create a user and add tags', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=CreateUser&Version=${CURRENT_VERSION}&UserName=JohnThis101&Tags.member.1.Key=Department&Tags.member.1.Value=Engineeering`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							CreateUserResponse: {
								CreateUserResult: {
									User: {
										Arn: 'arn:aws:iam::130450532146:user/JohnThis101',
										CreateDate: 1743425541,
										PasswordLastUsed: null,
										Path: '/',
										PermissionsBoundary: null,
										Tags: [
											{
												Key: 'Department',
												Value: 'Engineeering',
											},
										],
										UserId: 'AIDAR4X3VE4ZFWNR5KDFE',
										UserName: 'JohnThis101',
									},
								},
								ResponseMetadata: {
									RequestId: 'b5e15ba7-230a-4297-becf-0a3cfe5129ae',
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
