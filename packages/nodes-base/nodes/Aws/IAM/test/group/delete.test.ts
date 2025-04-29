import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';
import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Delete Group', () => {
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

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
