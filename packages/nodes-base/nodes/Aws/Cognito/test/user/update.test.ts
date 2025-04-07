import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Update User', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('update.workflow.json'),
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
				UserPoolId: 'eu-central-1_EUZ4iEF1T',
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.DescribeUserPool')
			.reply(200, {
				UserPool: {
					Arn: 'arn:aws:cognito-idp:eu-central-1:130450532146:userpool/eu-central-1_EUZ4iEF1T',
					CreationDate: 1739530218.869,
					DeletionProtection: 'INACTIVE',
					EstimatedNumberOfUsers: 4,
					Id: 'eu-central-1_EUZ4iEF1T',
					LastModifiedDate: 1739530218.869,
					MfaConfiguration: 'OFF',
					Name: 'UserPoolTwo',
				},
			});

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_EUZ4iEF1T',
				MaxResults: 60,
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.ListUsers')
			.reply(200, {
				UserPool: {
					Arn: 'arn:aws:cognito-idp:eu-central-1:130450532146:userpool/eu-central-1_EUZ4iEF1T',
					CreationDate: 1739530218.869,
					DeletionProtection: 'INACTIVE',
					EstimatedNumberOfUsers: 4,
					Id: 'eu-central-1_EUZ4iEF1T',
					LastModifiedDate: 1739530218.869,
					MfaConfiguration: 'OFF',
					Name: 'UserPoolTwo',
				},
			});
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				UserPoolId: 'eu-central-1_EUZ4iEF1T',
				Username: '43045822-80e1-70f6-582d-78ae7992e9d9',
				UserAttributes: [
					{
						Name: 'address',
						Value: 'New',
					},
				],
			})
			.matchHeader('x-amz-target', 'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes')
			.reply(200, {});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
