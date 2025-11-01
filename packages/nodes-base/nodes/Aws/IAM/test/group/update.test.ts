import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM -  Update Group', () => {
	beforeEach(() => {
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'UpdateGroup',
				Version: CURRENT_VERSION,
				GroupName: 'GroupNameUpdated',
				NewGroupName: 'GroupNameUpdated2',
			})
			.reply(200, {
				UpdateGroupResponse: {
					ResponseMetadata: {
						RequestId: '16ada465-a981-44ab-841f-3ca3247f7405',
					},
				},
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['update.workflow.json'],
		credentials: {
			aws: {
				region: 'eu-central-1',
				accessKeyId: 'test',
				secretAccessKey: 'test',
			},
		},
	});
});
