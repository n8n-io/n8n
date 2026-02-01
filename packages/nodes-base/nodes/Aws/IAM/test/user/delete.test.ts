import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Delete user', () => {
	beforeEach(() => {
		nock.cleanAll();
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'GetUser',
				Version: CURRENT_VERSION,
				UserName: 'JohnThis10',
			})
			.reply(200, {
				GetUserResponse: {
					GetUserResult: {
						User: {
							UserName: 'JohnThis10',
						},
					},
				},
			});
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'ListGroups',
				Version: CURRENT_VERSION,
			})
			.reply(200, {
				ListGroupsResponse: {
					ListGroupsResult: {
						Groups: [{ GroupName: 'GroupA' }],
					},
				},
			});
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'GetGroup',
				Version: CURRENT_VERSION,
				GroupName: 'GroupA',
			})
			.reply(200, {
				GetGroupResponse: {
					GetGroupResult: {
						Users: [{ UserName: 'JohnThis10' }],
					},
				},
			});
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'RemoveUserFromGroup',
				Version: CURRENT_VERSION,
				GroupName: 'GroupA',
				UserName: 'JohnThis10',
			})
			.reply(200, {
				ResponseMetadata: {
					RequestId: 'remove-groupA-id',
				},
			});
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'DeleteUser',
				Version: CURRENT_VERSION,
				UserName: 'JohnThis10',
			})
			.reply(200, {
				DeleteUserResponse: {
					ResponseMetadata: {
						RequestId: '44c7c6c0-260b-4dfd-beee-2cce8f05bed3',
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
