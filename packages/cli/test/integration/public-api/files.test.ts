import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { ProjectFileService } from '@/modules/file-storage/file-storage.service';
import type { ProjectFile } from '@/modules/file-storage/project-file.entity';

import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let member: User;
let ownerProject: Project;
let memberProject: Project;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let projectFileService: ProjectFileService;

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['file-storage'],
});

const csvContent = 'sku,price\nA-1,10\n';

const seedFile = async (
	projectId: string,
	{ name = 'pricing.csv', content = csvContent, mimeType = 'text/csv' } = {},
): Promise<ProjectFile> => {
	return await projectFileService.upload(
		projectId,
		Buffer.from(content),
		{ name, mimeType },
		'error',
	);
};

beforeAll(async () => {
	// Bytes land in the binary_data table of the test DB — no shared fs state.
	Container.get(GlobalConfig).fileStorage.mode = 'db';
	projectFileService = Container.get(ProjectFileService);

	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();

	ownerProject = await getPersonalProject(owner);
	memberProject = await getPersonalProject(member);
});

beforeEach(async () => {
	await testDb.truncate(['ProjectFile', 'BinaryDataFile']);

	// Recreated per test: the 401 cases override the agent's API-key header.
	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
});

const testWithAPIKey =
	(method: 'get' | 'put' | 'delete', url: string, apiKey: string | null) => async () => {
		void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
		const response = await authOwnerAgent[method](url);
		expect(response.statusCode).toBe(401);
	};

const publicFileShape = (file: ProjectFile) => ({
	id: file.id,
	name: file.name,
	mimeType: file.mimeType,
	sizeBytes: file.fileSizeBytes,
	projectId: file.projectId,
	createdAt: file.createdAt.toISOString(),
	updatedAt: file.updatedAt.toISOString(),
});

describe('GET /files', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/files', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/files', 'abcXYZ'));

	test('should fail due to missing file:list scope on the API key', async () => {
		const scopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
		const response = await testServer.publicApiAgentFor(scopedOwner).get('/files');

		expect(response.statusCode).toBe(403);
	});

	test('should list files with the public shape', async () => {
		const file = await seedFile(ownerProject.id);

		const response = await authOwnerAgent.get('/files');

		expect(response.statusCode).toBe(200);
		expect(response.body.nextCursor).toBeNull();
		expect(response.body.data).toEqual([publicFileShape(file)]);
	});

	test('should paginate with a cursor', async () => {
		await seedFile(ownerProject.id, { name: 'a.csv' });
		await seedFile(ownerProject.id, { name: 'b.csv' });
		await seedFile(ownerProject.id, { name: 'c.csv' });

		const firstPage = await authOwnerAgent.get('/files').query({ limit: 2, sortBy: 'name:asc' });

		expect(firstPage.statusCode).toBe(200);
		expect(firstPage.body.data).toHaveLength(2);
		expect(firstPage.body.data.map((f: { name: string }) => f.name)).toEqual(['a.csv', 'b.csv']);
		expect(firstPage.body.nextCursor).toEqual(expect.any(String));

		const secondPage = await authOwnerAgent
			.get('/files')
			.query({ cursor: firstPage.body.nextCursor, sortBy: 'name:asc' });

		expect(secondPage.statusCode).toBe(200);
		expect(secondPage.body.data).toHaveLength(1);
		expect(secondPage.body.data[0].name).toBe('c.csv');
		expect(secondPage.body.nextCursor).toBeNull();
	});

	test('should reject an invalid cursor', async () => {
		const response = await authOwnerAgent.get('/files').query({ cursor: 'not-a-valid-cursor' });

		expect(response.statusCode).toBe(400);
	});

	test('should only list files from projects the member has access to', async () => {
		await seedFile(ownerProject.id, { name: 'owners.csv' });
		const memberFile = await seedFile(memberProject.id, { name: 'members.csv' });

		const response = await authMemberAgent.get('/files');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(memberFile.id);
	});
});

