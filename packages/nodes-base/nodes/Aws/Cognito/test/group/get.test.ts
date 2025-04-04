import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Get Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('get.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}

		const baseUrl = 'https://cognito-idp.eu-central-1.amazonaws.com/';
		nock.cleanAll();
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_qqle3XBUA',
				GroupName: 'MyNewGroup2',
			})
			.reply(200, {
				Group: {
					GroupName: 'MyNewGroup2',
					UserPoolId: 'eu-central-1_qqle3XBUA',
					CreationDate: 1741609269.287,
					LastModifiedDate: 1741609269.287,
				},
			});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
