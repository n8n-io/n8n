import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';
import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Delete user', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('delete.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}

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

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
