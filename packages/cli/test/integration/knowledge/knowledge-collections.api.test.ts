import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import {
	AgentKnowledgeDependency,
	KnowledgeCollection,
	KnowledgeFile,
	KnowledgeVectorStore,
	SharedKnowledgeCollection,
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

describe('knowledge collection routes', () => {
	let project: Project;
	let owner: User;
	let editor: User;
	let viewer: User;
	let outsider: User;

	const input = (override: Record<string, unknown> = {}) => ({
		name: 'Returns playbook',
		description: 'How we handle returns and refunds',
		...override,
	});

	async function create(user: User, body: Record<string, unknown>, projectId = project.id) {
		return await server
			.authAgentFor(user)
			.post(`/projects/${projectId}/knowledge/collections`)
			.send(body);
	}

	beforeEach(async () => {
		Container.get(KnowledgeConfig).collectionsEnabled = true;

		owner = await createOwner();
		project = await createTeamProject('Docs', owner);
		editor = await createMember();
		viewer = await createMember();
		outsider = await createMember();
		await linkUserToProject(editor, project, 'project:editor');
		await linkUserToProject(viewer, project, 'project:viewer');
	});

	describe('POST /projects/:projectId/knowledge/collections', () => {
		it('creates a shared collection with its owner row and returns it', async () => {
			const response = await create(editor, input());

			expect(response.status).toBe(200);
			const collection = response.body.data;
			expect(collection).toEqual({
				id: expect.any(String),
				name: 'Returns playbook',
				description: 'How we handle returns and refunds',
				slug: 'returns_playbook',
				homeProject: { id: project.id, name: 'Docs', type: 'team' },
				fileCount: 0,
				totalFileSizeBytes: 0,
				agentCount: 0,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});

			const dataSource = Container.get(DataSource);
			const row = await dataSource
				.getRepository(KnowledgeCollection)
				.findOneByOrFail({ id: collection.id });
			expect(row).toMatchObject({
				kind: 'shared',
				slug: 'returns_playbook',
				projectId: project.id,
				createdById: editor.id,
			});
			const shares = await dataSource
				.getRepository(SharedKnowledgeCollection)
				.findBy({ knowledgeCollectionId: collection.id });
			expect(shares).toEqual([
				expect.objectContaining({ projectId: project.id, role: 'knowledgeCollection:owner' }),
			]);
		});

		it('creates a collection in the personal project of the user', async () => {
			const personalProject = await getPersonalProject(editor);

			const response = await create(editor, input(), personalProject.id);

			expect(response.status).toBe(200);
			expect(response.body.data.homeProject).toMatchObject({
				id: personalProject.id,
				type: 'personal',
			});
		});

		it.each([
			['an empty name', { name: ' ' }],
			['an empty description', { description: '' }],
			['a description longer than 512 characters', { description: 'a'.repeat(513) }],
		])('refuses %s with 400', async (_case, override) => {
			const response = await create(editor, input(override));

			expect(response.status).toBe(400);
		});

		it('refuses a name that another collection of the project uses with 409', async () => {
			expect((await create(editor, input())).status).toBe(200);

			const response = await create(editor, input({ description: 'Another description' }));

			expect(response.status).toBe(409);
			expect(response.body.message).toBe(
				'A collection with this name already exists in this project.',
			);
		});

		it('accepts a name that a collection of another project uses, with another slug', async () => {
			const otherProject = await getPersonalProject(editor);
			const first = await create(editor, input());
			const second = await create(editor, input(), otherProject.id);

			expect(first.status).toBe(200);
			expect(second.status).toBe(200);
			const secondRow = await Container.get(DataSource)
				.getRepository(KnowledgeCollection)
				.findOneByOrFail({ id: second.body.data.id });
			expect(secondRow.slug).toMatch(/^returns_playbook_[a-z0-9]{6}$/);
		});

		it.each(['日本語', 'Продажи'])('gives a nano id slug to the name %j', async (name) => {
			const response = await create(editor, input({ name }));

			expect(response.status).toBe(200);
			expect(response.body.data.slug).toMatch(/^[0-9A-Za-z]{16}$/);
		});

		it('answers 404 to the instance owner for a project that does not exist', async () => {
			const response = await create(owner, input(), 'missing-project');

			expect(response.status).toBe(404);
			expect(response.body.message).toBe('Project not found');
		});

		it('answers 403 to a user who cannot update agents in the project', async () => {
			expect((await create(viewer, input())).status).toBe(403);
			expect((await create(outsider, input())).status).toBe(403);
		});

		it('answers 404 when collections are off', async () => {
			Container.get(KnowledgeConfig).collectionsEnabled = false;

			expect((await create(editor, input())).status).toBe(404);
		});
	});

	describe('GET /projects/:projectId/knowledge/collections/:collectionId', () => {
		async function get(user: User, collectionId: string, projectId = project.id) {
			return await server
				.authAgentFor(user)
				.get(`/projects/${projectId}/knowledge/collections/${collectionId}`);
		}

		it('returns the collection to a user who can read agents in the project', async () => {
			const created = (await create(editor, input())).body.data;

			const response = await get(viewer, created.id);

			expect(response.status).toBe(200);
			expect(response.body.data).toEqual(created);
		});

		it('answers 404 for a collection of another project', async () => {
			const otherProject = await getPersonalProject(editor);
			const created = (await create(editor, input(), otherProject.id)).body.data;

			expect((await get(editor, created.id)).status).toBe(404);
		});

		it('answers 404 for a collection that does not exist', async () => {
			expect((await get(editor, 'missing')).status).toBe(404);
		});

		it('answers 403 to a user who is not in the project', async () => {
			const created = (await create(editor, input())).body.data;

			expect((await get(outsider, created.id)).status).toBe(403);
		});

		it('answers 404 when collections are off', async () => {
			const created = (await create(editor, input())).body.data;
			Container.get(KnowledgeConfig).collectionsEnabled = false;

			expect((await get(editor, created.id)).status).toBe(404);
		});
	});

	describe('GET /knowledge/collections', () => {
		async function list(user: User) {
			return await server.authAgentFor(user).get('/knowledge/collections');
		}

		async function createOrFail(user: User, name: string, projectId = project.id) {
			const response = await create(user, input({ name }), projectId);
			expect(response.status).toBe(200);
			return response.body.data as { id: string };
		}

		function names(response: { body: { data: { data: Array<{ name: string }> } } }) {
			return response.body.data.data.map((collection) => collection.name);
		}

		beforeEach(async () => {
			// Other tests leave collections behind, and the instance owner sees all of them.
			const dataSource = Container.get(DataSource);
			for (const entity of [
				AgentKnowledgeDependency,
				KnowledgeFile,
				SharedKnowledgeCollection,
				KnowledgeCollection,
			]) {
				await dataSource.createQueryBuilder().delete().from(entity).execute();
			}
		});

		it('lists the collections of the team and personal projects of the member, and no others', async () => {
			const otherTeam = await createTeamProject('Sales', owner);
			const editorPersonal = await getPersonalProject(editor);
			const outsiderPersonal = await getPersonalProject(outsider);
			await createOrFail(editor, 'Docs collection');
			await createOrFail(editor, 'Editor notes', editorPersonal.id);
			await createOrFail(owner, 'Sales collection', otherTeam.id);
			await createOrFail(outsider, 'Outsider notes', outsiderPersonal.id);

			const response = await list(editor);

			expect(response.status).toBe(200);
			expect(response.body.data.count).toBe(2);
			expect(names(response).sort()).toEqual(['Docs collection', 'Editor notes']);
		});

		it('lists the collections of a project for a user who can only read its agents', async () => {
			await createOrFail(editor, 'Docs collection');

			const response = await list(viewer);

			expect(response.status).toBe(200);
			expect(names(response)).toEqual(['Docs collection']);
		});

		it('lists the collections of every project for the instance owner', async () => {
			const outsiderPersonal = await getPersonalProject(outsider);
			await createOrFail(editor, 'Docs collection');
			await createOrFail(outsider, 'Outsider notes', outsiderPersonal.id);

			const response = await list(owner);

			expect(response.status).toBe(200);
			expect(names(response).sort()).toEqual(['Docs collection', 'Outsider notes']);
		});

		it('answers an empty list to a user without collections', async () => {
			await createOrFail(editor, 'Docs collection');

			const response = await list(outsider);

			expect(response.status).toBe(200);
			expect(response.body.data).toEqual({ count: 0, data: [] });
		});

		it('lists the newest collection first', async () => {
			const older = await createOrFail(editor, 'Older');
			await createOrFail(editor, 'Newer');
			// Two creates can share a timestamp, so move one back in time.
			await Container.get(DataSource)
				.getRepository(KnowledgeCollection)
				.update({ id: older.id }, { createdAt: new Date('2026-01-01T00:00:00.000Z') });

			const response = await list(editor);

			expect(names(response)).toEqual(['Newer', 'Older']);
		});

		it('gives the file and agent totals of each collection', async () => {
			const collection = await createOrFail(editor, 'Docs collection');
			const dataSource = Container.get(DataSource);
			const files = dataSource.getRepository(KnowledgeFile);
			for (const [name, fileSizeBytes] of [
				['refunds.md', 1000],
				['pricing.pdf', 2500],
			] as const) {
				// `save` runs the hook that generates the id. `insert` does not.
				await files.save(
					files.create({
						knowledgeCollectionId: collection.id,
						name,
						storageKey: `test/${name}`,
						mimeType: 'text/plain',
						fileSizeBytes,
					}),
				);
			}

			const agent = await createAgent({ projectId: project.id });
			await dataSource
				.getRepository(AgentKnowledgeDependency)
				.insert({ agentId: agent.id, knowledgeCollectionId: collection.id });

			const response = await list(editor);

			expect(response.body.data.data).toEqual([
				{
					id: collection.id,
					name: 'Docs collection',
					description: 'How we handle returns and refunds',
					slug: 'docs_collection',
					homeProject: { id: project.id, name: 'Docs', type: 'team' },
					fileCount: 2,
					totalFileSizeBytes: 3500,
					agentCount: 1,
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			]);
		});

		it('lists a collection once when it is shared with two projects of the user', async () => {
			const collection = await createOrFail(editor, 'Docs collection');
			const editorPersonal = await getPersonalProject(editor);
			await Container.get(DataSource).getRepository(SharedKnowledgeCollection).insert({
				knowledgeCollectionId: collection.id,
				projectId: editorPersonal.id,
				role: 'knowledgeCollection:user',
			});

			const response = await list(editor);

			expect(response.body.data.count).toBe(1);
			expect(names(response)).toEqual(['Docs collection']);
		});

		it('answers 404 when collections are off', async () => {
			Container.get(KnowledgeConfig).collectionsEnabled = false;

			expect((await list(editor)).status).toBe(404);
		});
	});

	/** The editor creates a collection in the team project, or in `projectId`. */
	async function createCollection(name = 'Returns playbook', projectId = project.id) {
		const response = await create(editor, input({ name }), projectId);
		expect(response.status).toBe(200);
		return response.body.data as { id: string; slug: string };
	}

	function collectionPath(collectionId: string, projectId = project.id) {
		return `/projects/${projectId}/knowledge/collections/${collectionId}`;
	}

	describe('PATCH /projects/:projectId/knowledge/collections/:collectionId', () => {
		async function update(
			user: User,
			collectionId: string,
			body: Record<string, unknown>,
			projectId = project.id,
		) {
			return await server
				.authAgentFor(user)
				.patch(collectionPath(collectionId, projectId))
				.send(body);
		}

		it('changes the name and the description, keeps the slug, and moves the update time', async () => {
			const collection = await createCollection();
			const before = new Date('2026-01-01T00:00:00.000Z');
			await Container.get(DataSource)
				.getRepository(KnowledgeCollection)
				.update({ id: collection.id }, { updatedAt: before });

			const response = await update(editor, collection.id, {
				name: 'Refunds playbook',
				description: 'How we refund',
			});

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				id: collection.id,
				name: 'Refunds playbook',
				description: 'How we refund',
				slug: collection.slug,
				homeProject: { id: project.id, name: 'Docs', type: 'team' },
			});
			expect(new Date(response.body.data.updatedAt).getTime()).toBeGreaterThan(before.getTime());
		});

		it('keeps the slug, the project and the description when the body sends other fields', async () => {
			const collection = await createCollection();
			const otherProject = await getPersonalProject(editor);

			const response = await update(editor, collection.id, {
				name: 'Refunds playbook',
				slug: 'refunds_playbook',
				projectId: otherProject.id,
			});

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				name: 'Refunds playbook',
				description: 'How we handle returns and refunds',
				slug: collection.slug,
				homeProject: { id: project.id },
			});
			const row = await Container.get(DataSource)
				.getRepository(KnowledgeCollection)
				.findOneByOrFail({ id: collection.id });
			expect(row).toMatchObject({ slug: collection.slug, projectId: project.id });
		});

		it('keeps the name when the body sends only a description', async () => {
			const collection = await createCollection();

			const response = await update(editor, collection.id, { description: 'How we refund' });

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				name: 'Returns playbook',
				description: 'How we refund',
				slug: collection.slug,
			});
		});

		it('accepts the current name of the same collection', async () => {
			const collection = await createCollection();

			const response = await update(editor, collection.id, { name: 'Returns playbook' });

			expect(response.status).toBe(200);
		});

		it('refuses a name that another collection of the project uses with 409', async () => {
			await createCollection('Pricing');
			const collection = await createCollection();

			const response = await update(editor, collection.id, { name: 'Pricing' });

			expect(response.status).toBe(409);
			expect(response.body.message).toBe(
				'A collection with this name already exists in this project.',
			);
		});

		it.each([
			['an empty name', { name: ' ' }],
			['a description longer than 512 characters', { description: 'a'.repeat(513) }],
		])('refuses %s with 400', async (_case, body) => {
			const collection = await createCollection();

			expect((await update(editor, collection.id, body)).status).toBe(400);
		});

		it('answers 404 for a collection of another project and for a missing one', async () => {
			const personalProject = await getPersonalProject(editor);
			const elsewhere = await createCollection('Pricing', personalProject.id);

			expect((await update(editor, elsewhere.id, { name: 'Moved' })).status).toBe(404);
			expect((await update(editor, 'missing', { name: 'Moved' })).status).toBe(404);
		});

		it('answers 403 to a user who cannot update agents in the project', async () => {
			const collection = await createCollection();

			expect((await update(viewer, collection.id, { name: 'Moved' })).status).toBe(403);
			expect((await update(outsider, collection.id, { name: 'Moved' })).status).toBe(403);
		});

		it('answers 404 when collections are off', async () => {
			const collection = await createCollection();
			Container.get(KnowledgeConfig).collectionsEnabled = false;

			expect((await update(editor, collection.id, { name: 'Moved' })).status).toBe(404);
		});
	});

	describe('DELETE /projects/:projectId/knowledge/collections/:collectionId', () => {
		async function remove(user: User, collectionId: string, projectId = project.id) {
			return await server.authAgentFor(user).delete(collectionPath(collectionId, projectId));
		}

		it('deletes the collection with the rows of its files, vector stores, shares and agent links', async () => {
			const collection = await createCollection();
			const dataSource = Container.get(DataSource);
			const files = dataSource.getRepository(KnowledgeFile);
			const stores = dataSource.getRepository(KnowledgeVectorStore);
			// `save` runs the hook that generates the id. `insert` does not.
			await files.save(
				files.create({
					knowledgeCollectionId: collection.id,
					name: 'refunds.md',
					storageKey: 'test/refunds.md',
					mimeType: 'text/markdown',
					fileSizeBytes: 100,
				}),
			);
			await stores.save(
				stores.create({
					knowledgeCollectionId: collection.id,
					name: 'refunds_store',
					description: 'Refund answers',
					provider: 'pinecone' as KnowledgeVectorStore['provider'],
					embeddingModel: 'text-embedding-3-small',
					config: {},
				}),
			);
			const agent = await createAgent({ projectId: project.id });
			await dataSource
				.getRepository(AgentKnowledgeDependency)
				.insert({ agentId: agent.id, knowledgeCollectionId: collection.id });
			const personalProject = await getPersonalProject(editor);
			await dataSource.getRepository(SharedKnowledgeCollection).insert({
				knowledgeCollectionId: collection.id,
				projectId: personalProject.id,
				role: 'knowledgeCollection:user',
			});

			const response = await remove(editor, collection.id);

			expect(response.status).toBe(200);
			expect(response.body.data).toEqual({ success: true });
			const byCollection = { knowledgeCollectionId: collection.id };
			expect(
				await dataSource.getRepository(KnowledgeCollection).existsBy({ id: collection.id }),
			).toBe(false);
			expect(await files.countBy(byCollection)).toBe(0);
			expect(await stores.countBy(byCollection)).toBe(0);
			expect(await dataSource.getRepository(AgentKnowledgeDependency).countBy(byCollection)).toBe(
				0,
			);
			expect(await dataSource.getRepository(SharedKnowledgeCollection).countBy(byCollection)).toBe(
				0,
			);
		});

		it('answers 200 and deletes nothing for a collection of another project and for a missing one', async () => {
			const personalProject = await getPersonalProject(editor);
			const elsewhere = await createCollection('Pricing', personalProject.id);

			expect((await remove(editor, elsewhere.id)).status).toBe(200);
			expect((await remove(editor, 'missing')).status).toBe(200);
			expect(
				await Container.get(DataSource)
					.getRepository(KnowledgeCollection)
					.existsBy({ id: elsewhere.id }),
			).toBe(true);
		});

		it('answers 403 to a user who cannot update agents in the project', async () => {
			const collection = await createCollection();

			expect((await remove(viewer, collection.id)).status).toBe(403);
			expect((await remove(outsider, collection.id)).status).toBe(403);
		});

		it('answers 404 when collections are off', async () => {
			const collection = await createCollection();
			Container.get(KnowledgeConfig).collectionsEnabled = false;

			expect((await remove(editor, collection.id)).status).toBe(404);
		});
	});
});
