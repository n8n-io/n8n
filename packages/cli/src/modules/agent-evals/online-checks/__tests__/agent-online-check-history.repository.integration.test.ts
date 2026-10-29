import { GLOBAL_OWNER_ROLE } from '@n8n/db';
import { createUserShell } from '@test-integration/db/users';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentOnlineCheckHistoryRepository } from '../agent-online-check-history.repository';
import { AgentOnlineCheckCase } from '../agent-online-check-case.entity';
import { AgentOnlineCheckResult } from '../agent-online-check-result.entity';

let ds: DataSource;
let repo: AgentOnlineCheckHistoryRepository;
beforeAll(async () => {
	await testModules.loadModules(['agents', 'agent-evals']);
	await testDb.init();
	ds = Container.get(DataSource);
	repo = Container.get(AgentOnlineCheckHistoryRepository);
}, 60_000);
afterAll(async () => {
	await testDb.terminate();
});
async function fixture() {
	const project = await createTeamProject();
	const agent = await ds
		.getRepository(Agent)
		.save(Object.assign(new Agent(), { name: 'History agent', projectId: project.id }));
	const thread = await ds.getRepository(AgentExecutionThread).save(
		Object.assign(new AgentExecutionThread(), {
			agentId: agent.id,
			agentName: agent.name,
			projectId: project.id,
			accessScope: 'project',
			ownerId: null,
		}),
	);
	return { agent, thread };
}
const rubric = { checks: [], generatedAt: '2026-10-29T12:00:00.000Z' };
const turns = [{ userMessage: 'Recorded input', reply: 'Recorded reply', timeline: [] }];

it('keeps one case, its fixed conversation, and all dated assessments', async () => {
	const { agent, thread } = await fixture();
	const input = {
		agentId: agent.id,
		ownerId: null,
		threadId: thread.id,
		title: 'Recorded case',
		turns,
		rubric,
		configHash: 'first',
		verdicts: [],
	};
	const first = await repo.saveAssessment(input);
	const secondRubric = { checks: [], generatedAt: '2026-10-30T12:00:00.000Z' };
	const second = await repo.saveAssessment({
		...input,
		turns: [{ ...turns[0], reply: 'Later reply' }],
		rubric: secondRubric,
		configHash: 'second',
	});
	expect(second.caseId).toBe(first.caseId);
	expect(
		(await repo.findCase(agent.id, first.caseId, '11111111-1111-4111-8111-111111111111'))?.turns,
	).toEqual(turns);
	const page = await repo.listResults(
		agent.id,
		first.caseId,
		'11111111-1111-4111-8111-111111111111',
		1,
		0,
	);
	expect(page?.items).toEqual([
		expect.objectContaining({ id: second.id, rubric: secondRubric, configHash: 'second' }),
	]);
	expect(page?.hasMore).toBe(true);
	expect(page?.conversation).toEqual([
		{ userMessage: turns[0].userMessage, reply: turns[0].reply },
	]);
	expect(
		(await repo.listResults(agent.id, first.caseId, '11111111-1111-4111-8111-111111111111', 1, 1))
			?.items[0],
	).toEqual(expect.objectContaining({ id: first.id, rubric, checkedAt: expect.any(String) }));
	const casePage = await repo.listCases(agent.id, '11111111-1111-4111-8111-111111111111', 20, 0);
	expect(casePage.items[0].latestResult?.id).toBe(second.id);
	expect(casePage.items[0].recentResults.map((result) => result.id)).toEqual([first.id, second.id]);
});
it('keeps results after session deletion and removes them with the agent', async () => {
	const { agent, thread } = await fixture();
	const result = await repo.saveAssessment({
		agentId: agent.id,
		ownerId: null,
		threadId: thread.id,
		title: 'Preserved',
		turns,
		rubric,
		configHash: 'hash',
		verdicts: [],
	});
	await ds.getRepository(AgentExecutionThread).delete(thread.id);
	expect(
		(await repo.findCase(agent.id, result.caseId, '11111111-1111-4111-8111-111111111111'))
			?.threadId,
	).toBeNull();
	expect(
		(await repo.listResults(agent.id, result.caseId, '11111111-1111-4111-8111-111111111111', 20, 0))
			?.items,
	).toHaveLength(1);
	await ds.getRepository(Agent).delete(agent.id);
	expect(await ds.getRepository(AgentOnlineCheckCase).findOneBy({ id: result.caseId })).toBeNull();
	expect(await ds.getRepository(AgentOnlineCheckResult).findOneBy({ id: result.id })).toBeNull();
});
it('does not return cases or results through another agent', async () => {
	const { agent, thread } = await fixture();
	const result = await repo.saveAssessment({
		agentId: agent.id,
		ownerId: null,
		threadId: thread.id,
		title: 'Scoped',
		turns,
		rubric,
		configHash: 'hash',
		verdicts: [],
	});
	expect(
		await repo.findCase('other-agent', result.caseId, '11111111-1111-4111-8111-111111111111'),
	).toBeNull();
	expect(
		await repo.listResults(
			'other-agent',
			result.caseId,
			'11111111-1111-4111-8111-111111111111',
			20,
			0,
		),
	).toBeNull();
	expect(
		(await repo.listCases('other-agent', '11111111-1111-4111-8111-111111111111', 20, 0)).items,
	).toEqual([]);
});

