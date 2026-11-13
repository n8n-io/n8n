import type { IConnections, INode } from 'n8n-workflow';

import type { WfrtFinishedEvent, WfrtStepEvent, WfrtTraceEvent } from '../compiled-engine.types';
import { parseWfrtEvent } from '../compiled-engine.types';
import { CompiledRunRecorder, toOutputs, triggerItems } from '../compiled-run-recorder';

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
	node('IF', 'n8n-nodes-base.if'),
	node('Set', 'n8n-nodes-base.set'),
	node('HTTP Request', 'n8n-nodes-base.httpRequest'),
	node('Respond', 'n8n-nodes-base.respondToWebhook'),
];

const connections: IConnections = {
	Webhook: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
	IF: { main: [[{ node: 'Set', type: 'main', index: 0 }], []] },
	Set: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
	'HTTP Request': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
};

const EXEC = '7';

const step = (
	name: string,
	status: WfrtStepEvent['status'],
	at: number,
	extra: Partial<WfrtStepEvent> = {},
): WfrtStepEvent => ({ type: 'step', executionId: EXEC, step: name, status, at, ...extra });

const trace = (name: string, items: unknown, at: number): WfrtTraceEvent => ({
	type: 'trace',
	executionId: EXEC,
	step: name,
	items,
	at,
});

const finished = (status: WfrtFinishedEvent['status'], at: number, error?: string) =>
	({ type: 'finished', executionId: EXEC, status, at, error }) satisfies WfrtFinishedEvent;

describe('CompiledRunRecorder', () => {
	it('builds one run per node for the demo workflow', () => {
		const recorder = new CompiledRunRecorder({ nodes, connections });
		recorder.start('Webhook', { body: { amount: 20 }, headers: { a: '1' }, query: {} }, 1000);

		const updates = [
			...recorder.onTrace(trace('IF', [[{ body: { amount: 20 } }], []], 1001)),
			...recorder.onTrace(trace('Set', [{ big: true }], 1002)),
			...recorder.onStep(step('HTTP Request', 'started', 1003)),
			...recorder.onStep(step('HTTP Request', 'completed', 1010, { result: [{ echo: 1 }] })),
			...recorder.onStep(step('Respond', 'started', 1011)),
			...recorder.onStep(step('Respond', 'completed', 1012, { result: { ok: true } })),
		];
		const end = recorder.finish(finished('ok', 1013));
		updates.push(...end.updates);

		expect(end.error).toBeUndefined();
		expect(updates.map((u) => `${u.kind}:${u.nodeName}`)).toEqual([
			'before:Webhook',
			'after:Webhook',
			'before:IF',
			'after:IF',
			'before:Set',
			'after:Set',
			'before:HTTP Request',
			'after:HTTP Request',
			'before:Respond',
			'after:Respond',
		]);

		const runData = recorder.getRunData();
		expect(Object.keys(runData)).toEqual(['Webhook', 'IF', 'Set', 'HTTP Request', 'Respond']);
		expect(runData.Webhook[0].data?.main[0]).toEqual([
			{ json: { headers: { a: '1' }, params: {}, query: {}, body: { amount: 20 } } },
		]);
		expect(runData.IF[0].data?.main).toEqual([[{ json: { body: { amount: 20 } } }], []]);
		expect(runData.IF[0].source).toEqual([{ previousNode: 'Webhook', previousNodeOutput: 0 }]);
		expect(runData['HTTP Request'][0]).toMatchObject({
			startTime: 1003,
			executionTime: 7,
			executionStatus: 'success',
			executionIndex: 3,
			data: { main: [[{ json: { echo: 1 } }]] },
		});
		expect(recorder.lastNodeExecuted).toBe('Respond');
	});

	it('joins the occurrences of a step into one run', () => {
		const recorder = new CompiledRunRecorder({ nodes, connections });
		const updates = [
			...recorder.onStep(step('HTTP Request', 'started', 1)),
			...recorder.onStep(step('HTTP Request', 'completed', 2, { result: [{ n: 1 }] })),
			...recorder.onStep(step('HTTP Request', 'started', 3)),
			...recorder.onStep(step('HTTP Request', 'completed', 4, { result: [{ n: 2 }] })),
			...recorder.finish(finished('ok', 5)).updates,
		];
		expect(updates.filter((u) => u.kind === 'after')).toHaveLength(1);
		expect(recorder.getRunData()['HTTP Request'][0].data?.main[0]).toEqual([
			{ json: { n: 1 } },
			{ json: { n: 2 } },
		]);
	});

	it('uses the trace of the trigger node instead of the trigger value', () => {
		const recorder = new CompiledRunRecorder({ nodes, connections });
		recorder.start('Webhook', { body: {} }, 1);
		recorder.onTrace(trace('Webhook', [{ custom: true }], 2));
		recorder.finish(finished('ok', 3));
		expect(recorder.getRunData().Webhook).toHaveLength(1);
		expect(recorder.getRunData().Webhook[0].data?.main[0]).toEqual([{ json: { custom: true } }]);
	});

	it('records a failed step as a node error and an execution error', () => {
		const recorder = new CompiledRunRecorder({ nodes, connections });
		recorder.onStep(step('HTTP Request', 'started', 1));
		recorder.onStep(step('HTTP Request', 'failed', 2, { error: 'The remote answered 500' }));
		const { error } = recorder.finish(finished('needs_attention', 3));

		const task = recorder.getRunData()['HTTP Request'][0];
		expect(task.executionStatus).toBe('error');
		expect(task.error?.message).toBe('The remote answered 500');
		expect(error?.message).toContain('needs attention at "HTTP Request"');
	});

	it('uses the body of a native HTTP result and the leaf items of the result', () => {
		const recorder = new CompiledRunRecorder({ nodes, connections });
		recorder.start('Webhook', { method: 'POST', body: { amount: 20 }, headers: {}, query: {} }, 1);
		recorder.onStep(step('HTTP Request', 'started', 2));
		recorder.onStep(
			step('HTTP Request', 'completed', 3, {
				result: { status: 200, headers: {}, body: { echoed: { big: true } } },
			}),
		);
		const { updates } = recorder.finish({
			...finished('ok', 4),
			result: { Respond: [{ echoed: { big: true } }] },
		});
		const runData = recorder.getRunData();
		expect(runData['HTTP Request'][0].data?.main[0]).toEqual([{ json: { echoed: { big: true } } }]);
		expect(runData.Respond[0].data?.main[0]).toEqual([{ json: { echoed: { big: true } } }]);
		expect(updates.map((u) => `${u.kind}:${u.nodeName}`)).toEqual([
			'after:HTTP Request',
			'before:Respond',
			'after:Respond',
		]);
	});

	it('replaces step results with the trace of the same node', () => {
		const recorder = new CompiledRunRecorder({ nodes, connections });
		recorder.onStep(step('HTTP Request', 'started', 1));
		recorder.onStep(step('HTTP Request', 'completed', 2, { result: { raw: 1 } }));
		recorder.onTrace(trace('HTTP Request', [{ item: 1 }], 3));
		recorder.finish(finished('ok', 4));
		const runs = recorder.getRunData()['HTTP Request'];
		expect(runs).toHaveLength(1);
		expect(runs[0].data?.main[0]).toEqual([{ json: { item: 1 } }]);
	});

	it('ignores events of steps that are not nodes', () => {
		const recorder = new CompiledRunRecorder({ nodes, connections });
		expect(recorder.onStep(step('helper', 'started', 1))).toEqual([]);
		expect(recorder.onTrace(trace('helper', [], 1))).toEqual([]);
	});
});

