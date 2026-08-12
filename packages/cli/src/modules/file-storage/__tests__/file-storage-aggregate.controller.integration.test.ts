import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createOwner, createMember } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import { mockFileStorageSizeValidator } from './test-helpers';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let ownerProject: Project;

const testServer = utils.setupTestServer({
	endpointGroups: ['files'],
	modules: ['file-storage'],
});

const uploadFile = async (agent: SuperAgentTest, projectId: string, name: string) =>
	await agent
		.post(`/projects/${projectId}/files`)
		.attach('file', Buffer.from('content'), { filename: name, contentType: 'text/plain' });

beforeAll(async () => {
	Container.get(GlobalConfig).fileStorage.mode = 'db';
	mockFileStorageSizeValidator();

	owner = await createOwner();
	member = await createMember();

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	ownerProject = await getPersonalProject(owner);
});

beforeEach(async () => {
	await testDb.truncate(['ProjectFile', 'BinaryDataFile']);
});

describe('GET /files', () => {
	test('owner sees files across all projects', async () => {
		await uploadFile(authOwnerAgent, ownerProject.id, 'owner.txt');
		const memberProject = await getPersonalProject(member);
		await uploadFile(authMemberAgent, memberProject.id, 'member.txt');

		const response = await authOwnerAgent.get('/files');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.count).toBe(2);
	});

	test('member sees only files of accessible projects', async () => {
		await uploadFile(authOwnerAgent, ownerProject.id, 'owner.txt');
		const teamProject = await createTeamProject('Shared Team Project', owner);
		await linkUserToProject(member, teamProject, 'project:viewer');
		await uploadFile(authOwnerAgent, teamProject.id, 'shared.txt');

		const response = await authMemberAgent.get('/files');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data[0].name).toBe('shared.txt');
	});
});

describe('GET /files/limits', () => {
	test('member can read the instance-wide usage', async () => {
		const response = await authMemberAgent.get('/files/limits');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			totalBytes: expect.any(Number),
			maxBytes: expect.any(Number),
			quotaStatus: expect.stringMatching(/^(ok|warn|error)$/),
		});
	});
});
