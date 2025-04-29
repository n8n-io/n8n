import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';
import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Get All Users', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('getAll.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}

		nock.cleanAll();
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'ListUsers',
				Version: CURRENT_VERSION,
				MaxItems: 100,
			})
			.reply(200, {
				ListUsersResponse: {
					ListUsersResult: {
						Users: [
							{
								Arn: 'arn:aws:iam::130450532146:user/Johnnn',
								UserName: 'Johnnn',
								UserId: 'AIDAR4X3VE4ZAJGXLCVOP',
								Path: '/',
								CreateDate: 1739198010,
								PasswordLastUsed: null,
								PermissionsBoundary: null,
								Tags: null,
							},
							{
								Arn: 'arn:aws:iam::130450532146:user/rhis/path/Jonas',
								UserName: 'Jonas',
								UserId: 'AIDAR4X3VE4ZDJJFKI6OU',
								Path: '/rhis/path/',
								CreateDate: 1739198295,
								PasswordLastUsed: null,
								PermissionsBoundary: null,
								Tags: null,
							},
						],
					},
				},
			});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
