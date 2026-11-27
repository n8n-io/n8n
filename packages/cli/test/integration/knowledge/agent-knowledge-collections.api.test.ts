import { createTeamProject, linkUserToProject, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import type { ProjectAgent } from '@/modules/agents/entities/agent.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import {
	AgentKnowledgeDependency,
	KnowledgeCollection,
	KnowledgeFile,
} from '@/modules/knowledge/entities';
import { KnowledgeConfig } from '@/modules/knowledge/knowledge.config';

import { createAgent } from '../shared/db/agents';
import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['knowledge', 'agents']);
});

// The test server registers module routes only when it loads an endpoint group.
const server = setupTestServer({ endpointGroups: ['ai'] });

describe('agent knowledge collection routes', () => {
	let project: Project;
	let owner: User;
	let editor: User;
	let viewer: User;
	let agent: ProjectAgent;

	const base = () => `/projects/${project.id}/agents/v2/${agent.id}/knowledge-collections`;

	async function createCollection(name: string, projectId = project.id) {
		const response = await server
			.authAgentFor(owner)
			.post(`/projects/${projectId}/knowledge/collections`)
			.send({ name, description: `About ${name}` });
		expect(response.status).toBe(200);
		return response.body.data as { id: string };
	}

	const list = async (user = editor) => await server.authAgentFor(user).get(base());
	const add = async (collectionId: string, user = editor) =>
		await server.authAgentFor(user).put(`${base()}/${collectionId}`);
	const remove = async (collectionId: string, user = editor) =>
		await server.authAgentFor(user).delete(`${base()}/${collectionId}`);

	async function dependencies() {
		return await Container.get(DataSource)
			.getRepository(AgentKnowledgeDependency)
			.findBy({ agentId: agent.id });
	}

	beforeEach(async () => {
		Container.get(KnowledgeConfig).collectionsEnabled = true;

		owner = await createOwner();
		project = await createTeamProject('Docs', owner);
		editor = await createMember();
		viewer = await createMember();
		await linkUserToProject(editor, project, 'project:editor');
		await linkUserToProject(viewer, project, 'project:viewer');
		agent = await createAgent({ projectId: project.id });
	});

	it('lists the collections of the project by name, with the file count and whether the agent uses each one', async () => {
		const returns = await createCollection('Returns');
		await createCollection('Pricing');
		const files = Container.get(DataSource).getRepository(KnowledgeFile);
		for (const name of ['refunds.md', 'exchanges.md']) {
			// `save` runs the hook that generates the id. `insert` does not.
			await files.save(
				files.create({
					knowledgeCollectionId: returns.id,
					name,
					storageKey: `test/${name}`,
					mimeType: 'text/markdown',
					fileSizeBytes: 100,
				}),
			);
		}
		const otherProject = await createTeamProject('Other', owner);
		await createCollection('Elsewhere', otherProject.id);

		expect((await add(returns.id)).status).toBe(200);
		const response = await list(viewer);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual([
			{
				id: expect.any(String),
				name: 'Pricing',
				description: 'About Pricing',
				fileCount: 0,
				usedByAgent: false,
			},
			{
				id: returns.id,
				name: 'Returns',
				description: 'About Returns',
				fileCount: 2,
				usedByAgent: true,
			},
		]);
	});

	it('adds several collections, accepts a repeat add and removes one', async () => {
		const returns = await createCollection('Returns');
		const pricing = await createCollection('Pricing');

		expect((await add(returns.id)).body.data).toEqual({ success: true });
		expect((await add(returns.id)).status).toBe(200);
		expect((await add(pricing.id)).status).toBe(200);
		expect(await dependencies()).toHaveLength(2);

		expect((await remove(returns.id)).body.data).toEqual({ success: true });
		expect((await dependencies()).map((row) => row.knowledgeCollectionId)).toEqual([pricing.id]);
	});

	it('answers 404 to an add of a collection of another project', async () => {
		const otherProject = await createTeamProject('Other', owner);
		const elsewhere = await createCollection('Elsewhere', otherProject.id);

		expect((await add(elsewhere.id)).status).toBe(404);
		expect(await dependencies()).toHaveLength(0);
	});

	it('answers 404 for an agent of another project', async () => {
		const collection = await createCollection('Returns');
		const otherProject = await createTeamProject('Other', owner);
		agent = await createAgent({ projectId: otherProject.id });

		expect((await add(collection.id, owner)).status).toBe(404);
	});

	it('answers 400 to an add or a remove on an archived agent', async () => {
		const collection = await createCollection('Returns');
		await Container.get(AgentRepository).update({ id: agent.id }, { isArchived: true });

		expect((await add(collection.id)).status).toBe(400);
		expect((await remove(collection.id)).status).toBe(400);
		expect(await dependencies()).toHaveLength(0);
	});

	it('answers 403 to a user who cannot update agents in the project', async () => {
		const collection = await createCollection('Returns');

		expect((await add(collection.id, viewer)).status).toBe(403);
		expect((await remove(collection.id, viewer)).status).toBe(403);
	});

	it('answers 404 when collections are off', async () => {
		const collection = await createCollection('Returns');
		Container.get(KnowledgeConfig).collectionsEnabled = false;

		expect((await list()).status).toBe(404);
		expect((await add(collection.id)).status).toBe(404);
	});

	it('removes the agent from its collections when the agent is deleted, and keeps the collections', async () => {
		const collection = await createCollection('Returns');
		expect((await add(collection.id)).status).toBe(200);

		await Container.get(AgentRepository).delete({ id: agent.id });

		expect(await dependencies()).toHaveLength(0);
		expect(
			await Container.get(DataSource)
				.getRepository(KnowledgeCollection)
				.existsBy({ id: collection.id }),
		).toBe(true);
	});
});
