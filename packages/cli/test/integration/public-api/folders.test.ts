import { createTeamProject, createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { Telemetry } from '@/telemetry';
import { createFolder } from '@test-integration/db/folders';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('Folders in Public API', () => {
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });
	mockInstance(Telemetry);

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['Folder', 'SharedWorkflow', 'WorkflowEntity', 'Project', 'User']);
	});

	describe('GET /folders', () => {
		it('if not authenticated, should reject', async () => {
			const response = await testServer.publicApiAgentWithoutApiKey().get('/folders');
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});

		it('if not licensed, should reject', async () => {
			const owner = await createOwnerWithApiKey();
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/folders')
				.query({ projectId: 'any' });

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:folders').message,
			);
		});

		it('if projectId is missing, should return 400', async () => {
			testServer.license.enable('feat:folders');
			const owner = await createOwnerWithApiKey();

			const response = await testServer.publicApiAgentFor(owner).get('/folders');

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty(
				'message',
				"request/query must have required property 'projectId'",
			);
		});

		it('if project is not found or user has no access, should return an error', async () => {
			testServer.license.enable('feat:folders');
			const owner = await createOwnerWithApiKey();

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/folders')
				.query({ projectId: 'non-existent-project-id' });

			expect(response.body).toHaveProperty(
				'message',
				'Could not find project with ID "non-existent-project-id"',
			);
			expect(response.status).toBe(400);
		});

		it('if licensed, should return folders with workflow IDs in items', async () => {
			testServer.license.enable('feat:folders');
			const owner = await createOwnerWithApiKey();
			const project = await createTeamProject('my-project', owner);

			const folderA = await createFolder(project, { name: 'Folder A' });
			const folderB = await createFolder(project, { name: 'Folder B' });

			const workflow1 = await createWorkflow({ parentFolder: folderA }, project);
			const workflow2 = await createWorkflow({ parentFolder: folderA }, project);

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/folders')
				.query({ projectId: project.id });

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				nextCursor: null,
				data: expect.arrayContaining([
					expect.objectContaining({
						id: folderA.id,
						name: 'Folder A',
						parentFolderId: null,
						createdAt: expect.any(String),
						updatedAt: expect.any(String),
						items: expect.arrayContaining([{ id: workflow1.id }, { id: workflow2.id }]),
					}),
					expect.objectContaining({
						id: folderB.id,
						name: 'Folder B',
						parentFolderId: null,
						createdAt: expect.any(String),
						updatedAt: expect.any(String),
						items: [],
					}),
				]),
			});
		});

		it('should only include workflows directly inside each folder, not from sub-folders', async () => {
			testServer.license.enable('feat:folders');
			const owner = await createOwnerWithApiKey();
			const project = await createTeamProject('my-project', owner);

			const parent = await createFolder(project, { name: 'Parent' });
			const child = await createFolder(project, { name: 'Child', parentFolder: parent });

			const workflowInParent = await createWorkflow({ parentFolder: parent }, project);
			const workflowInChild = await createWorkflow({ parentFolder: child }, project);

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/folders')
				.query({ projectId: project.id });

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				data: expect.arrayContaining([
					expect.objectContaining({
						id: parent.id,
						items: [{ id: workflowInParent.id }],
					}),
					expect.objectContaining({
						id: child.id,
						items: [{ id: workflowInChild.id }],
					}),
				]),
			});
		});

		it('should respect limit and cursor for pagination', async () => {
			testServer.license.enable('feat:folders');
			const owner = await createOwnerWithApiKey();
			const project = await createTeamProject('my-project', owner);

			const folderA = await createFolder(project, { name: 'Folder 1' });
			const folderB = await createFolder(project, { name: 'Folder 2' });
			const folderC = await createFolder(project, { name: 'Folder 3' });

			const firstPage = await testServer
				.publicApiAgentFor(owner)
				.get('/folders')
				.query({ projectId: project.id, limit: 2 });

			expect(firstPage.status).toBe(200);
			expect(typeof firstPage.body.nextCursor).toBe('string');
			expect(firstPage.body.data).toHaveLength(2);

			const secondPage = await testServer
				.publicApiAgentFor(owner)
				.get('/folders')
				.query({ projectId: project.id, limit: 2, cursor: firstPage.body.nextCursor as string });

			expect(secondPage.status).toBe(200);
			expect(secondPage.body.nextCursor).toBeNull();
			expect(secondPage.body.data).toHaveLength(1);

			expect([
				...firstPage.body.data.map((f: { id: string }) => f.id),
				...secondPage.body.data.map((f: { id: string }) => f.id),
			]).toEqual([folderC.id, folderB.id, folderA.id]);
		});
	});
});
