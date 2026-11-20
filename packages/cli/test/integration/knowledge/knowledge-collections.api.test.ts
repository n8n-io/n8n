import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { KnowledgeCollection, SharedKnowledgeCollection } from '@/modules/knowledge/entities';
import { KnowledgeConfig } from '@/modules/knowledge/knowledge.config';

import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['knowledge', 'agents']);
});

// The test server registers module routes only when it loads an endpoint group.
const server = setupTestServer({ endpointGroups: ['ai'] });

describe('knowledge collection routes', () => {
	let project: Project;
	let editor: User;
	let viewer: User;
	let outsider: User;

	const input = (override: Record<string, unknown> = {}) => ({
		name: 'Returns playbook',
		description: 'How we handle returns and refunds',
		projectId: project.id,
		...override,
	});

	async function create(user: User, body: Record<string, unknown>) {
		return await server.authAgentFor(user).post('/knowledge/collections').send(body);
	}

	beforeEach(async () => {
		Container.get(KnowledgeConfig).collectionsEnabled = true;

		project = await createTeamProject('Docs', await createOwner());
		editor = await createMember();
		viewer = await createMember();
		outsider = await createMember();
		await linkUserToProject(editor, project, 'project:editor');
		await linkUserToProject(viewer, project, 'project:viewer');
	});

	describe('POST /knowledge/collections', () => {
		it('creates a shared collection with its owner row and returns it', async () => {
			const response = await create(editor, input());

			expect(response.status).toBe(200);
			const collection = response.body.data;
			expect(collection).toEqual({
				id: expect.any(String),
				name: 'Returns playbook',
				description: 'How we handle returns and refunds',
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

			const response = await create(editor, input({ projectId: personalProject.id }));

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
			const second = await create(editor, input({ projectId: otherProject.id }));

			expect(first.status).toBe(200);
			expect(second.status).toBe(200);
			const secondRow = await Container.get(DataSource)
				.getRepository(KnowledgeCollection)
				.findOneByOrFail({ id: second.body.data.id });
			expect(secondRow.slug).toMatch(/^returns_playbook_[a-z0-9]{6}$/);
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
});
