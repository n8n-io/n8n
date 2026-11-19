import { ModuleRegistry } from '@n8n/backend-common';
import { createTeamProject, linkUserToProject, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import {
	createSkill,
	deleteAllSkills,
	findLatestSkillVersion,
	findSkill,
} from '@/modules/skills/testing';

import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import { createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { setupTestServer } from '../shared/utils/';

beforeAll(async () => await testModules.loadModules(['skills', 'agents']));

const testServer = setupTestServer({ endpointGroups: ['publicApi'] });

const skillContent = {
	name: 'Brand voice',
	description: 'How we write',
	instructions: 'Be brief.',
};

const uiOnlyFields = [
	'canEdit',
	'canDelete',
	'canStopSyncing',
	'createdBy',
	'usedBy',
	'usedByAgents',
	'projectName',
	'projectType',
	'projectIcon',
	'syncState',
	'syncedFrom',
	'sourceId',
	'source',
];

let owner: User;
let member: User;
let editor: User;
let viewer: User;
let outsider: User;
let teamProject: Project;
let memberProject: Project;

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();
	editor = await createMemberWithApiKey();
	viewer = await createMemberWithApiKey();
	outsider = await createMemberWithApiKey();
	teamProject = await createTeamProject('Team', owner);
	await linkUserToProject(editor, teamProject, 'project:editor');
	await linkUserToProject(viewer, teamProject, 'project:viewer');
	memberProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(member.id);
});

afterEach(async () => {
	await deleteAllSkills();
});

const api = (user: User) => testServer.publicApiAgentFor(user);

describe('authentication and gates', () => {
	const routes = [
		{ method: 'get', path: '/skills', scope: 'skill:list' },
		{ method: 'get', path: '/skills/some-skill', scope: 'skill:read' },
		{ method: 'post', path: '/skills', scope: 'skill:create' },
		{ method: 'put', path: '/skills/some-skill', scope: 'skill:update' },
		{ method: 'delete', path: '/skills/some-skill', scope: 'skill:delete' },
	] as const;

	test.each(routes)('$method $path answers 401 without an API key', async ({ method, path }) => {
		const response = await testServer.publicApiAgentWithoutApiKey()[method](path);

		expect(response.statusCode).toBe(401);
	});

	test.each(routes)(
		'$method $path answers 403 when the API key lacks $scope',
		async ({ method, path, scope }) => {
			const otherScopes = routes.map((route) => route.scope).filter((other) => other !== scope);
			const user = await createOwnerWithApiKey({ scopes: otherScopes });

			const response = await api(user)[method](path).send({});

			expect(response.statusCode).toBe(403);
		},
	);

	describe('while skills are off', () => {
		const settings = Container.get(ModuleRegistry).settings;
		let saved: Array<[string, ReturnType<typeof settings.get>]>;

		beforeEach(() => {
			saved = ['agents', 'instance-ai', 'mcp'].map((name) => [name, settings.get(name)]);
			settings.set('agents', { enabled: false });
			settings.set('instance-ai', { enabled: false });
			settings.set('mcp', { mcpAccessEnabled: false });
		});

		afterEach(() => {
			for (const [name, value] of saved) {
				if (value === undefined) settings.delete(name);
				else settings.set(name, value);
			}
		});

		test.each(routes)('$method $path answers 404', async ({ method, path }) => {
			const response = await api(owner)[method](path).send({ scope: 'nope' });

			expect(response.statusCode).toBe(404);
		});

		test('keeps the skill when a delete is refused', async () => {
			const { id } = await createSkill();

			await api(owner).delete(`/skills/${id}`).expect(404);

			expect(await findSkill(id)).not.toBeNull();
		});
	});
});

