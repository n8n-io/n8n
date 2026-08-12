import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import type { SourceControlPreferences } from '@/modules/source-control.ee/types/source-control-preferences';
import { createOwner, createMember, createAdmin } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import { ProjectFileRepository } from '../project-file.repository';
import { mockFileStorageSizeValidator } from './test-helpers';

let owner: User;
let member: User;
let admin: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let ownerProject: Project;
let memberProject: Project;

const testServer = utils.setupTestServer({
	endpointGroups: ['files'],
	modules: ['file-storage', 'source-control'],
});

let projectFileRepository: ProjectFileRepository;

const csvContent = 'sku,price\nA-1,10\n';

const uploadFile = async (
	agent: SuperAgentTest,
	projectId: string,
	{
		name = 'pricing.csv',
		content = csvContent,
		contentType = 'text/csv',
		conflict,
	}: { name?: string; content?: string; contentType?: string; conflict?: string } = {},
) => {
	let request = agent.post(`/projects/${projectId}/files`);
	if (conflict) request = request.query({ conflict });
	return await request.attach('file', Buffer.from(content), { filename: name, contentType });
};

beforeAll(async () => {
	// Bytes land in the binary_data table of the test DB — no shared fs state.
	Container.get(GlobalConfig).fileStorage.mode = 'db';
	mockFileStorageSizeValidator();

	projectFileRepository = Container.get(ProjectFileRepository);

	owner = await createOwner();
	member = await createMember();
	admin = await createAdmin();

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	ownerProject = await getPersonalProject(owner);
	memberProject = await getPersonalProject(member);
});

beforeEach(async () => {
	await testDb.truncate(['ProjectFile', 'BinaryDataFile']);
	vi.spyOn(Container.get(SourceControlPreferencesService), 'getPreferences').mockReturnValue({
		branchReadOnly: false,
	} as SourceControlPreferences);
});

describe('POST /projects/:projectId/files', () => {
	test('should upload a file into the project', async () => {
		const response = await uploadFile(authOwnerAgent, ownerProject.id);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			name: 'pricing.csv',
			mimeType: 'text/csv',
			sizeBytes: csvContent.length,
			projectId: ownerProject.id,
		});

		const row = await projectFileRepository.findByIdInProject(
			response.body.data.id,
			ownerProject.id,
		);
		expect(row).not.toBeNull();
		expect(row!.storedAt).toBe('db');
	});

	test('should 404 when the project does not exist', async () => {
		const response = await uploadFile(authOwnerAgent, 'non-existing-id');

		expect(response.statusCode).toBe(404);
	});

	test('should not allow uploading into another personal project', async () => {
		const response = await uploadFile(authMemberAgent, ownerProject.id);

		expect(response.statusCode).toBe(403);
	});

	test('should reject a name conflict by default', async () => {
		await uploadFile(authOwnerAgent, ownerProject.id);
		const response = await uploadFile(authOwnerAgent, ownerProject.id);

		expect(response.statusCode).toBe(409);
	});

	test('should auto-suffix with conflict=keepBoth', async () => {
		await uploadFile(authOwnerAgent, ownerProject.id);
		const response = await uploadFile(authOwnerAgent, ownerProject.id, {
			conflict: 'keepBoth',
		});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.name).toBe('pricing (1).csv');
	});

	test('should swap content with conflict=replace, keeping id and name', async () => {
		const first = await uploadFile(authOwnerAgent, ownerProject.id);
		const response = await uploadFile(authOwnerAgent, ownerProject.id, {
			conflict: 'replace',
			content: 'sku,price\nA-1,99\nB-2,3\n',
		});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.id).toBe(first.body.data.id);
		expect(response.body.data.name).toBe('pricing.csv');
		expect(response.body.data.sizeBytes).not.toBe(first.body.data.sizeBytes);
	});

	test('should 403 on a read-only instance', async () => {
		vi.spyOn(Container.get(SourceControlPreferencesService), 'getPreferences').mockReturnValue({
			branchReadOnly: true,
		} as SourceControlPreferences);

		const response = await uploadFile(authOwnerAgent, ownerProject.id);

		expect(response.statusCode).toBe(403);
	});
});