describe('GET /files/:fileId', () => {
	test('should retrieve file metadata', async () => {
		const file = await seedFile(ownerProject.id);

		const response = await authOwnerAgent.get(`/files/${file.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(publicFileShape(file));
	});

	test('should return 404 for a missing file', async () => {
		const response = await authOwnerAgent.get('/files/non-existing-id');

		expect(response.statusCode).toBe(404);
	});

	test('should deny a member access to a file in another project', async () => {
		const file = await seedFile(ownerProject.id);

		const response = await authMemberAgent.get(`/files/${file.id}`);

		expect(response.statusCode).toBe(403);
	});

	test('should fail due to missing file:read scope on the API key', async () => {
		const file = await seedFile(ownerProject.id);
		const scopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });

		const response = await testServer.publicApiAgentFor(scopedOwner).get(`/files/${file.id}`);

		expect(response.statusCode).toBe(403);
	});
});

describe('GET /files/:fileId/content', () => {
	test('should download the file content', async () => {
		const file = await seedFile(ownerProject.id);

		const response = await authOwnerAgent.get(`/files/${file.id}/content`);

		expect(response.statusCode).toBe(200);
		expect(response.headers['content-type']).toContain('text/csv');
		expect(response.headers['content-disposition']).toBe(
			`attachment; filename="${encodeURIComponent(file.name)}"`,
		);
		expect(response.headers['content-length']).toBe(String(csvContent.length));
		expect(response.text).toBe(csvContent);
	});

	test('should return 404 for a missing file', async () => {
		const response = await authOwnerAgent.get('/files/non-existing-id/content');

		expect(response.statusCode).toBe(404);
	});

	test('should deny a member access to content in another project', async () => {
		const file = await seedFile(ownerProject.id);

		const response = await authMemberAgent.get(`/files/${file.id}/content`);

		expect(response.statusCode).toBe(403);
	});
});

describe('PUT /files/:fileId', () => {
	test('should rename a file', async () => {
		const file = await seedFile(ownerProject.id);

		const response = await authOwnerAgent.put(`/files/${file.id}`).send({ name: 'renamed.csv' });

		expect(response.statusCode).toBe(200);
		expect(response.body).toMatchObject({
			id: file.id,
			name: 'renamed.csv',
			projectId: ownerProject.id,
		});
	});

	test('should return 409 when the new name is taken in the project', async () => {
		await seedFile(ownerProject.id, { name: 'taken.csv' });
		const file = await seedFile(ownerProject.id, { name: 'original.csv' });

		const response = await authOwnerAgent.put(`/files/${file.id}`).send({ name: 'taken.csv' });

		expect(response.statusCode).toBe(409);
	});

	test('should reject an invalid body', async () => {
		const file = await seedFile(ownerProject.id);

		const response = await authOwnerAgent.put(`/files/${file.id}`).send({ name: '' });

		expect(response.statusCode).toBe(400);
	});

	test('should return 404 for a missing file', async () => {
		const response = await authOwnerAgent.put('/files/non-existing-id').send({ name: 'new.csv' });

		expect(response.statusCode).toBe(404);
	});

	test('should deny a member renaming a file in another project', async () => {
		const file = await seedFile(ownerProject.id);

		const response = await authMemberAgent.put(`/files/${file.id}`).send({ name: 'stolen.csv' });

		expect(response.statusCode).toBe(403);
	});
});

describe('DELETE /files/:fileId', () => {
	test('should delete a file', async () => {
		const file = await seedFile(ownerProject.id);

		const response = await authOwnerAgent.delete(`/files/${file.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ deleted: true, name: file.name });

		const followUp = await authOwnerAgent.get(`/files/${file.id}`);
		expect(followUp.statusCode).toBe(404);
	});

	test('should return 404 for a missing file', async () => {
		const response = await authOwnerAgent.delete('/files/non-existing-id');

		expect(response.statusCode).toBe(404);
	});

	test('should deny a member deleting a file in another project', async () => {
		const file = await seedFile(ownerProject.id);

		const response = await authMemberAgent.delete(`/files/${file.id}`);

		expect(response.statusCode).toBe(403);
	});

	test('should fail due to missing file:delete scope on the API key', async () => {
		const file = await seedFile(ownerProject.id);
		const scopedOwner = await createOwnerWithApiKey({ scopes: ['file:read'] });

		const response = await testServer.publicApiAgentFor(scopedOwner).delete(`/files/${file.id}`);

		expect(response.statusCode).toBe(403);
	});
});
