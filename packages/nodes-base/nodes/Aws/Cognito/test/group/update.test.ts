import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Update Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('update.workflow.json'),
	);

	beforeEach(() => {
		const baseUrl = 'https://cognito-idp.eu-central-1.amazonaws.com/';

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_KkXQgdCJv',
				GroupName: 'MyNewTesttttt',
				Description: 'Updated description',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.UpdateGroup')
			.reply(200, {
				Group: {
					GroupName: 'MyNewTesttttt',
					UserPoolId: 'eu-central-1_KkXQgdCJv',
					Description: 'Updated description',
				},
			});
	});

	testWorkflows(workflows);
});
