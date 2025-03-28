import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Add User to Group', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/addToGroup.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('should add user to group', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			nock('https://cognito-idp.eu-central-1.amazonaws.com')
				.post('/')
				.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.DescribeUserPool')
				.reply(200, { UserPoolId: 'eu-central-1_KkXQgdCJv' });

			nock('https://cognito-idp.eu-central-1.amazonaws.com')
				.post('/')
				.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListUsers')
				.reply(200, { Users: [] });

			nock('https://cognito-idp.eu-central-1.amazonaws.com')
				.post(
					'/',
					(body) => body.UserPoolId === 'eu-central-1_KkXQgdCJv' && body.GroupName === 'MyNewTest1',
				)
				.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.AdminAddUserToGroup')
				.reply(200, {});

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