describe('GET /projects/:projectId/files', () => {
	test('should list only the project files', async () => {
		await uploadFile(authOwnerAgent, ownerProject.id);
		await uploadFile(authMemberAgent, memberProject.id, { name: 'other.csv' });

		const response = await authOwnerAgent.get(`/projects/${ownerProject.id}/files`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data[0].name).toBe('pricing.csv');
	});

	test('should filter by name and sort by size', async () => {
		await uploadFile(authOwnerAgent, ownerProject.id, {
			name: 'big.csv',
			content: 'x'.repeat(100),
		});
		await uploadFile(authOwnerAgent, ownerProject.id, { name: 'small.csv', content: 'x' });
		await uploadFile(authOwnerAgent, ownerProject.id, { name: 'logo.png' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/files`)
			.query({ filter: JSON.stringify({ name: 'csv' }), sortBy: 'size:desc' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data.data.map((f: { name: string }) => f.name)).toEqual([
			'big.csv',
			'small.csv',
		]);
	});
});

describe('GET /projects/:projectId/files/:fileId/content', () => {
	test('should stream the content with download headers', async () => {
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id);

		const response = await authOwnerAgent.get(
			`/projects/${ownerProject.id}/files/${uploaded.body.data.id}/content`,
		);

		expect(response.statusCode).toBe(200);
		expect(response.headers['content-disposition']).toContain('attachment');
		expect(response.headers['content-security-policy']).toBeDefined();
		expect(response.text ?? response.body.toString()).toContain('sku,price');
	});

	test('should refuse inline view for non-viewable mime types', async () => {
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id, {
			name: 'page.html',
			contentType: 'text/html',
		});

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/files/${uploaded.body.data.id}/content`)
			.query({ action: 'view' });

		expect(response.statusCode).toBe(400);
	});

	test('should deny access to a file of another project', async () => {
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id);

		const response = await authMemberAgent.get(
			`/projects/${memberProject.id}/files/${uploaded.body.data.id}/content`,
		);

		expect(response.statusCode).toBe(403);
	});
});

describe('PATCH /projects/:projectId/files/:fileId', () => {
	test('should rename a file', async () => {
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id);

		const response = await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/files/${uploaded.body.data.id}`)
			.send({ name: 'rates.csv' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data.name).toBe('rates.csv');
	});

	test('should 409 when the target name is taken', async () => {
		await uploadFile(authOwnerAgent, ownerProject.id, { name: 'rates.csv' });
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id);

		const response = await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/files/${uploaded.body.data.id}`)
			.send({ name: 'rates.csv' });

		expect(response.statusCode).toBe(409);
	});
});

describe('PUT /projects/:projectId/files/:fileId/content', () => {
	test('should replace the content in place', async () => {
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id);

		const response = await authOwnerAgent
			.put(`/projects/${ownerProject.id}/files/${uploaded.body.data.id}/content`)
			.attach('file', Buffer.from('sku,price\nC-3,7\n'), {
				filename: 'ignored.csv',
				contentType: 'text/csv',
			});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.id).toBe(uploaded.body.data.id);
		expect(response.body.data.name).toBe('pricing.csv');

		const content = await authOwnerAgent.get(
			`/projects/${ownerProject.id}/files/${uploaded.body.data.id}/content`,
		);
		expect(content.text ?? content.body.toString()).toContain('C-3');
	});
});

describe('DELETE /projects/:projectId/files/:fileId', () => {
	test('should delete the row', async () => {
		const uploaded = await uploadFile(authOwnerAgent, ownerProject.id);

		const response = await authOwnerAgent.delete(
			`/projects/${ownerProject.id}/files/${uploaded.body.data.id}`,
		);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({ deleted: true, name: 'pricing.csv' });
		expect(
			await projectFileRepository.findByIdInProject(uploaded.body.data.id, ownerProject.id),
		).toBeNull();
	});

	test('should bulk delete via POST /batch-delete', async () => {
		const first = await uploadFile(authOwnerAgent, ownerProject.id);
		const second = await uploadFile(authOwnerAgent, ownerProject.id, { name: 'logo.png' });

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/files/batch-delete`)
			.send({ fileIds: [first.body.data.id, second.body.data.id] });

		expect(response.statusCode).toBe(200);
		expect(await projectFileRepository.count()).toBe(0);
	});
});

describe('project viewer role', () => {
	let teamProject: Project;

	beforeEach(async () => {
		teamProject = await createTeamProject('Files Team Project', admin);
		await linkUserToProject(member, teamProject, 'project:viewer');
	});

	test('can list and download but not mutate', async () => {
		const authAdminAgent = testServer.authAgentFor(admin);
		const uploaded = await uploadFile(authAdminAgent, teamProject.id);

		const list = await authMemberAgent.get(`/projects/${teamProject.id}/files`);
		expect(list.statusCode).toBe(200);
		expect(list.body.data.count).toBe(1);

		const content = await authMemberAgent.get(
			`/projects/${teamProject.id}/files/${uploaded.body.data.id}/content`,
		);
		expect(content.statusCode).toBe(200);

		const upload = await uploadFile(authMemberAgent, teamProject.id, { name: 'new.csv' });
		expect(upload.statusCode).toBe(403);

		const rename = await authMemberAgent
			.patch(`/projects/${teamProject.id}/files/${uploaded.body.data.id}`)
			.send({ name: 'renamed.csv' });
		expect(rename.statusCode).toBe(403);

		const del = await authMemberAgent.delete(
			`/projects/${teamProject.id}/files/${uploaded.body.data.id}`,
		);
		expect(del.statusCode).toBe(403);
	});
});
