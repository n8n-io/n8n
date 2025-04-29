import nock from 'nock';

import {
	getWorkflowFilenames,
	initBinaryDataService,
	testWorkflows,
} from '../../../../../test/nodes/Helpers';
import { BASE_URL, CURRENT_VERSION } from '../../helpers/constants';

describe('AWS IAM - Get Group', () => {
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

		nock.cleanAll();
		nock(BASE_URL)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/x-amz-json-1.1' })
			.post('/', {
				Action: 'GetGroup',
				Version: CURRENT_VERSION,
				GroupName: 'GroupNameUpdated2',
			})
			.reply(200, {
				GetGroupResponse: {
					GetGroupResult: {
						Group: {
							Arn: 'arn:aws:iam::130450532146:group/New/Path/GroupNameUpdated2',
							CreateDate: 1739193696,
							GroupId: 'AGPAR4X3VE4ZKHNKBQHBZ',
							GroupName: 'GroupNameUpdated2',
							Path: '/New/Path/',
						},
						Users: [
							{
								Arn: 'arn:aws:iam::130450532146:user/rhis/path/Jonas',
								CreateDate: 1739198295,
								PasswordLastUsed: null,
								PermissionsBoundary: null,
								Tags: null,
								Path: '/rhis/path/',
								UserId: 'AIDAR4X3VE4ZDJJFKI6OU',
								UserName: 'Jonas',
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
