import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

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

		const baseUrl = 'https://iam.amazonaws.com/';
		nock.cleanAll();
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post(`/?Action=GetGroup&Version=${CURRENT_VERSION}&GroupName=GroupTest1`)
			.reply(200, {
				GetGroupResponse: {
					GetGroupResult: {
						Users: [{ UserName: 'User1' }, { UserName: 'User2' }],
					},
				},
			});
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post(
				`/?Action=RemoveUserFromGroup&Version=${CURRENT_VERSION}&GroupName=GroupTest1&UserName=User1`,
			)
			.reply(200, {});
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post(`/?Action=DeleteGroup&Version=${CURRENT_VERSION}&GroupName=GroupTest1`)
			.reply(200, {
				DeleteGroupResponse: {
					ResponseMetadata: {
						RequestId: '03eee660-ffc4-46ff-81ec-13e4cfc3aee8',
					},
				},
			});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