describe('helpers', () => {
	it('reads multi-output trace items', () => {
		expect(toOutputs([[{ a: 1 }], [{ b: 2 }]])).toEqual([
			[{ json: { a: 1 } }],
			[{ json: { b: 2 } }],
		]);
		expect(toOutputs([{ a: 1 }])).toEqual([[{ json: { a: 1 } }]]);
		expect(toOutputs([{ json: { a: 1 }, binary: {} }])).toEqual([[{ json: { a: 1 }, binary: {} }]]);
		expect(toOutputs(3)).toEqual([[{ json: { value: 3 } }]]);
	});

	it('moves $binary into the item binary data', () => {
		const items = triggerItems({
			method: 'POST',
			path: '/webhook/up',
			headers: {},
			params: {},
			query: {},
			body: { note: 'hi' },
			$binary: {
				data: {
					data: 'aGk=',
					mimeType: 'text/plain',
					fileName: 'a.txt',
					fileExtension: 'txt',
					bytes: 2,
				},
			},
		});
		expect(items[0].json.body).toEqual({ note: 'hi' });
		expect(items[0].binary?.data).toEqual({
			data: 'aGk=',
			mimeType: 'text/plain',
			fileName: 'a.txt',
			fileExtension: 'txt',
			fileSize: '2 B',
		});
		expect(toOutputs([{ a: 1, $binary: { f: { data: 'eA==', mimeType: 'x/y' } } }])).toEqual([
			[{ json: { a: 1 }, binary: { f: { data: 'eA==', mimeType: 'x/y' } } }],
		]);
	});

	it('makes schedule trigger items', () => {
		expect(triggerItems({ scheduledAt: 0 })).toEqual([
			{ json: { timestamp: '1970-01-01T00:00:00.000Z', scheduledAt: 0 } },
		]);
	});

	it('parses events and drops unknown ones', () => {
		expect(
			parseWfrtEvent('{"type":"step","executionId":5,"step":"A","status":"started","at":1}'),
		).toEqual({
			type: 'step',
			executionId: '5',
			step: 'A',
			status: 'started',
			args: undefined,
			result: undefined,
			error: undefined,
			at: 1,
		});
		expect(parseWfrtEvent('{"type":"step","executionId":"5","step":"A","status":"odd"}')).toBe(
			undefined,
		);
		expect(parseWfrtEvent('not json')).toBe(undefined);
	});
});
