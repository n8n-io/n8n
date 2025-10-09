import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('AWS Cognito - Update Group', () => {
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
