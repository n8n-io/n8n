import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Create Group', () => {
	const workflows = ['nodes/Aws/Iam/test/group/create.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should create a new group in AWS IAM', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://iam.amazonaws.com/',
				mocks: [
					{
						method: 'post',
						path: `/?Action=CreateGroup&Version=${CURRENT_VERSION}&GroupName=NewGroupTest`,
						statusCode: 200,
						requestHeaders: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						requestBody: '',
						responseBody: {
							CreateGroupResponse: {
								CreateGroupResult: {
									Group: {
										GroupName: 'NewGroupTest',
										Arn: 'arn:aws:iam::130450532146:group/NewGroupTest',
										GroupId: 'AGPAR4X3VE4ZI7H42C2XW',
										Path: '/',
										CreateDate: 1743409792,
									},
								},
								ResponseMetadata: {
									RequestId: '50bf4fdb-34b9-4c99-8da8-358d50783c8d',
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
