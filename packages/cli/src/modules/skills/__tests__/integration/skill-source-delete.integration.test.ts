import { SKILL_SYNC_FLAG, type SkillSourceDeleteBlock } from '@n8n/api-types';
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
import { PostHogClient } from '@/posthog';
import { Telemetry } from '@/telemetry';

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
	const telemetry = mockInstance(Telemetry);
	let ownerUser: User;
	let owner: SuperAgentTest;
	let editor: SuperAgentTest;
	let updater: SuperAgentTest;
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
		const viewerUser = await createMember();
		editor = server.authAgentFor(editorUser);
		updater = server.authAgentFor(updaterUser);
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
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name,
				projectId,
				integrations: [],
				tools: {},
				versionId,
			}),
		);
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
				{ user_id: expect.any(String), provider: 'github', status: 'success' },
			);
			await agent.delete(`/skill-sources/${sourceId}`).expect(404);
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
				{ user_id: ownerUser.id, provider: 'github', status: 'failure', reason: 'skills_in_use' },
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

	it.each(['viewer', 'updater', 'outsider', 'globalMember'] as const)(
		'enforces delete scope for %s',
		async (role) => {
			const { sourceId } = await sourceWithSkills(role === 'globalMember' ? null : team.id);
			const agent = { viewer, updater, outsider, globalMember: editor }[role];
			const before = await snapshot();
			const list = await agent.get('/skill-sources').expect(200);
			if (role !== 'outsider')
				expect(list.body.data).toEqual([
					expect.objectContaining({ id: sourceId, canDelete: false }),
				]);

			await agent.delete(`/skill-sources/${sourceId}`).expect(role === 'outsider' ? 404 : 403);

			expect(await snapshot()).toEqual(before);
		},
	);

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

	it('rolls back the skills and links if the source delete fails', async () => {
		const { sourceId } = await sourceWithSkills();
		const before = await snapshot();
		vi.spyOn(sources(), 'deleteSource').mockRejectedValueOnce(new Error('Write failed'));

		await owner.delete(`/skill-sources/${sourceId}`).expect(500);

		expect(await snapshot()).toEqual(before);
	});
});
