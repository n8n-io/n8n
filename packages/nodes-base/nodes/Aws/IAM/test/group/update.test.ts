import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '../../../../../test/nodes/Helpers';
import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM -  Update Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('update.workflow.json'),
	);

	beforeEach(() => {
		nock.cleanAll();
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

	testWorkflows(workflows);
});
