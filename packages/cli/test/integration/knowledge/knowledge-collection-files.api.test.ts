import { createTeamProject, linkUserToProject, testModules } from '@n8n/backend-test-utils';
import { BinaryDataRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { AgentKnowledgeDependency, KnowledgeCollection } from '@/modules/knowledge/entities';
import { KnowledgeConfig } from '@/modules/knowledge/knowledge.config';

import { createAgent } from '../shared/db/agents';
import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['knowledge', 'agents']);
});

// The test server registers module routes only when it loads an endpoint group.
const server = setupTestServer({ endpointGroups: ['ai'] });

describe('knowledge collection file routes', () => {
	let project: Project;
	let editor: User;
	let viewer: User;
	let outsider: User;
	let collectionId: string;

	beforeEach(async () => {
		Container.get(KnowledgeConfig).collectionsEnabled = true;

		project = await createTeamProject('Docs', await createOwner());
		editor = await createMember();
		viewer = await createMember();
		outsider = await createMember();
		await linkUserToProject(editor, project, 'project:editor');
		await linkUserToProject(viewer, project, 'project:viewer');

		collectionId = generateNanoId();
		await Container.get(DataSource)
			.getRepository(KnowledgeCollection)
			.insert({
				id: collectionId,
				name: 'Product documents',
				description: 'Use for product questions',
				slug: `docs_${collectionId}`.slice(0, 24),
				kind: 'shared',
				projectId: project.id,
			});
	});

	const collectionPath = (projectId = project.id) =>
		`/projects/${projectId}/knowledge/collections/${collectionId}`;
	const filesPath = () => `${collectionPath()}/files`;

	async function upload(user: User, filename: string, content = 'hello', url = filesPath()) {
		return await server
			.authAgentFor(user)
			.post(url)
			.attach('files', Buffer.from(content), { filename, contentType: 'text/plain' });
	}

	it('uploads, lists and deletes a file, with its stored bytes', async () => {
		const uploadResponse = await upload(editor, 'guide.txt', 'hello');

		expect(uploadResponse.status).toBe(200);
		const [file] = uploadResponse.body.data;
		expect(file).toMatchObject({
			collectionId,
			fileName: 'guide.txt',
			mimeType: 'text/plain',
			fileSizeBytes: 5,
		});
		const binaryData = Container.get(BinaryDataRepository);
		expect(await binaryData.countBy({ sourceId: file.id })).toBe(1);

		const listResponse = await server.authAgentFor(viewer).get(filesPath()).expect(200);
		expect(listResponse.body.data).toEqual({ count: 1, totalSizeBytes: 5, data: [file] });

		const deleteResponse = await server
			.authAgentFor(editor)
			.delete(`${filesPath()}/${file.id}`)
			.expect(200);
		expect(deleteResponse.body.data).toEqual({ success: true });
		expect(await binaryData.countBy({ sourceId: file.id })).toBe(0);
		const emptyList = await server.authAgentFor(viewer).get(filesPath()).expect(200);
		expect(emptyList.body.data).toEqual({ count: 0, totalSizeBytes: 0, data: [] });
	});

	it('refuses a file name that the collection already has', async () => {
		expect((await upload(editor, 'guide.txt')).status).toBe(200);

		const response = await upload(editor, 'guide.txt', 'other content');

		expect(response.status).toBe(400);
		expect(response.body.message).toContain('already exists in this collection');
	});

	it('refuses a file type that the knowledge tab refuses', async () => {
		const response = await upload(editor, 'tool.exe');

		expect(response.status).toBe(400);
	});

	it('answers 403 to a delete from a user who can read the collection but not change it', async () => {
		await server.authAgentFor(viewer).delete(`${filesPath()}/any-file`).expect(403);
	});

	it('answers 403 to a user outside the home project', async () => {
		await server.authAgentFor(outsider).get(filesPath()).expect(403);
		await server.authAgentFor(outsider).delete(`${filesPath()}/any-file`).expect(403);
		await server.authAgentFor(outsider).get(`${collectionPath()}/agents`).expect(403);
	});

	it('answers 404 for a collection of another project', async () => {
		const otherProject = await createTeamProject('Sales', await createOwner());
		await linkUserToProject(editor, otherProject, 'project:editor');
		const otherPath = collectionPath(otherProject.id);

		await server.authAgentFor(editor).get(`${otherPath}/files`).expect(404);
		await server.authAgentFor(editor).delete(`${otherPath}/files/any-file`).expect(404);
		await server.authAgentFor(editor).get(`${otherPath}/agents`).expect(404);
		expect((await upload(editor, 'guide.txt', 'hello', `${otherPath}/files`)).status).toBe(404);
	});

	it('answers 404 for the private collection of an agent', async () => {
		const agent = await createAgent({ name: 'Support agent', projectId: project.id });
		const privateId = generateNanoId();
		await Container.get(DataSource)
			.getRepository(KnowledgeCollection)
			.insert({
				id: privateId,
				name: 'Support agent knowledge',
				slug: `agent_${privateId}`.slice(0, 24),
				kind: 'agent',
				agentId: agent.id,
			});
		const privatePath = `/projects/${project.id}/knowledge/collections/${privateId}`;

		await server.authAgentFor(editor).get(privatePath).expect(404);
		await server.authAgentFor(editor).get(`${privatePath}/files`).expect(404);
		await server.authAgentFor(editor).delete(`${privatePath}/files/any-file`).expect(404);
		await server.authAgentFor(editor).get(`${privatePath}/agents`).expect(404);
		expect((await upload(editor, 'guide.txt', 'hello', `${privatePath}/files`)).status).toBe(404);
	});

	it('leaves no temp file of a refused upload', async () => {
		// Multer writes each accepted file to the temp directory. The scope check runs
		// before multer, and the service removes the files of an upload that it refuses.
		const tempDir = await mkdtemp(path.join(os.tmpdir(), 'n8n-collection-upload-'));
		const tmpdirSpy = vi.spyOn(os, 'tmpdir').mockReturnValue(tempDir);

		try {
			expect((await upload(outsider, 'guide.txt')).status).toBe(403);
			expect((await upload(viewer, 'guide.txt')).status).toBe(403);

			Container.get(KnowledgeConfig).collectionsEnabled = false;

			expect((await upload(editor, 'guide.txt')).status).toBe(404);
			expect(await readdir(tempDir)).toEqual([]);
		} finally {
			tmpdirSpy.mockRestore();
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it('answers 404 for a missing collection, and when collections are off', async () => {
		await server
			.authAgentFor(editor)
			.get(`/projects/${project.id}/knowledge/collections/missing/files`)
			.expect(404);

		Container.get(KnowledgeConfig).collectionsEnabled = false;

		await server.authAgentFor(editor).get(filesPath()).expect(404);
	});

	it('lists the agents that use the collection', async () => {
		const agent = await createAgent({ name: 'Support agent', projectId: project.id });
		await Container.get(DataSource)
			.getRepository(AgentKnowledgeDependency)
			.insert({ agentId: agent.id, knowledgeCollectionId: collectionId });

		const response = await server
			.authAgentFor(viewer)
			.get(`${collectionPath()}/agents`)
			.expect(200);

		expect(response.body.data).toEqual([
			{ id: agent.id, name: 'Support agent', projectId: project.id },
		]);
	});
});
