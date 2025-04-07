import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';
import { CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Create user', () => {
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

		const baseUrl = 'https://iam.amazonaws.com/';
		nock.cleanAll();
		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post(
				`/?Action=CreateUser&Version=${CURRENT_VERSION}&UserName=JohnThis101&Tags.member.1.Key=Department&Tags.member.1.Value=Engineeering`,
			)
			.reply(200, {
				CreateUserResponse: {
					CreateUserResult: {
						User: {
							Arn: 'arn:aws:iam::130450532146:user/JohnThis101',
							CreateDate: 1743425541,
							PasswordLastUsed: null,
							Path: '/',
							PermissionsBoundary: null,
							Tags: [
								{
									Key: 'Department',
									Value: 'Engineeering',
								},
							],
							UserId: 'AIDAR4X3VE4ZFWNR5KDFE',
							UserName: 'JohnThis101',
						},
					},
					ResponseMetadata: {
						RequestId: 'b5e15ba7-230a-4297-becf-0a3cfe5129ae',
					},
				},
			});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
