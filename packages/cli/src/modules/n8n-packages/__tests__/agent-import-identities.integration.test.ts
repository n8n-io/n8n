import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { createMember, createOwner } from '@test-integration/db/users';

import { looseAgentsFixture } from './fixtures/agent-package-fixtures';
import { AgentImportMatchService } from '../entities/agent/agent-import-match.service';
import type { PreparedAgent } from '../entities/agent/agent-import.types';
import { WorkflowIdPolicy } from '../n8n-packages.types';
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

async function seedAgent(id: string, sourceAgentId: string | null = null, projectId = project.id) {
	return await agents.save({ id, name: id, projectId, sourceAgentId });
}

async function records() {
	return await Promise.all([
		agents.find({ order: { id: 'ASC' } }),
		tasks.find({ order: { id: 'ASC' } }),
	]);
}

async function resolve(idPolicy: WorkflowIdPolicy, projectId = project.id) {
	return await service.allocateAgentIds(
		await service.findBySourceAgentIds(
			{ user, projectId },
			sources.map(({ sourceAgentId }) => sourceAgentId),
		),
		idPolicy,
	);
}

it.each([WorkflowIdPolicy.Source, WorkflowIdPolicy.New])(
	'retains persisted Agent and task identities after a %s import',
	async (policy) => {
		const sourceBefore = structuredClone(sources);
		const identities = await resolve(policy);
		const mapping = await service.mapTaskIds(sources, identities);
		expect(identities.idConflicts).toEqual([]);
		expect(mapping.idConflicts).toEqual([]);
		for (const source of sources) {
			const { targetAgentId } = identities.identities.get(source.sourceAgentId)!;
			await seedAgent(targetAgentId, source.sourceAgentId);
			if (policy === WorkflowIdPolicy.New) expect(targetAgentId).not.toBe(source.sourceAgentId);
			else expect(targetAgentId).toBe(source.sourceAgentId);
			for (const [sourceTaskId, body] of Object.entries(source.tasks)) {
				const id = mapping.taskIdsBySourceAgentId.get(source.sourceAgentId)!.get(sourceTaskId)!;
				await tasks.save({ ...body, id, agentId: targetAgentId, sourceTaskId });
				if (policy === WorkflowIdPolicy.New) {
					expect(id).not.toBe(sourceTaskId);
					expect(id).toMatch(/^task_/);
				} else expect(id).toBe(sourceTaskId);
			}
		}
		const before = await records();
		for (const nextPolicy of [WorkflowIdPolicy.Source, WorkflowIdPolicy.New]) {
			const repeated = await resolve(nextPolicy);
			expect([...repeated.identities.values()].map(({ targetAgentId }) => targetAgentId)).toEqual(
				[...identities.identities.values()].map(({ targetAgentId }) => targetAgentId),
			);
			expect((await service.mapTaskIds(sources, repeated)).taskIdsBySourceAgentId).toEqual(
				mapping.taskIdsBySourceAgentId,
			);
		}
		const other = await resolve(WorkflowIdPolicy.New, otherProject.id);
		for (const [sourceId, identity] of other.identities) {
			expect(identity.existing).toBeNull();
			expect(identity.targetAgentId).not.toBe(identities.identities.get(sourceId)!.targetAgentId);
		}
		expect(await records()).toEqual(before);
		expect(sources).toEqual(sourceBefore);
	},
);

it.each(['same', 'other'])(
	'reports an occupied Agent ID in the %s project under source policy',
	async (location) => {
		const projectId = location === 'same' ? project.id : otherProject.id;
		await seedAgent('support_source', 'different-source', projectId);
		const result = await resolve(WorkflowIdPolicy.Source);
		expect(result.identities.has('support_source')).toBe(false);
		expect(result.idConflicts).toEqual([
			{
				sourceAgentId: 'support_source',
				existingAgentId: 'support_source',
				existingProjectId: projectId,
			},
		]);
		const copied = await resolve(WorkflowIdPolicy.New);
		expect(copied.idConflicts).toEqual([]);
		expect(copied.identities.get('support_source')!.targetAgentId).not.toBe('support_source');
	},
);

it('reports ambiguous source identities without a local-ID fallback', async () => {
	await seedAgent('support_source');
	await seedAgent('copy-1', 'support_source');
	await seedAgent('copy-2', 'support_source');
	await Container.get(AgentHistoryRepository).saveVersion({
		versionId: 'published-version',
		agentId: 'copy-1',
		schema: null,
		skills: {},
		tools: {},
		publishedBy: 'Test User',
	});
	await agents.update('copy-1', { activeVersionId: 'published-version' });
	const result = await resolve(WorkflowIdPolicy.Source);
	expect(result.identities.has('support_source')).toBe(false);
	expect(result.lineageConflicts).toMatchObject([
		{ sourceAgentId: 'support_source', existingAgents: [{ id: 'copy-1' }, { id: 'copy-2' }] },
	]);
	expect(result.idConflicts).toEqual([]);
	const taskMappings = await service.mapTaskIds(sources, result);
	expect(taskMappings.taskIdsBySourceAgentId.has('support_source')).toBe(false);
});

