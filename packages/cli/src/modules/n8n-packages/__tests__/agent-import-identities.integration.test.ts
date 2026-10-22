import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { createMember, createOwner } from '@test-integration/db/users';

import { looseAgentsFixture } from './fixtures/agent-package-fixtures';
import { AgentImportMatchService } from '../entities/agent/agent-import-match.service';
import type { PreparedAgent } from '../entities/agent/agent-import.types';
import { serializedAgentSchema } from '../spec/serialized/agent.schema';

let service: AgentImportMatchService;
let agents: AgentRepository;
let tasks: AgentTaskRepository;
let user: User;
let project: Project;
let otherProject: Project;
const fixture = looseAgentsFixture();
const sources: PreparedAgent[] = fixture.manifest.agents.map(({ target }) => {
	const { id, ...content } = serializedAgentSchema.parse(fixture.files[`${target}/agent.json`]);
	return { ...content, sourceAgentId: id, metadata: { versionId: null, publishedVersionId: null } };
});
const taskBody = sources[0].tasks.support_source_task;

beforeAll(async () => {
	await testModules.loadModules(['agents']);
	await testDb.init();
	agents = Container.get(AgentRepository);
	tasks = Container.get(AgentTaskRepository);
	service = Container.get(AgentImportMatchService);
	user = await createOwner();
	project = await createTeamProject('Destination', user);
	otherProject = await createTeamProject('Other destination', user);
});
beforeEach(async () => await agents.delete({}));
afterEach(() => vi.restoreAllMocks());
afterAll(async () => await testDb.terminate());

async function seedAgent(id: string, projectId = project.id) {
	return await agents.save({ id, name: id, projectId });
}

async function records() {
	return await Promise.all([
		agents.find({ order: { id: 'ASC' } }),
		tasks.find({ order: { id: 'ASC' } }),
	]);
}

async function resolve(projectId = project.id) {
	return await service.allocateAgentIds(
		await service.findBySourceAgentIds(
			{ user, projectId },
			sources.map(({ sourceAgentId }) => sourceAgentId),
		),
	);
}

it('retains persisted Agent and task identities on re-import', async () => {
	const sourceBefore = structuredClone(sources);
	const identities = await resolve();
	const mapping = await service.mapTaskIds(sources, identities);
	expect(identities.idConflicts).toEqual([]);
	expect(mapping.idConflicts).toEqual([]);
	for (const source of sources) {
		const { targetAgentId } = identities.identities.get(source.sourceAgentId)!;
		await seedAgent(targetAgentId);
		expect(targetAgentId).toBe(source.sourceAgentId);
		for (const [sourceTaskId, body] of Object.entries(source.tasks)) {
			const id = mapping.taskIdsBySourceAgentId.get(source.sourceAgentId)!.get(sourceTaskId)!;
			await tasks.save({ ...body, id, agentId: targetAgentId });
			expect(id).toBe(sourceTaskId);
		}
	}
	const before = await records();
	const repeated = await resolve();
	expect([...repeated.identities.values()].map(({ targetAgentId }) => targetAgentId)).toEqual(
		[...identities.identities.values()].map(({ targetAgentId }) => targetAgentId),
	);
	expect((await service.mapTaskIds(sources, repeated)).taskIdsBySourceAgentId).toEqual(
		mapping.taskIdsBySourceAgentId,
	);
	expect(await records()).toEqual(before);
	expect(sources).toEqual(sourceBefore);
});

it('reports an occupied Agent ID in another project under source policy', async () => {
	await seedAgent('support_source', otherProject.id);
	const before = await records();
	const result = await resolve();
	expect(result.identities.has('support_source')).toBe(false);
	expect(result.idConflicts).toEqual([
		{
			sourceAgentId: 'support_source',
			existingAgentId: 'support_source',
			existingProjectId: otherProject.id,
		},
	]);
	expect(await records()).toEqual(before);
});

