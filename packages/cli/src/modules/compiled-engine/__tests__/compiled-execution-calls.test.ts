import type { INode } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import type { WfrtServiceEvent } from '../compiled-engine.types';
import { runExecutionCall } from '../compiled-execution-calls';
import { CompiledRunRecorder } from '../compiled-run-recorder';

const node = (name: string, type: string): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const nodes = [
	node('Webhook', 'n8n-nodes-base.webhook'),
	node('Saved', 'n8n-nodes-base.timeSaved'),
	node('Data', 'n8n-nodes-base.executionData'),
];
const connections = {
	Webhook: { main: [[{ node: 'Saved', type: 'main' as const, index: 0 }]] },
};

const call = (step: string, op: string, args: unknown): WfrtServiceEvent => ({
	type: 'service',
	executionId: '7',
	workflowId: 'w1',
	step,
	callId: `7:${op}`,
	attempt: 0,
	service: 'execution',
	op,
	args,
	at: 1,
});

const newState = () => ({
	runExecutionData: createRunExecutionData({}),
	recorder: new CompiledRunRecorder({ nodes, connections }),
});

describe('runExecutionCall', () => {
	it('saves custom data with the limits of v1', () => {
		const state = newState();
		const long = 'v'.repeat(600);
		const answer = runExecutionCall(
			state,
			call('Data', 'setCustomData', {
				items: [{ id: 7, ok: false, text: long }, { id: 'last' }],
			}),
		);

		expect(answer).toEqual({ ok: true, result: null });
		expect(state.runExecutionData.resultData.metadata).toEqual({
			id: 'last',
			ok: 'false',
			text: 'v'.repeat(512),
		});
	});

	it('keeps at most 10 keys and still changes a key that is there', () => {
		const state = newState();
		const many = Object.fromEntries(Array.from({ length: 12 }, (_, k) => [`k${k}`, k]));
		runExecutionCall(state, call('Data', 'setCustomData', { items: [many, { k0: 'new', z: 1 }] }));

		const saved = state.runExecutionData.resultData.metadata ?? {};
		expect(Object.keys(saved)).toHaveLength(10);
		expect(saved.k0).toBe('new');
		expect(saved.z).toBeUndefined();
	});

	it('answers with the error of v1, after it set the valid values of the item', () => {
		const state = newState();
		const answer = runExecutionCall(
			state,
			call('Data', 'setCustomData', {
				items: [{ 'bad key': 'x', list: [1], fine: 'y' }, { late: 1 }],
			}),
		);

		expect(answer).toEqual({
			ok: false,
			error: {
				message:
					'Custom data key can only contain letters, numbers, and underscores (key "bad key")',
			},
		});
		expect(state.runExecutionData.resultData.metadata).toEqual({ fine: 'y' });
	});

	it('refuses a value that is not a text, a number or a boolean', () => {
		const answer = runExecutionCall(
			newState(),
			call('Data', 'setCustomData', { items: [{ a: null }] }),
		);
		expect(answer).toEqual({
			ok: false,
			error: { message: 'Custom data values must be a string (key "a")' },
		});
	});

	it('records the minutes of a Time Saved node on the run of the node', () => {
		const state = newState();
		const { recorder } = state;
		recorder.onStep({ type: 'step', executionId: '7', step: 'Saved', status: 'started', at: 1 });
		expect(runExecutionCall(state, call('Saved', 'setTimeSaved', { minutes: 15 }))).toEqual({
			ok: true,
			result: null,
		});
		recorder.onStep({ type: 'step', executionId: '7', step: 'Saved', status: 'completed', at: 2 });
		recorder.onTrace({ type: 'trace', executionId: '7', step: 'Saved', items: [{ a: 1 }], at: 3 });
		recorder.finish({ type: 'finished', executionId: '7', status: 'ok', at: 4 });

		const runs = recorder.getRunData().Saved;
		expect(runs).toHaveLength(1);
		expect(runs[0].metadata).toEqual({ timeSaved: { minutes: 15 } });
		expect(runs[0].data?.main[0]).toEqual([{ json: { a: 1 } }]);
	});

	it('refuses minutes that are not a number, a step with no node and an unknown operation', () => {
		const state = newState();
		expect(runExecutionCall(state, call('Saved', 'setTimeSaved', { minutes: '5' })).ok).toBe(false);
		expect(runExecutionCall(state, call('Other', 'setTimeSaved', { minutes: 5 })).ok).toBe(false);
		expect(runExecutionCall(state, call('Saved', 'other', {}))).toEqual({
			ok: false,
			error: { message: 'Unknown execution operation "other"' },
		});
	});
});
