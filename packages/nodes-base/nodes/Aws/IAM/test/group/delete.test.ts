import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Delete Group', () => {
	beforeEach(() => {
		nock.cleanAll();
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'GetGroup',
				Version: CURRENT_VERSION,
				GroupName: 'GroupForTest1',
			})
			.reply(200, {
				GetGroupResponse: {
					GetGroupResult: {
						Users: [{ UserName: 'User1' }],
					},
				},
			});
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'RemoveUserFromGroup',
				Version: CURRENT_VERSION,
				GroupName: 'GroupForTest1',
				UserName: 'User1',
			})
			.reply(200, {});
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'DeleteGroup',
				Version: CURRENT_VERSION,
				GroupName: 'GroupForTest1',
			})
			.reply(200, {
				DeleteGroupResponse: {
					ResponseMetadata: {
						RequestId: 'b9cc2642-db2c-4935-aaaf-eacf10e4f00a',
					},
				},
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['delete.workflow.json'],
		credentials: {
			aws: {
				region: 'eu-central-1',
				accessKeyId: 'test',
				secretAccessKey: 'test',
			},
		},
	});
});
