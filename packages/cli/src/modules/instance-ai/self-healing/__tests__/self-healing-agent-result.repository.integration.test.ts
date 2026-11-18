import type { SelfHealingAgentApplyProgress } from '@n8n/api-types';
import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

import { createUser } from '@test-integration/db/users';

import { SelfHealingAgentResult } from '../agents/database/self-healing-agent-result.entity';
import {
	SelfHealingAgentResultRepository,
	type SelfHealingAgentInboxAccess,
} from '../agents/database/self-healing-agent-result.repository';
import { createAgentRow, deleteAgentRow } from './support/agent';
import { addReviewer, createConfiguration, disableInstanceAdmins } from './support/configuration';

const usage = { credits: 1, turns: 2, durationSeconds: 30 };
const emptyProgress: SelfHealingAgentApplyProgress = {
	evalsApplied: false,
	savedSkillIds: [],
	savedVersionId: null,
	agentPublished: false,
};
const LEASE_MS = 10 * 60 * 1000;
const staleBefore = () => new Date(Date.now() - LEASE_MS);

let results: SelfHealingAgentResultRepository;
let db: DataSource;
let scope: {
	configurationId: number;
	projectId: string;
	agentId: string;
	backgroundUserId: string;
};
let access: SelfHealingAgentInboxAccess;
let project: Project;

beforeAll(async () => {
	await testModules.loadModules(['instance-ai']);
	await testDb.init();
	results = Container.get(SelfHealingAgentResultRepository);
	db = Container.get(DataSource);
});

beforeEach(async () => {
	// The user is the listed reviewer of the configuration and an editor of the project.
	const user = await createUser();
	project = await createTeamProject();
	await linkUserToProject(user, project, 'project:editor');
	scope = {
		configurationId: (await createConfiguration(project.id, user.id)).id,
		projectId: project.id,
		agentId: await createAgentRow(project.id),
		backgroundUserId: user.id,
	};
	access = { userId: user.id, hasGlobalAccess: false, projectRoles: ['project:editor'] };
});

afterEach(async () => {
	await db.createQueryBuilder().delete().from(SelfHealingAgentResult).execute();
});

afterAll(async () => await testDb.terminate());

async function createResult(summary = 'Use the order lookup tool.') {
	return await results.createResult(
		{
			...scope,
			agentName: 'Support agent',
			baseVersionId: 'version-1',
			goals: ['quality'],
			trigger: 'manual',
			traceWindowStart: null,
			traceWindowEnd: new Date(),
			traceCount: 3,
			summary,
			report: 'The agent called the wrong lookup tool.',
			edits: [{ kind: 'instructions', before: 'Old', after: 'New' }],
			evalCases: [],
			evidence: null,
			usage,
		},
		{},
	);
}

async function setUpdatedAt(id: string, updatedAt: Date) {
	await db
		.createQueryBuilder()
		.update(SelfHealingAgentResult)
		.set({ updatedAt })
		.where('id = :id', { id })
		.execute();
}

async function startApplyAt(id: string, applyStartedAt: Date) {
	await db
		.createQueryBuilder()
		.update(SelfHealingAgentResult)
		.set({ applyStartedAt })
		.where('id = :id', { id })
		.execute();
}

it('saves an open proposal with no apply progress', async () => {
	const result = await createResult();
	expect(await results.getResult(result.id, scope.projectId)).toMatchObject({
		reviewState: 'open',
		appliedAutomatically: false,
		publishedVersionId: null,
		applyProgress: emptyProgress,
		applyError: null,
		applyStartedAt: null,
		closedAt: null,
		closedById: null,
		edits: [{ kind: 'instructions', before: 'Old', after: 'New' }],
		usage,
	});
	expect(await results.getOpenForAgent(scope.agentId)).toMatchObject({
		id: result.id,
		projectId: scope.projectId,
		baseVersionId: 'version-1',
		applyProgress: emptyProgress,
	});
	expect(await results.findResult(result.id)).toMatchObject({ id: result.id });
	expect(await results.findResult('missing')).toBeNull();
});

it('does not return a proposal of another project', async () => {
	const result = await createResult();
	const other = await createTeamProject();
	await expect(results.getResult(result.id, other.id)).rejects.toThrow(NotFoundError);
	await expect(results.getResult('missing', scope.projectId)).rejects.toThrow(NotFoundError);
});

