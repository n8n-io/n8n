import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Get All Groups', () => {
	const workflows = ['nodes/Aws/Iam/test/group/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should retrieve all IAM groups along with their users', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=ListGroups&Version=${CURRENT_VERSION}&MaxItems=50`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						responseBody: {
							ListGroupsResponse: {
								ListGroupsResult: {
									Groups: [
										{
											Arn: 'arn:aws:iam::130450532146:group/test/Admin7',
											CreateDate: 1733436631,
											GroupId: 'AGPAR4X3VE4ZAFFY5EDUJ',
											GroupName: 'Admin7',
											Path: '/test/',
										},
										{
											Arn: 'arn:aws:iam::130450532146:group/cognito',
											CreateDate: 1730804196,
											GroupId: 'AGPAR4X3VE4ZMVEFLBSRB',
											GroupName: 'cognito',
											Path: '/',
										},
										{
											Arn: 'arn:aws:iam::130450532146:group/GroupCreatedAfter',
											CreateDate: 1741589366,
											GroupId: 'AGPAR4X3VE4ZF5VE6UF2U',
											GroupName: 'GroupCreatedAfter',
											Path: '/',
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
