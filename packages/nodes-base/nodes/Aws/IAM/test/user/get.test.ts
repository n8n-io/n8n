import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Get User', () => {
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

		const baseUrl = 'https://iam.amazonaws.com/';
		nock.cleanAll();
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post(`/?Action=GetUser&Version=${CURRENT_VERSION}&UserName=accounts@this.de`)
			.reply(200, {
				GetUserResponse: {
					GetUserResult: {
						User: {
							UserName: 'accounts@this.de',
							UserId: 'AIDAR4X3VE4ZANWXRN2L2',
							Arn: 'arn:aws:iam::130450532146:user/accounts@this.de',
							CreateDate: 1733911052,
							Path: '/',
							Tags: [
								{
									Key: 'AKIAR4X3VE4ZALQYFEMT',
									Value: 'API dev',
								},
							],
							PasswordLastUsed: null,
							PermissionsBoundary: null,
						},
					},
				},
			});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