describe('GET /skills', () => {
	test('lists the skills each role can read', async () => {
		const instanceSkill = await createSkill({ content: { name: 'Instance skill' } });
		const teamSkill = await createSkill({
			projectId: teamProject.id,
			content: { name: 'Team skill' },
		});
		const personalSkill = await createSkill({
			projectId: memberProject.id,
			content: { name: 'Personal skill' },
		});

		const listedIds = async (user: User) => {
			const response = await api(user).get('/skills').expect(200);
			return (response.body.data as Array<{ id: string }>).map(({ id }) => id).sort();
		};

		expect(await listedIds(owner)).toEqual(
			[instanceSkill.id, teamSkill.id, personalSkill.id].sort(),
		);
		expect(await listedIds(member)).toEqual([instanceSkill.id, personalSkill.id].sort());
		expect(await listedIds(editor)).toEqual([instanceSkill.id, teamSkill.id].sort());
		expect(await listedIds(viewer)).toEqual([instanceSkill.id, teamSkill.id].sort());
		expect(await listedIds(outsider)).toEqual([instanceSkill.id]);
	});

	test('returns public fields only', async () => {
		await createSkill({ projectId: teamProject.id });

		const response = await api(owner).get('/skills').expect(200);

		expect(response.body).toEqual({
			data: [
				{
					id: expect.any(String),
					name: 'Brand voice',
					description: 'Write in our voice',
					scope: 'project',
					projectId: teamProject.id,
					latestVersion: 1,
					availableToAssistant: false,
					availableToMCP: false,
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			],
			nextCursor: null,
		});
	});

	test('narrows the list to one project', async () => {
		await createSkill();
		const teamSkill = await createSkill({ projectId: teamProject.id });

		const response = await api(owner).get(`/skills?projectId=${teamProject.id}`).expect(200);

		expect(response.body.data.map(({ id }: { id: string }) => id)).toEqual([teamSkill.id]);
	});

	test('answers an empty list for a project the user cannot read', async () => {
		await createSkill({ projectId: teamProject.id });

		const response = await api(outsider).get(`/skills?projectId=${teamProject.id}`).expect(200);

		expect(response.body).toEqual({ data: [], nextCursor: null });
	});

	test('pages through the skills with a cursor', async () => {
		const ids: string[] = [];
		for (const name of ['One', 'Two', 'Three']) {
			ids.push((await createSkill({ content: { name } })).id);
		}

		const first = await api(owner).get('/skills?limit=2').expect(200);
		expect(first.body.data).toHaveLength(2);
		expect(first.body.nextCursor).toEqual(expect.any(String));

		const second = await api(owner)
			.get(`/skills?limit=2&cursor=${first.body.nextCursor}`)
			.expect(200);
		expect(second.body.data).toHaveLength(1);
		expect(second.body.nextCursor).toBeNull();

		const pagedIds = [...first.body.data, ...second.body.data].map(({ id }) => id).sort();
		expect(pagedIds).toEqual(ids.sort());
	});

	test.each(['limit=-1', 'projectId='])('answers 400 for %s', async (query) => {
		await api(owner).get(`/skills?${query}`).expect(400);
	});
});

describe('GET /skills/:skillId', () => {
	test('returns the latest version with the hash for an update', async () => {
		const { id } = await createSkill({
			projectId: teamProject.id,
			content: { files: [{ path: 'references/style.md', content: 'Short words.' }] },
		});

		const response = await api(owner).get(`/skills/${id}`).expect(200);

		expect(response.body).toEqual({
			id,
			name: 'Brand voice',
			description: 'Write in our voice',
			instructions: 'Use short sentences.',
			references: [{ path: 'references/style.md', content: 'Short words.' }],
			scope: 'project',
			projectId: teamProject.id,
			latestVersion: 1,
			availableToAssistant: false,
			availableToMCP: false,
			skillHash: expect.any(String),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});
		for (const field of uiOnlyFields) expect(response.body).not.toHaveProperty(field);
	});

	test.each([
		['owner', 200, () => owner],
		['editor', 200, () => editor],
		['viewer', 200, () => viewer],
		['member outside the project', 404, () => outsider],
	])('answers %s with %d for a team project skill', async (_role, status, user) => {
		const { id } = await createSkill({ projectId: teamProject.id });

		await api(user()).get(`/skills/${id}`).expect(status);
	});

	test('lets every member read an instance skill', async () => {
		const { id } = await createSkill();

		await api(outsider).get(`/skills/${id}`).expect(200);
	});

	test('answers 404 for an unknown skill', async () => {
		await api(owner).get('/skills/missing-skill').expect(404);
	});
});

describe('POST /skills', () => {
	test('creates an instance skill as the owner', async () => {
		const response = await api(owner)
			.post('/skills')
			.send({ scope: 'instance', skill: skillContent, availableToMCP: true })
			.expect(201);

		expect(response.body).toMatchObject({
			...skillContent,
			scope: 'instance',
			projectId: null,
			latestVersion: 1,
			availableToMCP: true,
			references: [],
			skillHash: expect.any(String),
		});
		expect(await findSkill(response.body.id)).toMatchObject({ projectId: null, source: 'api' });
	});

	test.each([
		['editor', 201, () => editor, () => teamProject.id],
		['viewer', 403, () => viewer, () => teamProject.id],
		['member outside the project', 403, () => outsider, () => teamProject.id],
		['member in their personal project', 201, () => member, () => memberProject.id],
	])('answers %s with %d for a project skill', async (_role, status, user, projectId) => {
		await api(user())
			.post('/skills')
			.send({ scope: 'project', projectId: projectId(), skill: skillContent })
			.expect(status);
	});

	test('answers 403 when a member creates an instance skill', async () => {
		await api(member).post('/skills').send({ scope: 'instance', skill: skillContent }).expect(403);
	});

	test('answers 409 when the name is taken in the scope', async () => {
		await createSkill({ content: { name: skillContent.name } });

		await api(owner).post('/skills').send({ scope: 'instance', skill: skillContent }).expect(409);
	});

	test.each([
		['without instructions', { scope: 'instance', skill: { name: 'n', description: 'd' } }],
		['with an unknown field', { scope: 'instance', skill: skillContent, method: 'upload' }],
		['with an unknown scope', { scope: 'global', skill: skillContent }],
		['for a project skill without a project', { scope: 'project', skill: skillContent }],
		[
			'with a reference outside references/',
			{
				scope: 'instance',
				skill: { ...skillContent, references: [{ path: '../secret.md', content: 'x' }] },
			},
		],
	])('answers 400 %s', async (_case, body) => {
		await api(owner).post('/skills').send(body).expect(400);
	});
});

describe('PUT /skills/:skillId', () => {
	const readSkill = async (id: string) =>
		(await api(owner).get(`/skills/${id}`).expect(200)).body as Record<string, unknown>;

	test('saves a retrieved body with changes as the next version', async () => {
		const { id } = await createSkill({ projectId: teamProject.id });
		const skill = await readSkill(id);

		const response = await api(editor)
			.put(`/skills/${id}`)
			.send({ ...skill, instructions: 'Use plain words.' })
			.expect(200);

		expect(response.body).toMatchObject({
			id,
			name: 'Brand voice',
			instructions: 'Use plain words.',
			latestVersion: 2,
		});
		expect(response.body.skillHash).not.toBe(skill.skillHash);
		expect(await findLatestSkillVersion(id)).toMatchObject({
			version: 2,
			instructions: 'Use plain words.',
		});
	});

	test('saves no new version for an unchanged retrieved body', async () => {
		const { id } = await createSkill();
		const skill = await readSkill(id);

		const response = await api(owner).put(`/skills/${id}`).send(skill).expect(200);

		expect(response.body).toEqual(skill);
	});

	test('replaces the references with the ones in the body', async () => {
		const { id } = await createSkill({
			content: { files: [{ path: 'references/style.md', content: 'Short words.' }] },
		});
		const skill = await readSkill(id);

		const response = await api(owner)
			.put(`/skills/${id}`)
			.send({ ...skill, references: [] })
			.expect(200);

		expect(response.body.references).toEqual([]);
		expect(await findLatestSkillVersion(id)).toMatchObject({ files: [] });
	});

	test('changes the availability without a new version', async () => {
		const { id } = await createSkill();
		const skill = await readSkill(id);

		const response = await api(owner)
			.put(`/skills/${id}`)
			.send({ ...skill, availableToMCP: true })
			.expect(200);

		expect(response.body).toMatchObject({ availableToMCP: true, latestVersion: 1 });
	});

	test('moves a project skill to the instance', async () => {
		const { id } = await createSkill({ projectId: teamProject.id });
		const skill = await readSkill(id);

		const response = await api(owner)
			.put(`/skills/${id}`)
			.send({ ...skill, scope: 'instance', projectId: null })
			.expect(200);

		expect(response.body).toMatchObject({ scope: 'instance', projectId: null });
	});

	test('returns a skill moved to a project where the caller can create but not read', async () => {
		const createOnlyRole = await createCustomRoleWithScopeSlugs(['projectSkill:create'], {
			roleType: 'project',
			displayName: 'Skill creator',
		});
		const otherProject = await createTeamProject('Other', owner);
		await linkUserToProject(editor, otherProject, createOnlyRole.slug);
		const { id } = await createSkill({ projectId: teamProject.id });
		const skill = await readSkill(id);

		const response = await api(editor)
			.put(`/skills/${id}`)
			.send({ ...skill, projectId: otherProject.id })
			.expect(200);

		expect(response.body).toMatchObject({ id, scope: 'project', projectId: otherProject.id });
	});

	test.each([
		['viewer', 403, () => viewer],
		['member outside the project', 404, () => outsider],
	])('answers %s with %d for a team project skill', async (_role, status, user) => {
		const { id } = await createSkill({ projectId: teamProject.id });
		const skill = await readSkill(id);

		await api(user())
			.put(`/skills/${id}`)
			.send({ ...skill, instructions: 'Changed.' })
			.expect(status);

		expect(await findLatestSkillVersion(id)).toMatchObject({ version: 1 });
	});

	test('answers 403 when a member updates an instance skill', async () => {
		const { id } = await createSkill();
		const skill = await readSkill(id);

		await api(member)
			.put(`/skills/${id}`)
			.send({ ...skill, instructions: 'Changed.' })
			.expect(403);
	});

	test('answers 409 for an outdated skill hash', async () => {
		const { id } = await createSkill();
		const skill = await readSkill(id);

		await api(owner)
			.put(`/skills/${id}`)
			.send({ ...skill, skillHash: 'outdated', instructions: 'Changed.' })
			.expect(409);
	});

	test.each([
		[
			'for a partial body',
			(skill: Record<string, unknown>) => ({
				skillHash: skill.skillHash,
				instructions: 'Changed.',
			}),
		],
		['without a skill hash', ({ skillHash: _, ...skill }: Record<string, unknown>) => skill],
		[
			'with an unknown field',
			(skill: Record<string, unknown>) => ({
				...skill,
				allowedTools: ['x'],
			}),
		],
	])('answers 400 %s', async (_case, toBody) => {
		const { id } = await createSkill();
		const skill = await readSkill(id);

		await api(owner).put(`/skills/${id}`).send(toBody(skill)).expect(400);

		expect(await findLatestSkillVersion(id)).toMatchObject({ version: 1 });
	});

	test('answers 404 for an unknown skill', async () => {
		const { id } = await createSkill();
		const skill = await readSkill(id);

		await api(owner).put('/skills/missing-skill').send(skill).expect(404);
	});
});

describe('DELETE /skills/:skillId', () => {
	test.each([
		['owner', 204, () => owner],
		['editor', 204, () => editor],
		['viewer', 403, () => viewer],
		['member outside the project', 404, () => outsider],
	])('answers %s with %d for a team project skill', async (_role, status, user) => {
		const { id } = await createSkill({ projectId: teamProject.id });

		await api(user()).delete(`/skills/${id}`).expect(status);

		expect(await findSkill(id)).toEqual(status === 204 ? null : expect.anything());
	});

	test('answers 403 when a member deletes an instance skill', async () => {
		const { id } = await createSkill();

		await api(member).delete(`/skills/${id}`).expect(403);

		expect(await findSkill(id)).not.toBeNull();
	});

	test('lets a member delete a skill in their personal project', async () => {
		const { id } = await createSkill({ projectId: memberProject.id });

		await api(member).delete(`/skills/${id}`).expect(204);

		expect(await findSkill(id)).toBeNull();
	});

	test('answers 404 for an unknown skill', async () => {
		await api(owner).delete('/skills/missing-skill').expect(404);
	});
});
