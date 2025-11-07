import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Add User to Group', () => {
	beforeEach(() => {
		const baseUrl = 'https://iam.amazonaws.com/';
		nock.cleanAll();
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'AddUserToGroup',
				Version: CURRENT_VERSION,
				UserName: 'Jonas',
				GroupName: 'GroupNameUpdated2',
			})
			.reply(200, {
				AddUserToGroupResponse: {
					ResponseMetadata: {
						RequestId: '8192250c-9225-4903-af62-a521ce939968',
					},
				},
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['addToGroup.workflow.json'],
		credentials: {
			aws: {
				region: 'eu-central-1',
				accessKeyId: 'test',
				secretAccessKey: 'test',
			},
		},
	});
});
