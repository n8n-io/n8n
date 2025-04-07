import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Add User to Group', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('addToGroup.workflow.json'),
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
				UserPoolId: 'eu-central-1_W3WwpiBXV',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.DescribeUserPool')
			.reply(200, {
				UserPool: {
					Arn: 'arn:aws:cognito-idp:eu-central-1:130450532146:userpool/eu-central-1_W3WwpiBXV',
					CreationDate: 1739530218.869,
					DeletionProtection: 'INACTIVE',
					EstimatedNumberOfUsers: 4,
					Id: 'eu-central-1_W3WwpiBXV',
					LastModifiedDate: 1739530218.869,
					MfaConfiguration: 'OFF',
					Name: 'UserPoolSimple',
				},
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_W3WwpiBXV',
				MaxResults: 60,
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListUsers')
			.reply(200, {
				Users: [
					{
						Username: '0394e8e2-5081-7020-06bd-44bdfc84dd10',
						Attributes: [
							{ Name: 'email', Value: 'UserSimple' },
							{ Name: 'Sub', Value: '0394e8e2-5081-7020-06bd-44bdfc84dd10' },
							{ Name: 'Enabled', Value: true },
							{ Name: 'UserCreateDate', Value: 1736343033.226 },
							{ Name: 'UserLastModifiedDate', Value: 1736343033.226 },
							{ Name: 'UserStatus', Value: 'FORCE_CHANGE_PASSWORD' },
						],
					},
				],
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_W3WwpiBXV',
				Username: '0394e8e2-5081-7020-06bd-44bdfc84dd10',
				GroupName: 'MyNewGroupSimple',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.AdminAddUserToGroup')
			.reply(200, {});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
