import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Create Group', () => {
	beforeEach(() => {
		nock.cleanAll();
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'CreateGroup',
				Version: CURRENT_VERSION,
				GroupName: 'NewGroupTest',
			})
			.reply(200, {
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
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
		credentials: {
			aws: {
				region: 'eu-central-1',
				accessKeyId: 'test',
				secretAccessKey: 'test',
			},
		},
	});
});
