import {
	SKILL_SYNC_FLAG,
	type MoveSkillSourceDto,
	type SkillSourceMovePreview,
} from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testModules,
} from '@n8n/backend-test-utils';
import { TransactionRunner, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DatabaseConfig } from '@n8n/config';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { SkillSourceRepository } from '../../database/repositories/skill-source.repository';
import { SkillSourceCredentialsProxy } from '../../services/skill-source-credentials-proxy.service';
import { SkillSourceService } from '../../services/skill-source.service';
import { SkillRepository } from '../../database/repositories/skill.repository';
import { SkillRuntimeService } from '../../services/skill-runtime.service';
import { SkillService } from '../../services/skill.service';
import { SkillSyncService } from '../../services/skill-sync.service';
import { SkillsTelemetry } from '../../services/skills-telemetry.service';
import { GitHubSkillSourceClient } from '../../sources/github/github-skill-source-client';
import { createSkill, deleteAllSkills, findLatestSkillVersion, findSkill } from '../../testing';
import { linkSkill } from '../test-utils/skill-source-fixtures';

import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner } from '@test-integration/db/users';
import { saveCredential } from '@test-integration/db/credentials';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

beforeAll(async () => {
	// Concurrent transactions must use separate connections to exercise row locks.
	Container.get(DatabaseConfig).postgresdb.poolSize = 4;
	await testModules.loadModules(['skills', 'agents']);
});

