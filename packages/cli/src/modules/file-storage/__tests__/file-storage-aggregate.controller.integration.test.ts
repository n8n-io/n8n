import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';
import { createHash } from 'node:crypto';

import { createOwner, createMember } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import { FileSigningService } from '../file-signing.service';
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

describe('GET /files/signed', () => {
	/** The service's derived signing secret, recomputed to craft rogue tokens. */
	const projectFilesSecret = () =>
		createHash('sha256')
			.update(`url-signing:project-files:${Container.get(InstanceSettings).encryptionKey}`)
			.digest('base64');

	test('valid token streams the content with download headers, without auth', async () => {
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id, 'pricing.csv');
		const token = Container.get(FileSigningService).createSignedToken(uploaded.body.data.id);

		const response = await testServer.authlessAgent.get('/files/signed').query({ token });

		expect(response.statusCode).toBe(200);
		expect(response.headers['content-type']).toContain('text/plain');
		expect(response.headers['content-disposition']).toBe('attachment; filename="pricing.csv"');
		expect(response.headers['content-security-policy']).toBeDefined();
		expect(response.text ?? response.body.toString()).toBe('content');
	});

	test('expired token is rejected with 400', async () => {
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id, 'pricing.csv');
		const token = jwt.sign(
			{ fileId: uploaded.body.data.id, scope: 'project-file' },
			projectFilesSecret(),
			{ expiresIn: -10 },
		);

		const response = await testServer.authlessAgent.get('/files/signed').query({ token });

		expect(response.statusCode).toBe(400);
	});

	test('garbage token is rejected with 400', async () => {
		const response = await testServer.authlessAgent
			.get('/files/signed')
			.query({ token: 'garbage' });

		expect(response.statusCode).toBe(400);
	});

	test('well-formed but wrongly-signed token is rejected with 400', async () => {
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id, 'pricing.csv');
		const token = jwt.sign(
			{ fileId: uploaded.body.data.id, scope: 'project-file' },
			'not-the-signing-secret',
		);

		const response = await testServer.authlessAgent.get('/files/signed').query({ token });

		expect(response.statusCode).toBe(400);
	});

	test('token for a deleted file is rejected with 404', async () => {
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id, 'pricing.csv');
		const token = Container.get(FileSigningService).createSignedToken(uploaded.body.data.id);

		await authOwnerAgent.delete(`/projects/${ownerProject.id}/files/${uploaded.body.data.id}`);

		const response = await testServer.authlessAgent.get('/files/signed').query({ token });

		expect(response.statusCode).toBe(404);
	});
});
