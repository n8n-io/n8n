import { SKILL_SYNC_FLAG } from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import {
	createTeamProject,
	getPersonalProject,
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
import { Telemetry } from '@/telemetry';

import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { SkillSourceLink } from '../../database/entities/skill-source-link.entity';
import { SkillSourceRepository } from '../../database/repositories/skill-source.repository';
import {
	createSkill,
	createSkillVersion,
	deleteAllSkills,
	findSkill,
	readSkillTables,
} from '../../testing';
import { linkSkill } from '../test-utils/skill-source-fixtures';

import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

beforeAll(async () => await testModules.loadModules(['skills', 'agents']));

describe('Change source scope', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });
	const postHog = mockInstance(PostHogClient);
	const telemetry = mockInstance(Telemetry);
	let ownerUser: User;
	let owner: SuperAgentTest;
	let editor: SuperAgentTest;
	let viewer: SuperAgentTest;
	let outsider: SuperAgentTest;
	let team: Project;
	let other: Project;
	const db = () => Container.get(DataSource).manager;
	const sources = () => Container.get(SkillSourceRepository);
	const path = (id: string) => `/skill-sources/${id}/change-scope`;
	const target = () => ({ scope: 'project', projectId: other.id });

	beforeAll(async () => {
		ownerUser = await createOwner();
		owner = server.authAgentFor(ownerUser);
		const editorUser = await createMember();
		const viewerUser = await createMember();
		editor = server.authAgentFor(editorUser);
		viewer = server.authAgentFor(viewerUser);
		outsider = server.authAgentFor(await createMember());
		team = await createTeamProject('Marketing');
		other = await createTeamProject('Sales');
		await linkUserToProject(editorUser, team, 'project:editor');
		await linkUserToProject(editorUser, other, 'project:editor');
		await linkUserToProject(viewerUser, team, 'project:viewer');
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
			content: { name: 'First skill', files: [{ path: 'guide.md', content: 'Read this guide.' }] },
		});
		const second = await createSkill({
			projectId,
			source: 'github',
			content: { name: 'Second skill' },
		});
		const sourceId = await linkSkill(
			first.id,
			{ projectId, createdById: ownerUser.id },
			{ pendingContentHash: 'pending' },
		);
		await sources().insertImported({
			skillId: second.id,
			sourceId,
			remoteRef: { path: 'second' },
			baseRevision: 'revision',
			baseContentHash: 'hash',
			skippedFiles: [],
		});
		await createSkillVersion(first.id, {
			name: 'First skill',
			instructions: 'Updated instructions.',
		});
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
		projectId: string,
		skill: { id: string; versionId: string },
		pinned = false,
	) {
		const repo = Container.get(AgentRepository);
		const versionId = randomUUID();
		const agent = await repo.save(
			repo.create({
				id: randomUUID(),
				name: 'Research agent',
				projectId,
				versionId,
				tools: {},
				integrations: [],
			}),
		);
		const refs = Container.get(AgentSkillRepository);
		if (pinned) {
			await db().save(AgentHistory, { agentId: agent.id, versionId, author: 'Test' });
			await refs.insertPins([
				{ agentVersionId: versionId, skillId: skill.id, skillVersionId: skill.versionId },
			]);
			await db().save(AgentPublishHistory, {
				agentId: agent.id,
				versionId,
				event: 'activated',
				author: 'Test',
			});
			await repo.update(agent.id, { activeVersionId: versionId });
		} else await refs.replaceDependencies(agent.id, [{ skillId: skill.id }]);
		return agent;
	}

	it.each(['global', 'project', 'fromGlobal'] as const)(
		'moves %s with links and versions intact',
		async (direction) => {
			const from = direction === 'fromGlobal' ? null : team.id;
			const to = direction === 'global' ? null : other.id;
			const { sourceId, first, second } = await sourceWithSkills(from);
			await agentUsing(to ?? team.id, first);
			await agentUsing(to ?? other.id, second, true);
			const [, versions, files] = await readSkillTables();
			const links = await sources().findLinksBySource(sourceId);

			await owner
				.post(path(sourceId))
				.send(to === null ? { scope: 'instance' } : target())
				.expect(200);

			expect((await sources().findById(sourceId))?.projectId).toBe(to);
			for (const skill of [first, second]) expect((await findSkill(skill.id))?.projectId).toBe(to);
			expect((await readSkillTables()).slice(1)).toEqual([versions, files]);
			expect(await sources().findLinksBySource(sourceId)).toEqual(links);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_CHANGED_SKILL_SOURCE_SCOPE,
				{
					user_id: ownerUser.id,
					provider: 'github',
					from_scope: from === null ? 'global' : 'team',
					to_scope: to === null ? 'global' : 'team',
				},
			);
		},
	);

	it.each([false, true])('blocks agents outside the new scope with pinned=%s', async (pinned) => {
		const { sourceId, first, second } = await sourceWithSkills(null);
		const agent = await agentUsing(team.id, first, pinned);
		if (!pinned) {
			await Container.get(AgentSkillRepository).replaceDependencies(agent.id, [
				{ skillId: first.id },
				{ skillId: second.id },
			]);
		}
		const before = await snapshot();

		const response = await owner.post(path(sourceId)).send(target()).expect(409);

		expect(response.body.meta).toEqual({
			reason: 'agents_out_of_scope',
			agents: [
				{
					agentId: agent.id,
					agentName: 'Research agent',
					projectId: team.id,
					projectName: 'Marketing',
				},
			],
			hiddenAgents: 0,
		});
		expect(await snapshot()).toEqual(before);
		expect(telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_CHANGED_SKILL_SOURCE_SCOPE,
			expect.anything(),
		);
	});

	it('counts agents that the user cannot read without exposing their names', async () => {
		const { sourceId, first } = await sourceWithSkills();
		const hidden = await createTeamProject('Private project');
		await agentUsing(hidden.id, first);
		const response = await editor.post(path(sourceId)).send(target()).expect(409);
		expect(response.body.meta).toEqual({
			reason: 'agents_out_of_scope',
			agents: [],
			hiddenAgents: 1,
		});
		expect(JSON.stringify(response.body)).not.toContain('Research agent');
	});

	it('moves into a personal project and reports its scope type', async () => {
		const { sourceId, first } = await sourceWithSkills(null);
		const personal = await getPersonalProject(ownerUser);
		await owner.post(path(sourceId)).send({ scope: 'project', projectId: personal.id }).expect(200);
		expect((await findSkill(first.id))?.projectId).toBe(personal.id);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_CHANGED_SKILL_SOURCE_SCOPE,
			{ user_id: ownerUser.id, provider: 'github', from_scope: 'global', to_scope: 'personal' },
		);
	});

	it('rolls back an earlier skill move when a later skill name clashes', async () => {
		const { sourceId } = await sourceWithSkills();
		await createSkill({ projectId: other.id, content: { name: 'SECOND SKILL' } });
		const before = await snapshot();
		await owner.post(path(sourceId)).send(target()).expect(409);
		expect(await snapshot()).toEqual(before);
	});

	it.each([false, true])('blocks a duplicate source with global=%s', async (global) => {
		const { sourceId } = await sourceWithSkills();
		const source = await sources().findById(sourceId);
		const skill = await createSkill({ projectId: global ? null : other.id });
		const duplicate = await linkSkill(skill.id, {
			projectId: global ? null : other.id,
			createdById: ownerUser.id,
		});
		await db().update(SkillSourceConnection, duplicate, { identityKey: source!.identityKey });
		const before = await snapshot();
		const response = await owner.post(path(sourceId)).send(target()).expect(409);
		expect(response.body.meta.reason).toBe('duplicate_source');
		expect(await snapshot()).toEqual(before);
	});

	it('rolls back all skill moves when the source write fails', async () => {
		const { sourceId } = await sourceWithSkills();
		const before = await snapshot();
		vi.spyOn(sources(), 'changeScope').mockRejectedValueOnce(new Error('Write failed'));
		await owner.post(path(sourceId)).send(target()).expect(500);
		expect(await snapshot()).toEqual(before);
	});

	it.each(['viewer', 'outsider', 'global', 'target'] as const)(
		'checks permissions for %s',
		async (role) => {
			const { sourceId } = await sourceWithSkills(role === 'global' ? null : team.id);
			const before = await snapshot();
			const agent = role === 'viewer' ? viewer : role === 'outsider' ? outsider : editor;
			await agent
				.post(path(sourceId))
				.send(role === 'target' ? { scope: 'instance' } : target())
				.expect(role === 'outsider' ? 404 : 403);
			expect(await snapshot()).toEqual(before);
		},
	);

	it('answers 404 while Skill Sync is off', async () => {
		const { sourceId } = await sourceWithSkills();
		postHog.getFeatureFlags.mockResolvedValue({});
		await owner.post(path(sourceId)).send(target()).expect(404);
	});
});
