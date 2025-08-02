import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Update User', () => {
	beforeEach(() => {
		nock.cleanAll();
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'UpdateUser',
				Version: CURRENT_VERSION,
				UserName: 'NewUser',
				NewUserName: 'UserTest',
			})
			.reply(200, {
				UpdateUserResponse: {
					ResponseMetadata: {
						RequestId: 'bdb4a8b5-627a-41a7-aba9-5733b7869c16',
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