it('gives the apply claim to one caller until the claim is stale', async () => {
	const result = await createResult();
	const claims = await Promise.all([
		results.claimApply(result.id, staleBefore()),
		results.claimApply(result.id, staleBefore()),
	]);
	expect(claims.filter(Boolean)).toHaveLength(1);
	expect(await results.claimApply(result.id, staleBefore())).toBe(false);

	// A claim from an apply that crashed does not block the proposal.
	await startApplyAt(result.id, new Date(Date.now() - LEASE_MS - 1000));
	expect(await results.claimApply(result.id, staleBefore())).toBe(true);
});

it('stores apply progress and releases the claim only when the apply stops', async () => {
	const result = await createResult();
	await results.claimApply(result.id, staleBefore());
	const progress = { ...emptyProgress, evalsApplied: true };

	expect(
		await results.saveApplyProgress(result.id, {
			applyProgress: progress,
			applyError: null,
			releaseClaim: false,
		}),
	).toBe(true);
	expect(await results.getResult(result.id, scope.projectId)).toMatchObject({
		applyProgress: progress,
		applyStartedAt: expect.any(Date),
	});
	expect(await results.claimApply(result.id, staleBefore())).toBe(false);

	expect(
		await results.saveApplyProgress(result.id, {
			applyProgress: progress,
			applyError: 'The agent is locked.',
			releaseClaim: true,
		}),
	).toBe(true);
	expect(await results.getResult(result.id, scope.projectId)).toMatchObject({
		reviewState: 'open',
		applyProgress: progress,
		applyError: 'The agent is locked.',
		applyStartedAt: null,
	});
	// A retry can take the claim again.
	expect(await results.claimApply(result.id, staleBefore())).toBe(true);
});

it('closes an applied proposal and clears the claim and the stored error', async () => {
	const result = await createResult();
	await results.saveApplyProgress(result.id, {
		applyProgress: emptyProgress,
		applyError: 'The agent is locked.',
		releaseClaim: true,
	});
	await results.claimApply(result.id, staleBefore());
	const progress = { ...emptyProgress, savedVersionId: 'version-2', agentPublished: true };

	expect(
		await results.close(result.id, 'applied', {
			closedById: scope.backgroundUserId,
			publishedVersionId: 'version-2',
			applyProgress: progress,
		}),
	).toBe(true);
	expect(await results.getResult(result.id, scope.projectId)).toMatchObject({
		reviewState: 'applied',
		appliedAutomatically: false,
		publishedVersionId: 'version-2',
		applyProgress: progress,
		applyError: null,
		applyStartedAt: null,
		closedAt: expect.any(Date),
		closedById: scope.backgroundUserId,
	});
	expect(await results.getOpenForAgent(scope.agentId)).toBeNull();

	// A closed proposal accepts no other action.
	expect(await results.close(result.id, 'dismissed', { closedById: null })).toBe(false);
	expect(await results.claimApply(result.id, staleBefore())).toBe(false);
	expect(
		await results.saveApplyProgress(result.id, {
			applyProgress: emptyProgress,
			applyError: null,
			releaseClaim: true,
		}),
	).toBe(false);
});

it('records an automatic apply without a closing user', async () => {
	const result = await createResult();
	await results.claimApply(result.id, staleBefore());
	await results.close(result.id, 'applied', { closedById: null, appliedAutomatically: true });
	expect(await results.getResult(result.id, scope.projectId)).toMatchObject({
		reviewState: 'applied',
		appliedAutomatically: true,
		publishedVersionId: null,
		closedById: null,
	});
});

it('does not dismiss a proposal while an apply holds the claim', async () => {
	const result = await createResult();
	await results.claimApply(result.id, staleBefore());
	const dismiss = async () =>
		await results.close(result.id, 'dismissed', {
			closedById: scope.backgroundUserId,
			claimStaleBefore: staleBefore(),
		});

	expect(await dismiss()).toBe(false);
	expect(await results.getResult(result.id, scope.projectId)).toMatchObject({
		reviewState: 'open',
	});

	await startApplyAt(result.id, new Date(Date.now() - LEASE_MS - 1000));
	expect(await dismiss()).toBe(true);
	expect(await results.getResult(result.id, scope.projectId)).toMatchObject({
		reviewState: 'dismissed',
		applyStartedAt: null,
		closedById: scope.backgroundUserId,
	});
});

