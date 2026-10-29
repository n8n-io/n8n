import { randomUUID } from 'node:crypto';

import {
	derivePlanGroups,
	jobTaskStatus,
	resolveAgentPlan,
	type PlanJobState,
} from '../agent-plan-state';
import { storeAgentPlan, type AgentPlanDocument, type AgentPlanTask } from '../agent-plan.schema';
import { getAgentPlanReadiness } from '../agent-plan.validation';

const task = (
	status: AgentPlanTask['status'] = 'pending',
	overrides: Partial<AgentPlanTask> = {},
): AgentPlanTask => ({
	id: randomUUID(),
	kind: 'task',
	title: 'Work',
	description: 'Do work',
	status,
	dependsOn: [],
	startedAt: null,
	endedAt: null,
	...overrides,
});

const plan = (...tasks: AgentPlanTask[]): AgentPlanDocument => ({
	title: 'Plan',
	description: '',
	items: [
		{
			id: randomUUID(),
			kind: 'group',
			title: 'Group',
			description: '',
			status: 'pending',
			dependsOn: [],
			startedAt: null,
			endedAt: null,
			tasks,
		},
	],
});

const job = (
	status: PlanJobState['status'],
	overrides: Partial<PlanJobState> = {},
): PlanJobState => ({
	id: randomUUID(),
	status,
	createdAt: new Date('2026-10-01T10:00:00Z'),
	settledAt: null,
	pauseRequestId: null,
	notifiedAt: null,
	...overrides,
});

it.each([
	['running', 'in_progress'],
	['suspended', 'in_progress'],
	['paused', 'paused'],
	['completed', 'done'],
	['failed', 'failed'],
	['cancelled', 'cancelled'],
] as const)('maps job %s to task %s', (source, expected) => {
	expect(jobTaskStatus(job(source))).toBe(expected);
});

it('keeps a resume reservation stopped until the job resumes', () => {
	expect(
		jobTaskStatus(job('suspended', { pauseRequestId: randomUUID(), notifiedAt: new Date() })),
	).toBe('paused');
	expect(jobTaskStatus(job('running'))).toBe('in_progress');
});

it.each([
	[['done', 'cancelled', 'failed', 'pending', 'paused', 'in_progress'], 'in_progress'],
	[['done', 'cancelled', 'failed', 'pending', 'paused'], 'paused'],
	[['done', 'cancelled', 'failed', 'pending'], 'pending'],
	[['done', 'cancelled', 'failed'], 'failed'],
	[['done', 'cancelled'], 'cancelled'],
	[['done'], 'done'],
	[[], 'pending'],
] as const)('calculates the group for %j', (states, expected) => {
	expect(derivePlanGroups(plan(...states.map((state) => task(state)))).items[0].status).toBe(
		expected,
	);
});

it('keeps the end time empty for a paused group', () => {
	const done = task('done', { endedAt: '2026-10-15T10:00:00.000Z' });
	const paused = task('paused', { endedAt: '2026-10-15T10:01:00.000Z' });

	expect(derivePlanGroups(plan(done, paused)).items[0]).toMatchObject({
		status: 'paused',
		endedAt: null,
	});
});

it('uses successful fallback work instead of the failed original', () => {
	const first = task('failed');
	const fallback = task('done', { fallbackFor: first.id });

	expect(derivePlanGroups(plan(first, fallback)).items[0].status).toBe('done');
});

it('stores only manual lifecycle and job ownership', () => {
	const owned = task('in_progress', { jobId: randomUUID() });
	const manual = task('done');
	const stored = storeAgentPlan(plan(owned, manual));

	expect(stored.items[0]).not.toHaveProperty('status');

	if (stored.items[0].kind !== 'group') throw new Error('Expected group');

	expect(stored.items[0].tasks[0]).not.toHaveProperty('status');
	expect(stored.items[0].tasks[0]).not.toHaveProperty('startedAt');
	expect(stored.items[0].tasks[1]).toMatchObject({ status: 'done', startedAt: null });
});

it('uses the owning job and ignores nested job outcomes', () => {
	const owner = job('running');
	const nested = job('failed');
	const document = storeAgentPlan(plan(task('pending', { jobId: owner.id })));

	expect(resolveAgentPlan(document, [owner, nested]).items[0].status).toBe('in_progress');
	expect(
		resolveAgentPlan(document, [{ ...owner, status: 'completed' }, nested]).items[0].status,
	).toBe('done');
});

it('uses current job state for dependency readiness', () => {
	const owner = job('running');
	const first = task('pending', { jobId: owner.id });
	const second = task('pending', { dependsOn: [first.id] });
	const document = storeAgentPlan(plan(first, second));

	expect(getAgentPlanReadiness(resolveAgentPlan(document, [owner])).blocked).toContainEqual({
		id: second.id,
		blockedBy: [first.id],
	});
	expect(
		getAgentPlanReadiness(resolveAgentPlan(document, [{ ...owner, status: 'completed' }])).ready,
	).toContain(second.id);
});

it('keeps failed work in the group when its fallback is cancelled', () => {
	const original = task('failed');

	expect(
		derivePlanGroups(plan(original, task('cancelled', { fallbackFor: original.id }))).items[0]
			.status,
	).toBe('failed');
});

it('uses the successful last fallback in a replacement chain', () => {
	const original = task('failed');
	const replacement = task('cancelled', { fallbackFor: original.id });

	expect(
		derivePlanGroups(plan(original, replacement, task('done', { fallbackFor: replacement.id })))
			.items[0].status,
	).toBe('done');
});

it('keeps running jobs active while a Stop request is pending', () => {
	expect(
		jobTaskStatus(job('running', { pauseRequestId: randomUUID(), notifiedAt: new Date() })),
	).toBe('in_progress');
});