describe('Skill source scope moves', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });
	const postHog = mockInstance(PostHogClient);
	let ownerUser: User;
	let owner: SuperAgentTest;
	let editor: SuperAgentTest;
	let viewer: SuperAgentTest;
	let outsider: SuperAgentTest;
	let from: Project;
	let to: Project;
	const sources = () => Container.get(SkillSourceRepository);
	const db = () => Container.get(DataSource).manager;

	beforeAll(async () => {
		ownerUser = await createOwner();
		owner = server.authAgentFor(ownerUser);
		const editorUser = await createMember();
		const viewerUser = await createMember();
		editor = server.authAgentFor(editorUser);
		viewer = server.authAgentFor(viewerUser);
		outsider = server.authAgentFor(await createMember());
		from = await createTeamProject('Origin');
		to = await createTeamProject('Destination');
		await linkUserToProject(editorUser, from, 'project:editor');
		await linkUserToProject(editorUser, to, 'project:editor');
		await linkUserToProject(viewerUser, from, 'project:viewer');
	});

	beforeEach(async () => {
		vi.restoreAllMocks();
		await Container.get(AgentRepository).delete({});
		await deleteAllSkills();
		await db().delete(SkillSourceConnection, {});
		postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: true });
	});

	async function sourceIn(projectId: string | null, names = ['First skill', 'Second skill']) {
		const skills = await Promise.all(
			names.map(
				async (name) => await createSkill({ projectId, source: 'github', content: { name } }),
			),
		);
		const sourceId = await linkSkill(
			skills[0].id,
			{ projectId, createdById: ownerUser.id },
			{ pendingContentHash: 'pending-hash' },
		);
		for (const skill of skills.slice(1)) {
			await sources().insertImported({
				skillId: skill.id,
				sourceId,
				remoteRef: { path: skill.id },
				baseRevision: 'revision',
				baseContentHash: 'hash',
				skippedFiles: [],
			});
		}
		return { sourceId, skills };
	}

	const request = (fromProjectId: string | null, projectId: string | null): MoveSkillSourceDto => ({
		fromProjectId,
		...(projectId === null ? { scope: 'instance' } : { scope: 'project', projectId }),
	});
	const preview = async (sourceId: string, payload: MoveSkillSourceDto, agent = owner) =>
		(await agent.post(`/skill-sources/${sourceId}/move/preview`).send(payload).expect(200)).body
			.data as SkillSourceMovePreview;
	const move = async (sourceId: string, payload: MoveSkillSourceDto, status = 200, agent = owner) =>
		await agent.post(`/skill-sources/${sourceId}/move`).send(payload).expect(status);

	async function attach(skillId: string, projectId: string, name: string) {
		const agents = Container.get(AgentRepository);
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name,
				projectId,
				integrations: [],
				tools: {},
				versionId: randomUUID(),
			}),
		);
		await Container.get(AgentSkillRepository).replaceDependencies(agent.id, [{ skillId }]);
		return agent;
	}

	it.each(['project-project', 'project-global', 'global-project'] as const)(
		'moves %s without changing versions, links, or pending updates',
		async (direction) => {
			const origin = direction === 'global-project' ? null : from.id;
			const destination = direction === 'project-global' ? null : to.id;
			const { sourceId, skills } = await sourceIn(origin);
			const before = await Promise.all(
				skills.map(async ({ id }) => await findLatestSkillVersion(id)),
			);
			const links = await sources().findLinksBySource(sourceId);
			const track = vi.spyOn(Container.get(SkillsTelemetry), 'changedSourceScope');

			expect((await preview(sourceId, request(origin, destination))).canMove).toBe(true);
			expect(track).not.toHaveBeenCalled();
			await move(sourceId, request(origin, destination));

			expect(await sources().findById(sourceId)).toMatchObject({
				projectId: destination,
				credentialId: null,
			});
			for (const { id } of skills)
				expect(await findSkill(id)).toMatchObject({ projectId: destination });
			expect(
				await Promise.all(skills.map(async ({ id }) => await findLatestSkillVersion(id))),
			).toEqual(before);
			expect(await sources().findLinksBySource(sourceId)).toEqual(links);
			expect(track).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'success', skill_count: 2 }),
				ownerUser.id,
			);
		},
	);

	it('leaves stopped skills in place and moves a source with no members', async () => {
		const { sourceId, skills } = await sourceIn(from.id, ['Detached']);
		await editor.post(`/skill-sources/skills/${skills[0].id}/stop-syncing`).expect(200);
		expect((await preview(sourceId, request(from.id, to.id))).skillCount).toBe(0);
		await move(sourceId, request(from.id, to.id));
		expect(await findSkill(skills[0].id)).toMatchObject({ projectId: from.id });
		expect(await sources().findById(sourceId)).toMatchObject({ projectId: to.id });
	});

	it('reports every name pair and rechecks after the destination changes', async () => {
		const { sourceId, skills } = await sourceIn(from.id);
		const first = await createSkill({ projectId: to.id, content: { name: 'first-skill' } });
		const second = await createSkill({ projectId: to.id, content: { name: 'SECOND_SKILL' } });
		const result = await preview(sourceId, request(from.id, to.id));
		expect(result.canMove).toBe(false);
		expect(result.nameConflicts).toEqual(
			expect.arrayContaining([
				{
					moving: { id: skills[0].id, name: 'First skill' },
					existing: { id: first.id, name: 'first-skill' },
				},
				{
					moving: { id: skills[1].id, name: 'Second skill' },
					existing: { id: second.id, name: 'SECOND_SKILL' },
				},
			]),
		);
		const response = await move(sourceId, request(from.id, to.id), 409);
		expect(response.body.meta.preview.nameConflicts).toHaveLength(2);
		for (const { id } of skills) expect(await findSkill(id)).toMatchObject({ projectId: from.id });
		expect(await sources().findById(sourceId)).toMatchObject({ projectId: from.id });
	});

	it('refuses a clash created after a successful preview', async () => {
		const { sourceId } = await sourceIn(from.id);
		expect((await preview(sourceId, request(from.id, to.id))).canMove).toBe(true);
		await createSkill({ projectId: to.id, content: { name: 'First skill' } });
		await move(sourceId, request(from.id, to.id), 409);
		expect(await sources().findById(sourceId)).toMatchObject({ projectId: from.id });
	});

	it('lists agents that lose access, but permits a move to Global', async () => {
		const { sourceId, skills } = await sourceIn(from.id);
		const agent = await attach(skills[0].id, from.id, 'Support agent');
		const result = await preview(sourceId, request(from.id, to.id));
		expect(result.usageConflicts).toEqual([
			{
				skill: { id: skills[0].id, name: 'First skill' },
				agents: [{ id: agent.id, name: 'Support agent' }],
				hiddenAgents: 0,
			},
		]);
		await move(sourceId, request(from.id, to.id), 409);
		await move(sourceId, request(from.id, null));
	});

	it('counts agents outside the requesting user’s visible projects', async () => {
		const { sourceId, skills } = await sourceIn(from.id);
		const hidden = await createTeamProject('Hidden');
		await attach(skills[0].id, hidden.id, 'Hidden agent');
		const result = await preview(sourceId, request(from.id, to.id), editor);
		expect(result.usageConflicts[0]).toMatchObject({ agents: [], hiddenAgents: 1 });
		expect(JSON.stringify(result)).not.toContain('Hidden agent');
	});

	it('excludes itself from duplicates when leaving Global and blocks another source in the destination', async () => {
		const { sourceId } = await sourceIn(null);
		const { sourceId: other } = await sourceIn(to.id, ['Other']);
		const source = await sources().findById(sourceId);
		await db().update(SkillSourceConnection, { id: other }, { identityKey: source!.identityKey });
		const result = await preview(sourceId, request(null, to.id));
		expect(result.duplicate).toMatchObject({ kind: 'blocked', sourceId: other });
		await move(sourceId, request(null, to.id), 409);
	});

	it('checks local credential eligibility without resolving credentials or contacting GitHub', async () => {
		const { sourceId } = await sourceIn(from.id);
		const original = await saveCredential(
			{ name: 'Original', type: 'githubApi', data: {} },
			{ project: from, role: 'credential:owner' },
		);
		const destination = await saveCredential(
			{ name: 'Destination', type: 'githubApi', data: {} },
			{ project: to, role: 'credential:owner' },
		);
		await db().update(SkillSourceConnection, { id: sourceId }, { credentialId: original.id });
		const resolve = vi
			.spyOn(Container.get(SkillSourceCredentialsProxy), 'resolve')
			.mockRejectedValue(new Error('Must not resolve'));
		const client = Container.get(GitHubSkillSourceClient);
		const remote = vi.spyOn(client, 'probe').mockRejectedValue(new Error('GitHub unavailable'));
		const payload = request(from.id, to.id);
		expect((await preview(sourceId, payload)).credential).toEqual({
			required: true,
			reason: 'credential_missing',
		});
		expect(
			(await preview(sourceId, { ...payload, credentialId: original.id })).credential.reason,
		).toBe('credential_out_of_scope');
		await move(sourceId, payload, 409);
		expect(await sources().findById(sourceId)).toMatchObject({
			projectId: from.id,
			credentialId: original.id,
		});
		await move(sourceId, { ...payload, credentialId: destination.id });
		expect(await sources().findById(sourceId)).toMatchObject({
			projectId: to.id,
			credentialId: destination.id,
		});
		expect(resolve).not.toHaveBeenCalled();
		expect(remote).not.toHaveBeenCalled();
	});

	it('requires origin delete and destination create rights, and hides invisible sources', async () => {
		const { sourceId } = await sourceIn(from.id);
		await move(sourceId, request(from.id, to.id), 403, viewer);
		await move(sourceId, request(from.id, to.id), 404, outsider);
		await move(sourceId, request(from.id, null), 403, editor);
		await move(sourceId, request(from.id, to.id), 200, editor);
	});

	it('allows a write-only destination and hides its conflicting skill details', async () => {
		const user = await createMember();
		await linkUserToProject(user, from, 'project:editor');
		const role = await createCustomRoleWithScopeSlugs(['projectSkill:create'], {
			roleType: 'project',
		});
		await linkUserToProject(user, to, role.slug);
		const agent = server.authAgentFor(user);
		const { sourceId } = await sourceIn(from.id, ['Incoming']);
		const conflict = await createSkill({ projectId: to.id, content: { name: 'incoming' } });
		const result = await preview(sourceId, request(from.id, to.id), agent);
		expect(result.nameConflicts[0].existing).toBeNull();
		expect(JSON.stringify(result)).not.toContain(conflict.id);
		await owner.delete(`/skills/${conflict.id}`).expect(200);
		await move(sourceId, request(from.id, to.id), 200, agent);
	});

	it('gates both routes before body validation', async () => {
		postHog.getFeatureFlags.mockResolvedValue({});
		await owner.post(`/skill-sources/${randomUUID()}/move`).send({}).expect(404);
		await owner.post(`/skill-sources/${randomUUID()}/move/preview`).send({}).expect(404);
	});

	it('refuses a stale source scope', async () => {
		const { sourceId } = await sourceIn(from.id);
		await move(sourceId, request(from.id, to.id));
		await move(sourceId, request(from.id, null), 409);
		expect(await sources().findById(sourceId)).toMatchObject({ projectId: to.id });
	});

	it('rolls back every skill if writing the source fails', async () => {
		const { sourceId, skills } = await sourceIn(from.id);
		vi.spyOn(sources(), 'moveScope').mockRejectedValueOnce(new Error('Write failed'));
		const telemetry = vi.spyOn(Container.get(SkillsTelemetry), 'changedSourceScope');
		await move(sourceId, request(from.id, to.id), 500);
		for (const { id } of skills) expect(await findSkill(id)).toMatchObject({ projectId: from.id });
		expect(await sources().findById(sourceId)).toMatchObject({ projectId: from.id });
		expect(telemetry).not.toHaveBeenCalledWith(
			expect.objectContaining({ status: 'success' }),
			expect.anything(),
		);
	});

	it('ignores the health and cursor from a check that started before the move', async () => {
		const { sourceId } = await sourceIn(from.id);
		const before = (await sources().findById(sourceId))!;
		await move(sourceId, request(from.id, to.id));
		await sources().recordCheck(sourceId, {
			checkedAt: new Date(),
			readScope: before,
			errorReason: 'credential_invalid',
			probeCursor: { from: before.probeCursor, to: 'old-revision' },
		});
		await sources().recordDelayed(before);
		expect(await sources().findById(sourceId)).toMatchObject({
			projectId: to.id,
			lastErrorReason: null,
			probeCursor: null,
		});
	});

	it('serializes two moves from the same scope', async () => {
		const { sourceId, skills } = await sourceIn(from.id);
		const service = Container.get(SkillSourceService);
		const results = await Promise.allSettled([
			service.move(ownerUser, sourceId, request(from.id, to.id)),
			service.move(ownerUser, sourceId, request(from.id, null)),
		]);
		expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
		const source = await sources().findById(sourceId);
		for (const { id } of skills)
			expect(await findSkill(id)).toMatchObject({ projectId: source!.projectId });
	});

	it('keeps a concurrent stop consistent with the completed move', async () => {
		const { sourceId, skills } = await sourceIn(from.id);
		const results = await Promise.allSettled([
			Container.get(SkillSourceService).move(ownerUser, sourceId, request(from.id, to.id)),
			Container.get(SkillSyncService).stopSyncing(ownerUser, skills[0].id),
		]);
		expect(results.every(({ status }) => status === 'fulfilled')).toBe(true);
		expect(await sources().findLinkBySkillId(skills[0].id)).toBeNull();
		expect(await findSkill(skills[1].id)).toMatchObject({ projectId: to.id });
	});

	it('serializes a destination name create with the move', async () => {
		const { sourceId, skills } = await sourceIn(from.id);
		const results = await Promise.allSettled([
			Container.get(SkillSourceService).move(ownerUser, sourceId, request(from.id, to.id)),
			Container.get(SkillService).createTrusted({
				target: { projectId: to.id },
				skill: { name: 'First skill', description: 'Test', instructions: 'Test' },
				source: 'ui',
				createdById: ownerUser.id,
				checkNameTaken: true,
			}),
		]);
		expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
		const source = await sources().findById(sourceId);
		for (const { id } of skills)
			expect(await findSkill(id)).toMatchObject({ projectId: source!.projectId });
	});
	it('serializes a destination rename with the move', async () => {
		const { sourceId } = await sourceIn(from.id);
		const existing = await createSkill({ projectId: to.id, content: { name: 'Original name' } });
		const service = Container.get(SkillService);
		const detail = await service.get(ownerUser, existing.id);
		const results = await Promise.allSettled([
			Container.get(SkillSourceService).move(ownerUser, sourceId, request(from.id, to.id)),
			service.update(ownerUser, existing.id, {
				name: 'First skill',
				baseSkillHash: detail.skillHash,
			}),
		]);
		expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
	});

	it('keeps an agent attachment consistent with a concurrent source move', async () => {
		const { sourceId, skills } = await sourceIn(null);
		const agent = await attach(skills[0].id, from.id, 'Support');
		await Container.get(AgentSkillRepository).replaceDependencies(agent.id, []);
		const results = await Promise.allSettled([
			Container.get(SkillSourceService).move(ownerUser, sourceId, request(null, to.id)),
			Container.get(TransactionRunner).run({}, async (ctx) => {
				const refs = await Container.get(AgentSkillRefsService).checkRefs(
					agent,
					[{ id: skills[0].id }],
					ctx,
				);
				await Container.get(AgentSkillRepository).replaceDependencies(
					agent.id,
					refs.map(({ id }) => ({ skillId: id })),
					ctx,
				);
			}),
		]);
		expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
	});

	it.runIf(process.env.DB_TYPE === 'postgresdb')(
		'rechecks an attachment that waited for a source move lock',
		async () => {
			const { sourceId, skills } = await sourceIn(null);
			const agent = await attach(skills[0].id, from.id, 'Support');
			await Container.get(AgentSkillRepository).replaceDependencies(agent.id, []);
			const locked = createDeferredPromise();
			const release = createDeferredPromise();
			const attaching = createDeferredPromise();
			const repository = Container.get(SkillRepository);
			const lock = repository.lockForEdit.bind(repository);
			vi.spyOn(repository, 'lockForEdit').mockImplementationOnce(async (ids, ctx) => {
				await lock(ids, ctx);
				locked.resolve(undefined);
				await release.promise;
			});
			const runtime = Container.get(SkillRuntimeService);
			const attachLock = runtime.lockForAttach.bind(runtime);
			vi.spyOn(runtime, 'lockForAttach').mockImplementationOnce(async (ids, ctx) => {
				attaching.resolve(undefined);
				await attachLock(ids, ctx);
			});
			const moving = Container.get(SkillSourceService).move(
				ownerUser,
				sourceId,
				request(null, to.id),
			);
			await locked.promise;
			const attachResult = Container.get(TransactionRunner).run({}, async (ctx) => {
				await Container.get(AgentSkillRefsService).checkRefs(agent, [{ id: skills[0].id }], ctx);
			});
			const refused = expect(attachResult).rejects.toThrow('is not available to this agent');
			try {
				await attaching.promise;
			} finally {
				release.resolve(undefined);
			}
			await moving;
			await refused;
		},
	);
});