it('keeps a private session case visible only to its owner', async () => {
	const { agent, thread } = await fixture();
	const owner = await createUserShell(GLOBAL_OWNER_ROLE);
	const result = await repo.saveAssessment({
		agentId: agent.id,
		ownerId: owner.id,
		threadId: thread.id,
		title: 'Private',
		turns,
		rubric,
		configHash: 'hash',
		verdicts: [],
	});
	expect(
		await repo.findCase(agent.id, result.caseId, '22222222-2222-4222-8222-222222222222'),
	).toBeNull();
	expect(
		await repo.listResults(agent.id, result.caseId, '22222222-2222-4222-8222-222222222222', 20, 0),
	).toBeNull();
	expect(
		(await repo.listCases(agent.id, '22222222-2222-4222-8222-222222222222', 20, 0)).items,
	).toEqual([]);
	expect((await repo.listCases(agent.id, owner.id, 20, 0)).items).toHaveLength(1);
	expect((await repo.findCase(agent.id, result.caseId, owner.id))?.turns).toEqual(turns);
});

it('shows the five most recent assessments from oldest to newest', async () => {
	const { agent, thread } = await fixture();
	const ids: number[] = [];
	for (let i = 0; i < 7; i++) {
		const result = await repo.saveAssessment({
			agentId: agent.id,
			ownerId: null,
			threadId: thread.id,
			title: 'Repeated case',
			turns,
			rubric,
			configHash: String(i),
			verdicts: [{ checkId: 'tone', status: i % 2 === 0 ? 'pass' : 'fail', reason: 'Evidence' }],
		});
		ids.push(result.id);
	}
	const row = (await repo.listCases(agent.id, '11111111-1111-4111-8111-111111111111', 20, 0))
		.items[0];
	expect(row.recentResults.map((result) => result.id)).toEqual(ids.slice(-5));
	expect(row.recentResults.map((result) => result.status)).toEqual([
		'good',
		'bad',
		'good',
		'bad',
		'good',
	]);
});

it('lists assessment activity in order and keeps human feedback separate', async () => {
	const { agent, thread } = await fixture();
	const user = await createUserShell(GLOBAL_OWNER_ROLE);
	const first = await repo.saveAssessment({
		agentId: agent.id,
		ownerId: null,
		threadId: thread.id,
		title: 'Activity session',
		turns,
		rubric,
		configHash: 'hash',
		verdicts: [{ checkId: 'tone', status: 'fail', reason: 'Evidence' }],
	});
	const second = await repo.saveAssessment({
		agentId: agent.id,
		ownerId: null,
		threadId: thread.id,
		title: 'Activity session',
		turns,
		rubric,
		configHash: 'hash',
		verdicts: [],
	});
	await repo.recordReview(first.id, user.id, 'tone', 'bad');
	await repo.recordReview(first.id, user.id, 'tone', 'good');
	const activity = await repo.listActivity(agent.id, user.id, 1, 0);
	expect(activity.items[0]).toEqual(
		expect.objectContaining({
			caseId: first.caseId,
			title: 'Activity session',
			result: expect.objectContaining({ id: second.id }),
		}),
	);
	expect(activity.hasMore).toBe(true);
	const older = (await repo.listActivity(agent.id, user.id, 1, 1)).items[0].result;
	expect(older.reviews).toEqual({ tone: 'good' });
	expect(older.verdicts[0].status).toBe('fail');
	expect(
		(await repo.listResults(agent.id, first.caseId, user.id, 20, 0))?.items.find(
			(result) => result.id === first.id,
		)?.reviews,
	).toEqual({ tone: 'good' });
	expect(
		(
			await repo.listResults(agent.id, first.caseId, '11111111-1111-4111-8111-111111111111', 20, 0)
		)?.items.find((result) => result.id === first.id)?.reviews,
	).toEqual({});
	expect((await repo.listActivity('other-agent', user.id, 20, 0)).items).toEqual([]);
});
