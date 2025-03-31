import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Get All Users', () => {
	const workflows = ['nodes/Aws/Iam/test/user/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should retrieve all IAM users', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=ListUsers&Version=${CURRENT_VERSION}&MaxItems=50`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							ListUsersResponse: {
								ListUsersResult: {
									Users: [
										{
											Arn: 'arn:aws:iam::130450532146:user/Johnnn',
											UserName: 'Johnnn',
											UserId: 'AIDAR4X3VE4ZAJGXLCVOP',
											Path: '/',
											CreateDate: 1739198010,
											PasswordLastUsed: null,
											PermissionsBoundary: null,
											Tags: null,
										},
										{
											Arn: 'arn:aws:iam::130450532146:user/rhis/path/Jonas',
											UserName: 'Jonas',
											UserId: 'AIDAR4X3VE4ZDJJFKI6OU',
											Path: '/rhis/path/',
											CreateDate: 1739198295,
											PasswordLastUsed: null,
											PermissionsBoundary: null,
											Tags: null,
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