it('reports an occupied task ID owned by another Agent', async () => {
	await seedAgent('support_source');
	await seedAgent('other-agent', otherProject.id);
	await tasks.save({
		id: 'support_source_task',
		agentId: 'other-agent',
		...taskBody,
	});
	const before = await records();
	const result = await service.mapTaskIds(sources, await resolve());
	expect(result.taskIdsBySourceAgentId.get('support_source')!.size).toBe(0);
	expect(result.idConflicts).toEqual([
		{
			sourceAgentId: 'support_source',
			targetAgentId: 'support_source',
			sourceTaskId: 'support_source_task',
			targetTaskId: 'support_source_task',
			conflictingAgentId: 'other-agent',
		},
	]);
	expect(await records()).toEqual(before);
});

it('keeps task and Agent ID namespaces separate', async () => {
	await seedAgent('support_source');
	const identities = await resolve();
	const result = await service.mapTaskIds(
		[{ sourceAgentId: 'support_source', tasks: { support_source: taskBody } }],
		identities,
	);
	expect(result.taskIdsBySourceAgentId.get('support_source')).toEqual(
		new Map([['support_source', 'support_source']]),
	);
	expect(result.idConflicts).toEqual([]);
});

it('restricts destination matching to projects the user can read', async () => {
	await seedAgent('support_source');
	const member = await createMember();
	const read = vi.spyOn(agents, 'findImportCandidates');
	await expect(
		service.findBySourceAgentIds({ user: member, projectId: project.id }, ['support_source']),
	).rejects.toThrow(ForbiddenError);
	expect(read).not.toHaveBeenCalled();
	await linkUserToProject(member, project, 'project:viewer');
	const matches = await service.findBySourceAgentIds({ user: member, projectId: project.id }, [
		'support_source',
	]);
	expect(matches.matches.get('support_source')?.id).toBe('support_source');
});

it('keeps global ID checks for an authorized pending project', async () => {
	await seedAgent('support_source');
	const member = await createMember();
	const read = vi.spyOn(agents, 'findImportCandidates');
	const matches = await service.findBySourceAgentIds(
		{ user: member, projectId: 'pending-project', projectPendingCreation: true },
		['support_source'],
	);
	const result = await service.allocateAgentIds(matches);
	expect(result.identities.size).toBe(0);
	expect(result.idConflicts).toEqual([
		{
			sourceAgentId: 'support_source',
			existingAgentId: 'support_source',
			existingProjectId: project.id,
		},
	]);
	expect(read).not.toHaveBeenCalled();
});

it('bounds candidate and ownership queries for large ID lists', async () => {
	await seedAgent('id-0');
	await seedAgent('id-32999');
	await seedAgent('outside-agent', otherProject.id);
	await tasks.save([
		{ id: 'id-0', agentId: 'id-0', ...taskBody },
		{ id: 'id-32999', agentId: 'id-0', ...taskBody },
		{ id: 'outside-task', agentId: 'outside-agent', ...taskBody },
	]);
	const ids = Array.from({ length: 33_000 }, (_, index) => `id-${index}`);
	const candidates = await agents.findImportCandidates(project.id, ids);
	expect(candidates.map(({ id }) => id).sort()).toEqual(['id-0', 'id-32999']);
	expect(candidates.every((candidate) => !Object.hasOwn(candidate, 'schema'))).toBe(true);
	expect(await agents.findImportIdOwners(ids)).toMatchObject([
		{ id: 'id-0', projectId: project.id },
		{ id: 'id-32999', projectId: project.id },
	]);
	expect(await tasks.findImportIdOwners(ids)).toMatchObject([
		{ id: 'id-0', agentId: 'id-0' },
		{ id: 'id-32999', agentId: 'id-0' },
	]);
});

it('returns empty results without database reads', async () => {
	const agentRead = vi.spyOn(agents, 'find');
	const taskRead = vi.spyOn(tasks, 'find');
	const matches = await service.findBySourceAgentIds({ user, projectId: project.id }, []);
	const identities = await service.allocateAgentIds(matches);
	expect((await service.mapTaskIds([], identities)).taskIdsBySourceAgentId.size).toBe(0);
	expect(await agents.findImportCandidates(project.id, [])).toEqual([]);
	expect(agentRead).not.toHaveBeenCalled();
	expect(taskRead).not.toHaveBeenCalled();
});
