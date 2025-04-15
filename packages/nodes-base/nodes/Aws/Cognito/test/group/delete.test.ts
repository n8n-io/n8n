import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Delete Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('delete.workflow.json'),
	);

	beforeEach(() => {
		const baseUrl = 'https://cognito-idp.eu-central-1.amazonaws.com/';
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_qqle3XBUA',
				GroupName: 'MyNewGroup22',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.DeleteGroup')
			.reply(200, {
				Group: {
					GroupName: 'MyNewGroup22',
					UserPoolId: 'eu-central-1_qqle3XBUA',
					CreationDate: 1743068959.243,
					LastModifiedDate: 1743068959.243,
				},
			});
	});

	testWorkflows(workflows);
});