it('lists proposals for a reviewer who can edit agents in the project', async () => {
	const open = await createResult('Open proposal');
	const closed = await createResult('Closed proposal');
	await results.close(closed.id, 'outdated', { closedById: null });

	expect(await results.countForInbox(access)).toEqual({ open: 1, closed: 1 });
	const openItems = await results.listForInbox(access, { state: 'open', limit: 10 });
	expect(openItems).toEqual([
		{
			id: open.id,
			state: 'open',
			projectId: scope.projectId,
			agentId: scope.agentId,
			agentName: 'Support agent',
			summary: 'Open proposal',
			reviewState: 'open',
			appliedAutomatically: false,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
		},
	]);
	expect(await results.listForInbox(access, { state: 'closed', limit: 10 })).toEqual([
		expect.objectContaining({ id: closed.id, state: 'closed', reviewState: 'outdated' }),
	]);
});

it('hides proposals from a user who is not a reviewer or cannot edit agents', async () => {
	await disableInstanceAdmins();
	await createResult();
	const empty = { open: 0, closed: 0 };

	// The role of the reviewer does not give agent edit access.
	expect(await results.countForInbox({ ...access, projectRoles: ['project:admin'] })).toEqual(
		empty,
	);
	expect(await results.countForInbox({ ...access, projectRoles: [] })).toEqual(empty);
	expect(
		await results.listForInbox({ ...access, projectRoles: [] }, { state: 'open', limit: 10 }),
	).toEqual([]);

	// A project editor who is not a reviewer of the configuration.
	const editor = await createUser();
	await linkUserToProject(editor, project, 'project:editor');
	const editorAccess = { ...access, userId: editor.id };
	expect(await results.countForInbox(editorAccess)).toEqual(empty);
	await addReviewer(scope.configurationId, editor.id);
	expect(await results.countForInbox(editorAccess)).toEqual({ open: 1, closed: 0 });

	// A global role does not replace the reviewer rule.
	const outsider = await createUser();
	const globalAccess = { userId: outsider.id, hasGlobalAccess: true, projectRoles: [] };
	expect(await results.countForInbox(globalAccess)).toEqual(empty);

	// A reviewer with a global role needs no project role for agents.
	expect(
		await results.countForInbox({ ...access, hasGlobalAccess: true, projectRoles: [] }),
	).toEqual({
		open: 1,
		closed: 0,
	});
});

it('pages the list from the newest update to the oldest', async () => {
	const older = await createResult('Older');
	const newerA = await createResult('Newer A');
	const newerB = await createResult('Newer B');
	const earlier = new Date('2026-01-01T00:00:00.000Z');
	const later = new Date('2026-01-02T00:00:00.000Z');
	await setUpdatedAt(older.id, earlier);
	await setUpdatedAt(newerA.id, later);
	await setUpdatedAt(newerB.id, later);
	const [firstId, secondId] = [newerA.id, newerB.id].sort();
	const ids = async (query: Parameters<typeof results.listForInbox>[1]) =>
		(await results.listForInbox(access, query)).map(({ id }) => id);

	expect(await ids({ state: 'open', limit: 10 })).toEqual([firstId, secondId, older.id]);
	expect(await ids({ state: 'open', limit: 1 })).toEqual([firstId]);
	expect(
		await ids({
			state: 'open',
			limit: 10,
			boundary: { mode: 'afterItem', updatedAt: later, id: firstId },
		}),
	).toEqual([secondId, older.id]);
	expect(
		await ids({ state: 'open', limit: 10, boundary: { mode: 'beforeTime', updatedAt: later } }),
	).toEqual([older.id]);
	expect(
		await ids({
			state: 'open',
			limit: 10,
			boundary: { mode: 'beforeOrAtTime', updatedAt: earlier },
		}),
	).toEqual([older.id]);
});

it('removes proposals when their agent is deleted', async () => {
	const result = await createResult();
	await deleteAgentRow(scope.agentId);
	expect(await results.findResult(result.id)).toBeNull();
});
