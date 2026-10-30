import {
	SKILL_SYNC_FLAG,
	type SkillSourceConnectResponse,
	type SkillSourceDiscovery,
	type SkillSourceListItem,
	type SkillSourceUpdates,
	type SkillUpdateReview,
	type SkillUpdatesAcceptResponse,
} from '@n8n/api-types';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import nock from 'nock';
import { randomUUID } from 'node:crypto';

import { createSkill, deleteAllSkills, findLatestSkillVersion } from '../../testing';
import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { SkillSourceLink } from '../../database/entities/skill-source-link.entity';
import { SkillRepository } from '../../database/repositories/skill.repository';
import { SkillSyncService } from '../../services/skill-sync.service';
import { SkillsTelemetry } from '../../services/skills-telemetry.service';
import { GitHubSkillSourceClient } from '../../sources/github/github-skill-source-client';
import { FakeGitHub } from '../test-utils/fake-github';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentPublishHistoryRepository } from '@/modules/agents/repositories/agent-publish-history.repository';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { PostHogClient } from '@/posthog';

import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

const REPO = 'https://github.com/acme/skills';

const skillMd = (name: string, body = `Follow ${name}.`, description = `${name} description`) =>
	`---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;

const FILES = {
	'README.md': '# Skills\n',
	'skills/docx/SKILL.md': skillMd('docx'),
	'skills/docx/references/style.md': '# Style\n',
	'skills/xlsx/SKILL.md': skillMd('xlsx'),
	'skills/pptx/SKILL.md': skillMd('pptx'),
};

type Body<T> = { data: T; meta?: { reason: string } };

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents']);
	nock.disableNetConnect();
	nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});

afterAll(() => {
	nock.enableNetConnect();
});

describe('Review of skill updates', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });
	const postHog = mockInstance(PostHogClient);
	const github = new FakeGitHub();
	let ownerUser: User;
	let memberUser: User;
	let owner: SuperAgentTest;
	let editor: SuperAgentTest;
	let viewer: SuperAgentTest;
	let outsider: SuperAgentTest;
	let team: Project;

	const db = () => Container.get(DataSource).manager;
	const sync = () => Container.get(SkillSyncService);

	beforeAll(async () => {
		ownerUser = await createOwner();
		memberUser = await createMember();
		const viewerUser = await createMember();
		owner = server.authAgentFor(ownerUser);
		editor = server.authAgentFor(memberUser);
		viewer = server.authAgentFor(viewerUser);
		outsider = server.authAgentFor(await createMember());
		team = await createTeamProject('Marketing');
		await linkUserToProject(memberUser, team, 'project:editor');
		await linkUserToProject(viewerUser, team, 'project:viewer');
	});

	beforeEach(async () => {
		await Container.get(AgentRepository).delete({});
		await deleteAllSkills();
		await db().delete(SkillSourceConnection, {});
		postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: true });
		(Reflect.get(sync(), 'retryAt') as Map<string, number>).clear();
		// The fake gives the same SHAs in each test, so commit details cached by one test stay.
		(
			Reflect.get(Container.get(GitHubSkillSourceClient), 'provenances') as { clear(): void }
		).clear();
		github.start();
		github.push('acme/skills', FILES);
	});

	afterEach(() => {
		github.stop();
		vi.restoreAllMocks();
	});

	/** Imports every skill into the scope, and answers their ids by name. */
	const importAll = async (
		agent: SuperAgentTest = editor,
		scope: Record<string, unknown> = { scope: 'project', projectId: team.id },
	) => {
		const discovery = (
			await agent
				.post('/skill-sources/discover')
				.send({ url: REPO, ...scope })
				.expect(200)
		).body.data as SkillSourceDiscovery;
		const { imported, sourceId } = (
			await agent
				.post('/skill-sources')
				.send({ url: REPO, ...scope, skillKeys: discovery.skills.map(({ key }) => key) })
				.expect(200)
		).body.data as SkillSourceConnectResponse;
		const ids = Object.fromEntries(imported.map(({ name, skillId }) => [name, skillId]));
		return { sourceId, docx: ids.docx, xlsx: ids.xlsx, pptx: ids.pptx };
	};

	/** Pushes a change and lets the check store it. */
	const pushAndCheck = async (files: Record<string, string>, message = 'Change skills') => {
		const sha = github.push('acme/skills', { ...github.files('acme/skills'), ...files }, 'main', {
			message,
			author: 'lena',
		});
		await sync().checkAll();
		return sha;
	};

	const updatesOf = async (agent: SuperAgentTest, sourceId: string, status = 200) =>
		(await agent.get(`/skill-sources/${sourceId}/updates`).expect(status))
			.body as Body<SkillSourceUpdates>;

	const reviewOf = async (agent: SuperAgentTest, skillId: string, status = 200) =>
		(await agent.get(`/skill-sources/skills/${skillId}/update`).expect(status))
			.body as Body<SkillUpdateReview>;

	const decide = async (
		agent: SuperAgentTest,
		action: 'accept' | 'skip',
		skillId: string,
		body: object,
		status = 200,
	) =>
		(
			await agent
				.post(`/skill-sources/skills/${skillId}/update/${action}`)
				.send(body)
				.expect(status)
		).body as Body<{ skillId: string; name: string; version: number }>;

	const linkOf = async (skillId: string) =>
		await db().findOneByOrFail(SkillSourceLink, { skillId });

	describe('Sources tab', () => {
		it('lists the sources the user can see, with skills and updates', async () => {
			const { sourceId } = await importAll();
			await pushAndCheck({
				'skills/docx/SKILL.md': skillMd('docx', 'v2'),
				'skills/xlsx/SKILL.md': skillMd('xlsx', 'v2', 'x'.repeat(5000)),
			});

			const { body } = await editor.get('/skill-sources').expect(200);
			const [source] = body.data as SkillSourceListItem[];

			expect(source).toMatchObject({
				id: sourceId,
				type: 'github',
				label: 'acme/skills',
				projectId: team.id,
				projectName: 'Marketing',
				projectType: 'team',
				skillCount: 3,
				updatesAvailable: 1,
				updatesBlocked: 1,
				canReview: true,
			});
			expect((await viewer.get('/skill-sources').expect(200)).body.data[0]).toMatchObject({
				canReview: false,
			});
			expect((await outsider.get('/skill-sources').expect(200)).body.data).toEqual([]);
		});

		it('checks a source now, for a user who may change it', async () => {
			const { sourceId } = await importAll();
			await db().update(SkillSourceConnection, { id: sourceId }, { lastCheckedAt: new Date(0) });
			github.push('acme/skills', {
				...github.files('acme/skills'),
				'skills/docx/SKILL.md': skillMd('docx', 'v2'),
			});

			const { body } = await editor.post(`/skill-sources/${sourceId}/check`).expect(200);

			expect(body.data).toMatchObject({ label: 'acme/skills', updatesFound: 1, throttled: false });
			await viewer.post(`/skill-sources/${sourceId}/check`).expect(403);
			await outsider.post(`/skill-sources/${sourceId}/check`).expect(404);
		});

		it('answers 404 with the flag off', async () => {
			postHog.getFeatureFlags.mockResolvedValue({});

			await editor.get('/skill-sources').expect(404);
		});
	});

	describe('Updates from', () => {
		it('lists each update with its check, content and the commit', async () => {
			const { sourceId, docx, xlsx } = await importAll();
			const sha = await pushAndCheck(
				{
					'skills/docx/SKILL.md': skillMd('docx', 'See https://evil.example.com.'),
					'skills/xlsx/SKILL.md': skillMd('xlsx', 'v2', 'x'.repeat(5000)),
				},
				'docs: new examples',
			);

			const { data } = await updatesOf(editor, sourceId);

			expect(data.source).toMatchObject({ id: sourceId, updatesAvailable: 1, updatesBlocked: 1 });
			expect(data.commit).toMatchObject({
				revision: sha,
				message: 'docs: new examples',
				author: 'lena',
				date: '2026-10-29T12:00:00Z',
				commits: 1,
			});
			expect(data.updates.map((update) => [update.skillId, update.check.verdict])).toEqual([
				[docx, 'needs_review'],
				[xlsx, 'blocked'],
			]);
			const [docxUpdate] = data.updates;
			expect(docxUpdate).toMatchObject({
				name: 'docx',
				location: 'skills/docx',
				revision: sha,
				nameClash: null,
				impact: { nextVersion: 2, followingAgents: 0, publishedAgents: 0 },
			});
			expect(docxUpdate.current.instructions).toBe('Follow docx.');
			expect(docxUpdate.update?.instructions).toBe('See https://evil.example.com.');
			expect(docxUpdate.update?.references).toEqual([
				{ path: 'references/style.md', content: '# Style\n' },
			]);
		});

		it('counts the agents that follow the skill and the ones that pinned it', async () => {
			const { docx } = await importAll();
			await attachToNewAgent(docx, 'Follower', team.id);
			const version = await findLatestSkillVersion(docx);
			await attachToNewAgent(docx, 'Published', team.id, { pin: version?.id });
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });

			const { data } = await reviewOf(editor, docx);

			expect(data.update.impact).toEqual({
				nextVersion: 2,
				followingAgents: 1,
				publishedAgents: 1,
			});
		});

		it('shows the revisions when GitHub cannot describe the commits', async () => {
			const { docx } = await importAll();
			const sha = await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });
			github.failWith = 500;

			const { data } = await reviewOf(editor, docx);

			expect(data.commit).toMatchObject({
				revision: sha,
				message: null,
				author: null,
				commits: null,
			});
		});

		it('lets a viewer read the updates but not review them, and hides them from an outsider', async () => {
			const { sourceId, docx } = await importAll();
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });

			expect((await updatesOf(viewer, sourceId)).data.source.canReview).toBe(false);
			expect((await reviewOf(viewer, docx)).data.update.skillId).toBe(docx);
			await updatesOf(outsider, sourceId, 404);
			expect((await reviewOf(outsider, docx, 404)).meta).toEqual({ reason: 'skill_deleted' });
		});

		it('lets a member read the updates of a Global source, which only admins review', async () => {
			const { sourceId, docx } = await importAll(owner, { scope: 'instance' });
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });
			const { contentHash } = (await reviewOf(editor, docx)).data.update;

			expect((await updatesOf(editor, sourceId)).data.source.canReview).toBe(false);
			await decide(editor, 'accept', docx, { contentHash }, 403);
			await decide(owner, 'accept', docx, { contentHash });
		});
	});

	describe('Accept', () => {
		it('stores exactly the reviewed content as the next version and moves the base', async () => {
			const reviewedUpdate = vi.spyOn(Container.get(SkillsTelemetry), 'reviewedUpdate');
			const updated = vi.spyOn(Container.get(SkillsTelemetry), 'updated');
			const { docx } = await importAll();
			const files = github.files('acme/skills');
			delete files['skills/docx/references/style.md'];
			const sha = github.push('acme/skills', {
				...files,
				'skills/docx/SKILL.md': skillMd('docx', 'v2'),
			});
			await sync().checkAll();
			const { update } = (await reviewOf(editor, docx)).data;

			const { data } = await decide(editor, 'accept', docx, { contentHash: update.contentHash });

			expect(data).toEqual({ skillId: docx, name: 'docx', version: 2 });
			const version = await findLatestSkillVersion(docx);
			expect(version).toMatchObject({
				version: 2,
				instructions: 'v2',
				sourceRevision: sha,
			});
			expect(await linkOf(docx)).toMatchObject({
				state: 'up_to_date',
				baseRevision: sha,
				baseContentHash: update.contentHash,
				pendingContentHash: null,
			});
			// Exactly the reviewed content: the version has the hash that the user reviewed.
			const row = (await Container.get(SkillRepository).findLatestSaved([docx])).get(docx);
			expect(row?.version.contentHash).toBe(update.contentHash);
			// The update had no references, so the version has none.
			const { body } = await editor.get(`/skills/${docx}`).expect(200);
			expect(body.data.skill.references).toBeUndefined();
			expect(reviewedUpdate).toHaveBeenCalledWith(
				{
					provider: 'github',
					action: 'accept',
					verdict: 'pass',
					bulk: false,
					status: 'success',
				},
				memberUser.id,
			);
			expect(updated).toHaveBeenCalledTimes(1);

			// The next check finds nothing new.
			await sync().checkAll();
			expect(await linkOf(docx)).toMatchObject({ state: 'up_to_date' });
		});

		it('keeps the pinned version of a published agent', async () => {
			const { docx } = await importAll();
			const version = await findLatestSkillVersion(docx);
			const published = await attachToNewAgent(docx, 'Published', team.id, { pin: version?.id });
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });
			const { contentHash } = (await reviewOf(editor, docx)).data.update;

			await decide(editor, 'accept', docx, { contentHash });

			const [pin] = await Container.get(AgentSkillRepository).findPins(published.versionId);
			expect(pin).toMatchObject({ skillId: docx, skillVersionId: version?.id });
		});

		it('refuses a review that is no longer the update, as a newer change replaced it', async () => {
			const reviewedUpdate = vi.spyOn(Container.get(SkillsTelemetry), 'reviewedUpdate');
			const { docx } = await importAll();
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });
			const { contentHash } = (await reviewOf(editor, docx)).data.update;
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v3') });

			const body = await decide(editor, 'accept', docx, { contentHash }, 409);

			expect(body.meta).toEqual({ reason: 'stale' });
			expect((await findLatestSkillVersion(docx))?.version).toBe(1);
			expect(reviewedUpdate).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'accept', status: 'failure', reason: 'stale' }),
				memberUser.id,
			);
		});

		it('refuses a blocked update, and one that needs review without the box ticked', async () => {
			const { docx, xlsx } = await importAll();
			await pushAndCheck({
				'skills/docx/SKILL.md': skillMd('docx', 'See https://evil.example.com.'),
				'skills/xlsx/SKILL.md': skillMd('xlsx', 'v2', 'x'.repeat(5000)),
			});
			const review = (await updatesOf(editor, (await linkOf(docx)).sourceId)).data.updates;
			const hashOf = (skillId: string) =>
				review.find((update) => update.skillId === skillId)?.contentHash;

			expect(
				(await decide(editor, 'accept', xlsx, { contentHash: hashOf(xlsx) }, 422)).meta,
			).toEqual({ reason: 'blocked_by_check' });
			expect(
				(await decide(editor, 'accept', docx, { contentHash: hashOf(docx) }, 422)).meta,
			).toEqual({ reason: 'review_required' });
			await decide(editor, 'accept', docx, { contentHash: hashOf(docx), reviewedWarnings: true });
		});

		it('names an upstream rename that clashes, and refuses to accept it', async () => {
			const { docx } = await importAll();
			await createSkill({ projectId: team.id, content: { name: 'taken-name' } });
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('taken-name', 'v2') });

			const { update } = (await reviewOf(editor, docx)).data;
			expect(update.nameClash).toEqual({ name: 'taken-name' });

			const body = await decide(editor, 'accept', docx, { contentHash: update.contentHash }, 409);
			expect(body.meta).toEqual({ reason: 'name_clash' });
			expect(await linkOf(docx)).toMatchObject({ state: 'update_available' });
		});

		it('answers skill_deleted for a skill that is gone', async () => {
			const { docx } = await importAll();
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });
			const { contentHash } = (await reviewOf(editor, docx)).data.update;
			await editor.delete(`/skills/${docx}`).expect(200);

			const body = await decide(editor, 'accept', docx, { contentHash }, 404);

			expect(body.meta).toEqual({ reason: 'skill_deleted' });
		});

		it('accepts once when two users accept at the same time', async () => {
			const { docx } = await importAll();
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });
			const { contentHash } = (await reviewOf(editor, docx)).data.update;

			const statuses = await Promise.all([
				editor.post(`/skill-sources/skills/${docx}/update/accept`).send({ contentHash }),
				owner.post(`/skill-sources/skills/${docx}/update/accept`).send({ contentHash }),
			]);

			expect(statuses.map(({ status }) => status).sort()).toEqual([200, 409]);
			expect((await findLatestSkillVersion(docx))?.version).toBe(2);
		});

		it('refuses a viewer, hides the skill from an outsider, and is off with the flag', async () => {
			const { docx } = await importAll();
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });
			const { contentHash } = (await reviewOf(editor, docx)).data.update;

			await decide(viewer, 'accept', docx, { contentHash }, 403);
			await decide(viewer, 'skip', docx, { contentHash }, 403);
			await decide(outsider, 'accept', docx, { contentHash }, 404);
			postHog.getFeatureFlags.mockResolvedValue({});
			await decide(editor, 'accept', docx, { contentHash }, 404);
			await decide(editor, 'accept', docx, {}, 404);
		});
	});

	describe('Skip', () => {
		it('hides the update until the content changes again', async () => {
			const reviewedUpdate = vi.spyOn(Container.get(SkillsTelemetry), 'reviewedUpdate');
			const { docx } = await importAll();
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });
			const { contentHash } = (await reviewOf(editor, docx)).data.update;

			await decide(editor, 'skip', docx, { contentHash });

			expect(await linkOf(docx)).toMatchObject({
				state: 'up_to_date',
				skippedContentHash: contentHash,
				pendingContentHash: null,
			});
			expect((await findLatestSkillVersion(docx))?.version).toBe(1);
			expect(reviewedUpdate).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'skip', verdict: 'pass', status: 'success' }),
				memberUser.id,
			);
			await pushAndCheck({ 'README.md': '# Other\n' });
			expect(await linkOf(docx)).toMatchObject({ state: 'up_to_date' });
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v3') });
			expect(await linkOf(docx)).toMatchObject({ state: 'update_available' });
		});

		it('skips a blocked update, and refuses a stale review', async () => {
			const { xlsx } = await importAll();
			await pushAndCheck({ 'skills/xlsx/SKILL.md': skillMd('xlsx', 'v2', 'x'.repeat(5000)) });
			const { contentHash } = (await reviewOf(editor, xlsx)).data.update;

			expect((await decide(editor, 'skip', xlsx, { contentHash: 'other' }, 409)).meta).toEqual({
				reason: 'stale',
			});
			await decide(editor, 'skip', xlsx, { contentHash });
			expect((await decide(editor, 'skip', xlsx, { contentHash }, 409)).meta).toEqual({
				reason: 'stale',
			});
		});
	});

	describe('Update all', () => {
		const acceptAll = async (agent: SuperAgentTest, sourceId: string, body: object, status = 200) =>
			(await agent.post(`/skill-sources/${sourceId}/updates/accept`).send(body).expect(status))
				.body as Body<SkillUpdatesAcceptResponse>;

		it('accepts each reviewed update, and lists the ones that cannot come in', async () => {
			const reviewedUpdate = vi.spyOn(Container.get(SkillsTelemetry), 'reviewedUpdate');
			const { sourceId, docx, xlsx, pptx } = await importAll();
			await pushAndCheck({
				'skills/docx/SKILL.md': skillMd('docx', 'v2'),
				'skills/xlsx/SKILL.md': skillMd('xlsx', 'See https://evil.example.com.'),
				'skills/pptx/SKILL.md': skillMd('pptx', 'v2', 'x'.repeat(5000)),
			});
			const { updates } = (await updatesOf(editor, sourceId)).data;
			const reviewed = updates.map(({ skillId, contentHash }) => ({ skillId, contentHash }));

			const { data } = await acceptAll(editor, sourceId, { updates: reviewed });

			expect(data.accepted).toEqual([{ skillId: docx, name: 'docx', version: 2 }]);
			expect(data.failed).toEqual(
				expect.arrayContaining([
					{ skillId: xlsx, reason: 'review_required' },
					{ skillId: pptx, reason: 'blocked_by_check' },
				]),
			);
			expect(reviewedUpdate).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'accept', bulk: true, status: 'success' }),
				memberUser.id,
			);

			const again = await acceptAll(editor, sourceId, {
				updates: reviewed.filter(({ skillId }) => skillId === xlsx),
				reviewedWarnings: true,
			});
			expect(again.data.accepted).toEqual([{ skillId: xlsx, name: 'xlsx', version: 2 }]);
		});

		it('refuses a skill of another source as stale, and a viewer', async () => {
			const { sourceId, docx } = await importAll();
			await pushAndCheck({ 'skills/docx/SKILL.md': skillMd('docx', 'v2') });
			const { contentHash } = (await reviewOf(editor, docx)).data.update;
			const other = await createSkill({ projectId: team.id });

			const { data } = await acceptAll(editor, sourceId, {
				updates: [{ skillId: other.id, contentHash }],
			});
			expect(data.failed).toEqual([{ skillId: other.id, reason: 'stale' }]);

			await acceptAll(viewer, sourceId, { updates: [{ skillId: docx, contentHash }] }, 403);
			await acceptAll(outsider, sourceId, { updates: [{ skillId: docx, contentHash }] }, 404);
		});
	});

	async function attachToNewAgent(
		skillId: string,
		name: string,
		projectId: string,
		options: { pin?: string } = {},
	) {
		const agents = Container.get(AgentRepository);
		const versionId = randomUUID();
		const agent = await agents.save(
			agents.create({ id: randomUUID(), name, projectId, integrations: [], tools: {}, versionId }),
		);
		if (options.pin) {
			// A published version that pins the skill. The draft no longer uses it.
			const histories = Container.get(AgentHistoryRepository);
			await histories.save(histories.create({ versionId, agentId: agent.id, author: 'Test' }));
			await Container.get(AgentPublishHistoryRepository).record(
				agent.id,
				versionId,
				'activated',
				ownerUser,
				{},
			);
			await agents.update({ id: agent.id }, { activeVersionId: versionId });
			await Container.get(AgentSkillRepository).insertPins([
				{ agentVersionId: versionId, skillId, skillVersionId: options.pin },
			]);
		} else {
			await Container.get(AgentSkillRepository).replaceDependencies(agent.id, [{ skillId }]);
		}
		return { ...agent, versionId };
	}
});
