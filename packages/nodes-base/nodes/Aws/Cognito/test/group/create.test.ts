import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Create Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('create.workflow.json'),
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
				GroupName: 'MyNewGroup11',
			})
			.reply(200, {
				Group: {
					GroupName: 'MyNewGroup11',
					UserPoolId: 'eu-central-1_qqle3XBUA',
					CreationDate: 1743068959.243,
					LastModifiedDate: 1743068959.243,
				},
			});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
