import nock from 'nock';
import type { Worker } from 'node:worker_threads';

import { executeWorkflow, loadWorkflow } from '../src';

const crm = 'https://crm.example.com';

const workers = vi.hoisted((): Worker[] => []);

vi.mock('node:worker_threads', async (importOriginal) => {
	const original = await importOriginal<typeof import('node:worker_threads')>();
	class TrackedWorker extends original.Worker {
		constructor(...args: ConstructorParameters<typeof original.Worker>) {
			super(...args);
			workers.push(this);
		}
	}
	return { ...original, Worker: TrackedWorker };
});

afterEach(() => nock.cleanAll());

function codeWorkflow(jsCode: string) {
	return loadWorkflow({
		name: 'Code',
		nodes: [
			{
				id: '1',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Run',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [220, 0],
				parameters: { jsCode },
			},
		],
		connections: { Start: { main: [[{ node: 'Run', type: 'main', index: 0 }]] } },
	});
}

test('runs Code nodes of later executions in the same runner', async () => {
	await executeWorkflow(codeWorkflow('return [];'));
	const started = workers.length;

	await executeWorkflow(codeWorkflow('return [];'));
	await executeWorkflow(codeWorkflow('return [];'));

	expect(workers).toHaveLength(started);
});

test('fails the execution when the runner stops, and starts a new runner for the next one', async () => {
	nock(crm)
		.get('/hold')
		.reply(200, () => {
			void workers.at(-1)?.terminate();
			return {};
		});

	await expect(
		executeWorkflow(
			codeWorkflow(
				`await this.helpers.httpRequest({ url: '${crm}/hold' }); await new Promise(() => {});`,
			),
		),
	).rejects.toMatchObject({
		code: 'NODE_FAILED',
		node: 'Run',
		message: expect.stringContaining('the Code node runner stopped'),
	});
	const stopped = workers.length;
	const result = await executeWorkflow(codeWorkflow('return [{ json: { ok: true } }];'));

	expect(result.output).toEqual([{ ok: true }]);
	expect(workers).toHaveLength(stopped + 1);
});
