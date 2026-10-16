import { mock } from 'vitest-mock-extended';

import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import type { AgentTaskStop } from '../../types/agent-task-stop';
import type { AgentPlanDocument, AgentPlanTask } from '../agent-plan.schema';
import { projectPlanWorkState, unfinishedPlanIds } from '../agent-plan-work-state';

const task = (id: string, status: AgentPlanTask['status'] = 'in_progress'): AgentPlanTask => ({
	id,
	kind: 'task',
	title: id,
	description: '',
	status,
	dependsOn: [],
	startedAt: null,
	endedAt: null,
});
const document: AgentPlanDocument = {
	title: 'Research',
	description: '',
	items: [task('help-scout'), task('crisp'), task('freshdesk')],
};
const stop: AgentTaskStop = {
	planId: 'plan',
	generation: { executionIds: [], jobIds: [], threadIds: [] },
	failures: [],
	requestedAt: '2026-10-15T10:00:00Z',
	stoppedTaskIds: ['help-scout', 'crisp', 'freshdesk'],
	pause: { id: 'stop', resumedAt: '2026-10-15T10:01:00Z' },
};

describe('plan work state', () => {
	it('keeps the original tasks stopped when a new message adds Groove', () => {
		const state = projectPlanWorkState(
			{ ...document, items: [...document.items, task('groove')] },
			stop,
			[mock<AgentBackgroundJob>({ planTaskId: 'groove', status: 'running', pauseRequestId: null })],
		);
		expect(state).toMatchObject({
			stoppedTaskIds: stop.stoppedTaskIds,
			fullyStopped: false,
			stoppedAt: null,
		});
	});

	it('does not confuse chat admission or a resume reservation with a resumed task', () => {
		const state = projectPlanWorkState(document, stop, [
			mock<AgentBackgroundJob>({
				planTaskId: 'crisp',
				status: 'suspended',
				pauseRequestId: 'stop',
				notifiedAt: new Date(),
			}),
		]);
		expect(state).toMatchObject({
			stoppedTaskIds: stop.stoppedTaskIds,
			stoppingTaskIds: [],
			fullyStopped: true,
			stoppedAt: stop.requestedAt,
		});
	});

	it('leaves the other rows stopped after Crisp resumes', () => {
		const state = projectPlanWorkState(
			document,
			{ ...stop, stoppedTaskIds: ['help-scout', 'freshdesk'] },
			[mock<AgentBackgroundJob>({ planTaskId: 'crisp', status: 'running', pauseRequestId: null })],
		);
		expect(state.stoppedTaskIds).toEqual(['help-scout', 'freshdesk']);
		expect(state.fullyStopped).toBe(false);
	});

	it('preserves terminal tasks and reports jobs which have not stopped yet', () => {
		const state = projectPlanWorkState(
			{
				...document,
				items: [task('help-scout', 'done'), task('crisp', 'failed'), task('freshdesk')],
			},
			stop,
			[
				mock<AgentBackgroundJob>({
					planTaskId: 'freshdesk',
					status: 'running',
					pauseRequestId: 'stop',
					notifiedAt: null,
				}),
			],
		);
		expect(state.stoppedTaskIds).toEqual([]);
		expect(state.stoppingTaskIds).toEqual(['freshdesk']);
		expect(state.fullyStopped).toBe(false);
	});

	it('freezes after newly added work finishes without moving the timer backward', () => {
		const endedAt = '2026-10-15T10:02:00Z';
		const state = projectPlanWorkState(
			{ ...document, items: [...document.items, { ...task('groove', 'done'), endedAt }] },
			stop,
			[],
		);
		expect(state).toMatchObject({ fullyStopped: true, stoppedAt: endedAt });
	});

	it('captures empty groups and children of nonempty groups', () => {
		const empty = { ...task('empty'), kind: 'group' as const, tasks: [] };
		const group = {
			...task('group'),
			kind: 'group' as const,
			tasks: [task('child'), task('done', 'done')],
		};
		expect(unfinishedPlanIds({ ...document, items: [empty, group] })).toEqual(['empty', 'child']);
	});

	it('does not invent task states if old stop history is missing', () => {
		const state = projectPlanWorkState(document, { ...stop, stoppedTaskIds: undefined }, []);
		expect(state).toMatchObject({
			taskStateAvailable: false,
			fullyStopped: false,
			stoppedTaskIds: [],
		});
	});
});