it.each(['same', 'other'])(
	'reports an occupied task ID owned by the %s Agent',
	async (location) => {
		await seedAgent('support_source');
		await seedAgent('other-agent', null, otherProject.id);
		const agentId = location === 'same' ? 'support_source' : 'other-agent';
		await tasks.save({
			id: 'support_source_task',
			agentId,
			sourceTaskId: 'different-task',
			...taskBody,
		});
		const before = await records();
		const result = await service.mapTaskIds(sources, await resolve(WorkflowIdPolicy.Source));
		expect(result.taskIdsBySourceAgentId.get('support_source')!.size).toBe(0);
		expect(result.idConflicts).toEqual([
			{
				sourceAgentId: 'support_source',
				targetAgentId: 'support_source',
				sourceTaskId: 'support_source_task',
				targetTaskId: 'support_source_task',
				conflictingAgentId: agentId,
			},
		]);
		const copied = await service.mapTaskIds(sources, await resolve(WorkflowIdPolicy.New));
		expect(copied.idConflicts).toEqual([]);
		expect(
			copied.taskIdsBySourceAgentId.get('support_source')!.get('support_source_task'),
		).not.toBe('support_source_task');
		expect(await records()).toEqual(before);
	},
);

it('uses task source identity before local identity and reports ambiguous task matches', async () => {
	await seedAgent('support_source');
	await tasks.save({ id: 'support_source_task', agentId: 'support_source', ...taskBody });
	const identities = await resolve(WorkflowIdPolicy.Source);
	const native = await service.mapTaskIds(sources, identities);
	expect(native.taskIdsBySourceAgentId.get('support_source')!.get('support_source_task')).toBe(
		'support_source_task',
	);
	await tasks.save({
		id: 'copy-1',
		agentId: 'support_source',
		sourceTaskId: 'support_source_task',
		...taskBody,
	});
	const first = await service.mapTaskIds(sources, identities);
	expect(first.taskIdsBySourceAgentId.get('support_source')!.get('support_source_task')).toBe(
		'copy-1',
	);
	await tasks.save({
		id: 'copy-2',
		agentId: 'support_source',
		sourceTaskId: 'support_source_task',
		...taskBody,
	});
	const ambiguous = await service.mapTaskIds(sources, identities);
	expect(ambiguous.taskIdsBySourceAgentId.get('support_source')!.size).toBe(0);
	expect(ambiguous.lineageConflicts).toEqual([
		{
			sourceAgentId: 'support_source',
			targetAgentId: 'support_source',
			sourceTaskId: 'support_source_task',
			existingTaskIds: ['copy-1', 'copy-2'],
		},
	]);
});

it('keeps task and Agent ID namespaces separate', async () => {
	await seedAgent('support_source');
	const identities = await resolve(WorkflowIdPolicy.Source);
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

it('bounds candidate and ownership queries for large ID lists', async () => {
	await seedAgent('id-0');
	await seedAgent('copied-agent', 'id-32999');
	await seedAgent('outside-agent', 'id-0', otherProject.id);
	await tasks.save([
		{ id: 'id-0', agentId: 'id-0', ...taskBody },
		{ id: 'copied-task', agentId: 'id-0', sourceTaskId: 'id-32999', ...taskBody },
		{ id: 'outside-task', agentId: 'outside-agent', sourceTaskId: 'id-0', ...taskBody },
	]);
	const ids = Array.from({ length: 33_000 }, (_, index) => `id-${index}`);
	const candidates = await agents.findImportCandidates(project.id, ids);
	expect(candidates.map(({ id }) => id).sort()).toEqual(['copied-agent', 'id-0']);
	expect(candidates.every((candidate) => !Object.hasOwn(candidate, 'schema'))).toBe(true);
	expect(await agents.findImportIdOwners(ids)).toMatchObject([
		{ id: 'id-0', projectId: project.id },
	]);
	expect((await tasks.findImportCandidates('id-0', ids)).map(({ id }) => id).sort()).toEqual([
		'copied-task',
		'id-0',
	]);
	expect(await tasks.findImportIdOwners(ids)).toMatchObject([{ id: 'id-0', agentId: 'id-0' }]);
});

it('returns empty results without database reads', async () => {
	const agentRead = vi.spyOn(agents, 'find');
	const taskRead = vi.spyOn(tasks, 'find');
	const matches = await service.findBySourceAgentIds({ user, projectId: project.id }, []);
	const identities = await service.allocateAgentIds(matches);
	expect((await service.mapTaskIds([], identities)).taskIdsBySourceAgentId.size).toBe(0);
	expect(await agents.findImportCandidates(project.id, [])).toEqual([]);
	expect(await tasks.findImportCandidates('unused', [])).toEqual([]);
	expect(agentRead).not.toHaveBeenCalled();
	expect(taskRead).not.toHaveBeenCalled();
});
