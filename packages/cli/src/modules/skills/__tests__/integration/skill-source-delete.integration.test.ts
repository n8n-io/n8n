import { SKILL_SYNC_FLAG, type SkillSourceDeleteBlock } from '@n8n/api-types';
import { PostHogClient, TelemetryProxy } from '@n8n/backend-services';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { AgentHistory } from '@/modules/agents/entities/agent-history.entity';
import { AgentPublishHistory } from '@/modules/agents/entities/agent-publish-history.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';

import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { SkillSourceLink } from '../../database/entities/skill-source-link.entity';
import { SkillSourceRepository } from '../../database/repositories/skill-source.repository';
import {
	createSkill,
	createSkillVersion,
	deleteAllSkills,
	findLatestSkillVersion,
	findSkill,
	readSkillTables,
} from '../../testing';
import { linkSkill } from '../test-utils/skill-source-fixtures';

import { createAgent } from '@test-integration/db/agents';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents']);
});

describe('Delete a skill source', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });
	const postHog = mockInstance(PostHogClient);
	const telemetry = mockInstance(TelemetryProxy);
	let ownerUser: User;
	let owner: SuperAgentTest;
	let editor: SuperAgentTest;
	let updater: SuperAgentTest;
	let deleter: SuperAgentTest;
	let viewer: SuperAgentTest;
	let outsider: SuperAgentTest;
	let team: Project;
	let otherTeam: Project;
	const db = () => Container.get(DataSource).manager;
	const sources = () => Container.get(SkillSourceRepository);

	beforeAll(async () => {
		ownerUser = await createOwner();
		owner = server.authAgentFor(ownerUser);
		const editorUser = await createMember();
		const updaterUser = await createMember();
		const deleterUser = await createMember();
		const viewerUser = await createMember();
		editor = server.authAgentFor(editorUser);
		updater = server.authAgentFor(updaterUser);
		deleter = server.authAgentFor(deleterUser);
		viewer = server.authAgentFor(viewerUser);
		outsider = server.authAgentFor(await createMember());
		team = await createTeamProject('Marketing');
		otherTeam = await createTeamProject('Sales');
		await linkUserToProject(editorUser, team, 'project:editor');
		await linkUserToProject(viewerUser, team, 'project:viewer');
		const role = await createCustomRoleWithScopeSlugs(
			['projectSkill:list', 'projectSkill:read', 'projectSkill:update'],
			{ roleType: 'project' },
		);
		await linkUserToProject(updaterUser, team, role.slug);
		const deleteRole = await createCustomRoleWithScopeSlugs(
			['projectSkill:list', 'projectSkill:read', 'projectSkill:delete'],
			{ roleType: 'project' },
		);
		await linkUserToProject(deleterUser, team, deleteRole.slug);
	});

	beforeEach(() => {
		postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: true });
		telemetry.track.mockClear();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await Container.get(AgentRepository).delete({});
		await deleteAllSkills();
		await db().delete(SkillSourceConnection, {});
	});

	async function sourceWithSkills(projectId: string | null = team.id) {
		const first = await createSkill({
			projectId,
			source: 'github',
			content: { files: [{ path: 'guide.md', content: 'Read this guide.' }] },
		});
		const second = await createSkill({ projectId, source: 'github' });
		const sourceId = await linkSkill(first.id, { projectId, createdById: ownerUser.id });
		await sources().insertImported({
			skillId: second.id,
			sourceId,
			remoteRef: { path: 'skills/second' },
			baseRevision: 'revision',
			baseContentHash: 'hash',
			skippedFiles: [],
		});
		await createSkillVersion(first.id, { instructions: 'Second version.' });
		return { sourceId, first, second };
	}

	async function snapshot() {
		return await Promise.all([
			readSkillTables(),
			db().find(SkillSourceConnection, { order: { id: 'ASC' } }),
			db().find(SkillSourceLink, { order: { skillId: 'ASC' } }),
		]);
	}

	async function agentUsing(
		name: string,
		projectId: string,
		skills: Array<{ id: string; versionId: string }>,
		published: boolean,
	) {
		const agents = Container.get(AgentRepository);
		const versionId = randomUUID();
		const agent = await createAgent({
			id: randomUUID(),
			name,
			projectId,
			integrations: [],
			tools: {},
			versionId,
		});
		const refs = Container.get(AgentSkillRepository);
		if (published) {
			await db().save(AgentHistory, { versionId, agentId: agent.id, author: 'Test' });
			await refs.insertPins(
				skills.map((skill) => ({
					agentVersionId: versionId,
					skillId: skill.id,
					skillVersionId: skill.versionId,
				})),
			);
			await db().save(AgentPublishHistory, {
				agentId: agent.id,
				versionId,
				event: 'activated',
				author: 'Test',
			});
			await agents.update(agent.id, { activeVersionId: versionId });
		} else {
			await refs.replaceDependencies(
				agent.id,
				skills.map(({ id }) => ({ skillId: id })),
			);
		}
		return agent;
	}

	it.each(['project', 'global'] as const)(
		'deletes the %s source, links, skills, versions, and files',
		async (scope) => {
			const { sourceId, first, second } = await sourceWithSkills(
				scope === 'global' ? null : team.id,
			);
			const unrelated = await createSkill({ projectId: team.id, source: 'github' });
			const unrelatedSource = await linkSkill(unrelated.id, {
				projectId: team.id,
				createdById: ownerUser.id,
			});
			const stopped = await createSkill({ projectId: team.id, source: 'github' });
			const agent = scope === 'global' ? owner : editor;
			const list = await agent.get('/skill-sources').expect(200);
			expect(list.body.data).toEqual(
				expect.arrayContaining([expect.objectContaining({ id: sourceId, canDelete: true })]),
			);

			await agent.delete(`/skill-sources/${sourceId}`).expect(200);

			expect(await sources().findById(sourceId)).toBeNull();
			expect(await sources().findLinksBySource(sourceId)).toEqual([]);
			for (const { id } of [first, second]) {
				expect(await findSkill(id)).toBeNull();
				expect(await findLatestSkillVersion(id)).toBeNull();
			}
			const [, versions, files] = await readSkillTables();
			expect(versions).not.toEqual(
				expect.arrayContaining([expect.objectContaining({ skillId: first.id })]),
			);
			expect(files).toEqual([]);
			expect(await findSkill(unrelated.id)).not.toBeNull();
			expect(await findSkill(stopped.id)).not.toBeNull();
			expect(await sources().findById(unrelatedSource)).not.toBeNull();
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_DELETED_SKILL_SOURCE,
				{ user_id: expect.any(String), provider: 'github', skills_kept: false, status: 'success' },
			);
			await agent.delete(`/skill-sources/${sourceId}`).expect(404);
		},
	);

	it.each([false, true])(
		'keeps skills, versions, files, and agent references with published=%s',
		async (published) => {
			const { sourceId, first, second } = await sourceWithSkills();
			const agent = await agentUsing('Research agent', team.id, [first, second], published);
			if (!agent.versionId) throw new Error('Expected an agent version');
			const refs = Container.get(AgentSkillRepository);
			const before = await readSkillTables();
			const dependencies = await refs.findDependencies([agent.id]);
			const pins = await refs.findPins(agent.versionId);

			await editor.delete(`/skill-sources/${sourceId}`).query({ keepSkills: true }).expect(200);

			expect(await readSkillTables()).toEqual(before);
			expect(await sources().findById(sourceId)).toBeNull();
			expect(await sources().findLinksBySource(sourceId)).toEqual([]);
			expect(await refs.findDependencies([agent.id])).toEqual(dependencies);
			expect(await refs.findPins(agent.versionId)).toEqual(pins);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_DELETED_SKILL_SOURCE,
				{ user_id: expect.any(String), provider: 'github', skills_kept: true, status: 'success' },
			);
			for (const { id } of [first, second]) {
				const detail = await editor.get(`/skills/${id}`).expect(200);
				expect(detail.body.data).toMatchObject({ canEdit: true, sourceId: null, syncedFrom: null });
				await editor
					.patch(`/skills/${id}`)
					.send({
						baseSkillHash: detail.body.data.skillHash,
						description: 'Local edit.',
					})
					.expect(200);
			}
			await editor.post(`/skill-sources/${sourceId}/check`).expect(404);
		},
	);

	it('deletes the last linked skill and its source together when requested', async () => {
		const { sourceId, first, second } = await sourceWithSkills();
		await editor.delete(`/skills/${second.id}`).expect(200);

		await editor.delete(`/skill-sources/${sourceId}`).query({ onlySkillId: first.id }).expect(200);

		expect(await sources().findById(sourceId)).toBeNull();
		expect(await findSkill(first.id)).toBeNull();
		expect(await findLatestSkillVersion(first.id)).toBeNull();
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_DELETED_SKILL,
			expect.objectContaining({ skill_id: first.id, source: 'ui' }),
		);
	});

	it('keeps the source when deleting the last linked skill without the option', async () => {
		const { sourceId, first, second } = await sourceWithSkills();
		await editor.delete(`/skills/${first.id}`).expect(200);
		await editor.delete(`/skills/${second.id}`).expect(200);
		expect(await sources().findById(sourceId)).not.toBeNull();
	});

	it.each(['viewer', 'updater', 'outsider'] as const)(
		'checks source access for last-skill removal by %s',
		async (role) => {
			const { sourceId, first, second } = await sourceWithSkills();
			await editor.delete(`/skills/${second.id}`).expect(200);
			const before = await snapshot();
			await { viewer, updater, outsider }[role]
				.delete(`/skill-sources/${sourceId}`)
				.query({ onlySkillId: first.id })
				.expect(role === 'outsider' ? 404 : 403);
			expect(await snapshot()).toEqual(before);
		},
	);

	// `other`: the source has one linked skill, but it is not the selected one.
	it.each(['multiple', 'unlinked', 'other', 'used'] as const)(
		'refuses last-skill removal when the selection is %s and changes nothing',
		async (state) => {
			const { sourceId, first, second } = await sourceWithSkills();
			if (state === 'unlinked' || state === 'used') {
				await editor.delete(`/skills/${second.id}`).expect(200);
			}
			if (state === 'unlinked' || state === 'other') {
				await editor.post(`/skill-sources/skills/${first.id}/stop-syncing`).expect(200);
			}
			if (state === 'used') await agentUsing('Research agent', team.id, [first], false);
			const before = await snapshot();

			await editor
				.delete(`/skill-sources/${sourceId}`)
				.query({ onlySkillId: first.id })
				.expect(state === 'used' ? 409 : 400);

			expect(await snapshot()).toEqual(before);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_DELETED_SKILL_SOURCE,
				{
					user_id: expect.any(String),
					provider: 'github',
					skills_kept: false,
					status: 'failure',
					reason: state === 'used' ? 'skills_in_use' : 'stale',
				},
			);
		},
	);

	it.each([false, true])(
		'blocks for agent usage with published=%s and changes nothing',
		async (published) => {
			const { sourceId, first, second } = await sourceWithSkills();
			const agent = await agentUsing('Research agent', team.id, [first, second], published);
			const before = await snapshot();

			const response = await owner.delete(`/skill-sources/${sourceId}`).expect(409);

			expect(response.body.meta).toEqual({
				reason: 'skills_in_use',
				agents: [
					{
						agentId: agent.id,
						agentName: 'Research agent',
						projectId: team.id,
						projectName: 'Marketing',
					},
				],
				hiddenAgents: 0,
			} satisfies SkillSourceDeleteBlock);
			expect(await snapshot()).toEqual(before);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_DELETED_SKILL_SOURCE,
				{
					user_id: ownerUser.id,
					provider: 'github',
					skills_kept: false,
					status: 'failure',
					reason: 'skills_in_use',
				},
			);
		},
	);

	it('counts agents in unreadable projects without returning their names', async () => {
		const { sourceId, first, second } = await sourceWithSkills();
		await agentUsing('Private agent', otherTeam.id, [first, second], false);
		const before = await snapshot();

		const response = await editor.delete(`/skill-sources/${sourceId}`).expect(409);

		expect(response.body.meta).toEqual({ reason: 'skills_in_use', agents: [], hiddenAgents: 1 });
		expect(JSON.stringify(response.body)).not.toContain('Private agent');
		expect(JSON.stringify(response.body)).not.toContain('Sales');
		expect(await snapshot()).toEqual(before);
	});

	it('lists agents in each project and counts an agent only once across skills and versions', async () => {
		const { sourceId, first, second } = await sourceWithSkills(null);
		const marketing = await agentUsing('Research agent', team.id, [first, second], true);
		await Container.get(AgentSkillRepository).replaceDependencies(marketing.id, [
			{ skillId: first.id },
		]);
		const sales = await agentUsing('Sales agent', otherTeam.id, [second], false);
		const before = await snapshot();

		const response = await owner.delete(`/skill-sources/${sourceId}`).expect(409);

		expect(response.body.meta.agents).toHaveLength(2);
		expect(response.body.meta.agents).toEqual(
			expect.arrayContaining([
				{
					agentId: marketing.id,
					agentName: 'Research agent',
					projectId: team.id,
					projectName: 'Marketing',
				},
				{
					agentId: sales.id,
					agentName: 'Sales agent',
					projectId: otherTeam.id,
					projectName: 'Sales',
				},
			]),
		);
		expect(await snapshot()).toEqual(before);
	});

	it.each(
		(['viewer', 'updater', 'outsider', 'globalMember'] as const).flatMap((role) =>
			[false, true].map((keepSkills) => ({ role, keepSkills })),
		),
	)('enforces delete scope for $role with keepSkills=$keepSkills', async ({ role, keepSkills }) => {
		const { sourceId } = await sourceWithSkills(role === 'globalMember' ? null : team.id);
		const agent = { viewer, updater, outsider, globalMember: editor }[role];
		const before = await snapshot();
		const list = await agent.get('/skill-sources').expect(200);
		if (role !== 'outsider')
			expect(list.body.data).toEqual([expect.objectContaining({ id: sourceId, canDelete: false })]);

		await agent
			.delete(`/skill-sources/${sourceId}`)
			.query({ keepSkills })
			.expect(role === 'outsider' ? 404 : 403);

		expect(await snapshot()).toEqual(before);
	});

	it.each([false, true])(
		'lets a role with delete and no update remove a source with keepSkills=%s',
		async (keepSkills) => {
			const { sourceId, first, second } = await sourceWithSkills();
			const before = await readSkillTables();

			// Stop syncing for one skill is an edit of the source, which this role cannot do.
			await deleter.post(`/skill-sources/skills/${first.id}/stop-syncing`).expect(403);
			await deleter.delete(`/skill-sources/${sourceId}`).query({ keepSkills }).expect(200);

			expect(await sources().findById(sourceId)).toBeNull();
			expect(await sources().findLinksBySource(sourceId)).toEqual([]);
			if (keepSkills) {
				expect(await readSkillTables()).toEqual(before);
			} else {
				expect(await findSkill(first.id)).toBeNull();
				expect(await findSkill(second.id)).toBeNull();
			}
		},
	);

	it('applies the last-skill check before it keeps the skills', async () => {
		const { sourceId, first, second } = await sourceWithSkills();
		const before = await snapshot();

		await editor
			.delete(`/skill-sources/${sourceId}`)
			.query({ keepSkills: true, onlySkillId: first.id })
			.expect(400);
		expect(await snapshot()).toEqual(before);

		await editor.delete(`/skills/${second.id}`).expect(200);
		await editor
			.delete(`/skill-sources/${sourceId}`)
			.query({ keepSkills: true, onlySkillId: first.id })
			.expect(200);
		expect(await sources().findById(sourceId)).toBeNull();
		expect(await findSkill(first.id)).not.toBeNull();
	});

	it.each([randomUUID(), 'not-a-uuid'])('answers 404 for unknown source %s', async (id) => {
		await owner.delete(`/skill-sources/${id}`).expect(404);
	});

	it('answers 404 with Skill Sync off and deletes nothing', async () => {
		const { sourceId } = await sourceWithSkills();
		postHog.getFeatureFlags.mockResolvedValue({});
		const before = await snapshot();

		await owner.delete(`/skill-sources/${sourceId}`).expect(404);

		expect(await snapshot()).toEqual(before);
	});

	it('deletes an empty source and keeps a skill that stopped syncing', async () => {
		const { sourceId, first, second } = await sourceWithSkills();
		for (const { id } of [first, second]) {
			await editor.post(`/skill-sources/skills/${id}/stop-syncing`).expect(200);
		}
		const before = await readSkillTables();

		await editor.delete(`/skill-sources/${sourceId}`).expect(200);

		expect(await sources().findById(sourceId)).toBeNull();
		expect(await readSkillTables()).toEqual(before);
	});

	it.each([false, true])(
		'rolls back removal if the write fails with keepSkills=%s',
		async (keepSkills) => {
			const { sourceId } = await sourceWithSkills();
			const before = await snapshot();
			vi.spyOn(sources(), 'deleteSource').mockRejectedValueOnce(new Error('Write failed'));

			await owner.delete(`/skill-sources/${sourceId}`).query({ keepSkills }).expect(500);

			expect(await snapshot()).toEqual(before);
		},
	);
});
