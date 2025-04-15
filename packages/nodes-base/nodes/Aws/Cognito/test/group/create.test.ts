import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Create Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('create.workflow.json'),
	);

	beforeEach(() => {
		const baseUrl = 'https://cognito-idp.eu-central-1.amazonaws.com/';
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

	testWorkflows(workflows);
});
