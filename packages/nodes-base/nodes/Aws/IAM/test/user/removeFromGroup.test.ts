import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Remove User From Group', () => {
	beforeEach(() => {
		nock.cleanAll();
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'RemoveUserFromGroup',
				Version: CURRENT_VERSION,
				UserName: 'UserTest1',
				GroupName: 'GroupCreatedAfter',
			})
			.reply(200, {
				RemoveUserFromGroupResponse: {
					ResponseMetadata: {
						RequestId: '48508b51-1506-496c-8455-7135269209f0',
					},
				},
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['removeFromGroup.workflow.json'],
		credentials: {
			aws: {
				region: 'eu-central-1',
				accessKeyId: 'test',
				secretAccessKey: 'test',
			},
		},
	});
});
