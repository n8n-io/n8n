import { createDataSource } from '@n8n/engine';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { IDataObject } from 'n8n-workflow';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { converter, makeRunWorkflow, realNodeTypes, setNode, TRIGGER } from './acceptance-fixtures';
import { v1Workflow } from './fixtures';

/** How many requests each job needs before it reports `done`. */
const ATTEMPTS_UNTIL_DONE: Record<string, number> = { quick: 1, slow: 3, never: Infinity };

const doneWhenStatus = (status: string) => ({
	options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
	conditions: [
		{
			id: 'status',
			leftValue: '={{ $json.status }}',
			rightValue: status,
			operator: { type: 'string', operation: 'equals' },
		},
	],
	combinator: 'and',
});

describe('Poll Until Done on engine v2 (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: ReturnType<typeof createDataSource>;
	let server: Server;
	let baseUrl: string;
	const requests = new Map<string, number>();

	beforeAll(async () => {
		container = await new PostgreSqlContainer('postgres:18-alpine').start();
		dataSource = createDataSource(container.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();

		server = createServer((request, response) => {
			const job = request.url?.split('/').pop() ?? '';
			const attempt = (requests.get(job) ?? 0) + 1;
			requests.set(job, attempt);
			const status = attempt >= (ATTEMPTS_UNTIL_DONE[job] ?? Infinity) ? 'done' : 'running';
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify({ job, status, attempt }));
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	}, 120_000);

	afterAll(async () => {
		server?.close();
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	beforeEach(() => requests.clear());

	const runWorkflow = makeRunWorkflow(() => dataSource);

	/**
	 * Trigger -> Poll Until Done, with its Done output into "After" and its
	 * Timed Out output into "Gave Up". "After" reads the poll's output and the
	 * trigger item it pairs with.
	 */
	function pollGraph(parameters: IDataObject) {
		return converter.convert(
			v1Workflow(
				[
					TRIGGER,
					{
						id: 'poll',
						name: 'Poll Until Done',
						type: 'n8n-nodes-base.pollUntilDone',
						typeVersion: 1,
						parameters: {
							method: 'GET',
							url: `=${baseUrl}/jobs/{{ $json.job }}`,
							doneWhen: doneWhenStatus('done'),
							interval: 1,
							intervalUnit: 'seconds',
							...parameters,
						},
					},
					setNode('after', 'After', [
						{
							name: 'job',
							value: "={{ $('When clicking Execute').item.json.job }}",
							type: 'string',
						},
						{
							name: 'attempt',
							value: "={{ $('Poll Until Done').item.json.attempt }}",
							type: 'number',
						},
					]),
					setNode('gave-up', 'Gave Up', [
						{ name: 'job', value: '={{ $json.job }}', type: 'string' },
					]),
				],
				{
					'When clicking Execute': {
						main: [[{ node: 'Poll Until Done', type: 'main' as const, index: 0 }]],
					},
					'Poll Until Done': {
						main: [
							[{ node: 'After', type: 'main' as const, index: 0 }],
							[{ node: 'Gave Up', type: 'main' as const, index: 0 }],
						],
					},
				},
			),
			undefined,
			{ nodeTypes: realNodeTypes },
		);
	}

	it('expands into scoped steps and keeps the outside nodes unscoped', () => {
		const graph = pollGraph({ maxAttempts: 2 });

		expect(graph.nodes.map((node) => [node.id, node.scope?.name])).toEqual(
			expect.arrayContaining([
				['trigger', undefined],
				['poll:entry', 'Poll Until Done'],
				['poll:request 1', 'Poll Until Done'],
				['poll:check 1', 'Poll Until Done'],
				['poll:wait 1', 'Poll Until Done'],
				['poll:request 2', 'Poll Until Done'],
				['poll:check 2', 'Poll Until Done'],
				['poll', 'Poll Until Done'],
				['after', undefined],
			]),
		);
		expect(graph.nodes).toHaveLength(10);
	});

	it('polls each item until it is done, and keeps every item paired with its input', async () => {
		const graph = pollGraph({ maxAttempts: 4 });

		const { execution, byNode } = await runWorkflow(graph, [
			[{ json: { job: 'quick' } }, { json: { job: 'slow' } }],
		]);

		expect(execution.status).toBe('completed');
		expect(requests).toEqual(
			new Map([
				['quick', 1],
				['slow', 3],
			]),
		);
		expect(byNode('poll')?.outputs).toEqual([
			[
				expect.objectContaining({ json: { job: 'quick', status: 'done', attempt: 1 } }),
				expect.objectContaining({ json: { job: 'slow', status: 'done', attempt: 3 } }),
			],
			null,
		]);
		expect(byNode('after')?.outputs).toEqual([
			[
				expect.objectContaining({ json: { job: 'quick', attempt: 1 } }),
				expect.objectContaining({ json: { job: 'slow', attempt: 3 } }),
			],
		]);
		// No item needed a fourth attempt
		expect(byNode('poll:request 4')?.status).toBe('skipped');
		expect(byNode('gave-up')?.status).toBe('skipped');
	});

	it('skips the remaining attempts when every item is done at once', async () => {
		const { execution, byNode } = await runWorkflow(pollGraph({ maxAttempts: 3 }), [
			[{ json: { job: 'quick' } }],
		]);

		expect(execution.status).toBe('completed');
		expect(byNode('poll:wait 1')?.status).toBe('skipped');
		expect(byNode('poll:request 2')?.status).toBe('skipped');
		expect(byNode('after')?.status).toBe('completed');
	});

	it('sends the last response to Timed Out when the attempts run out', async () => {
		const { execution, byNode } = await runWorkflow(pollGraph({ maxAttempts: 2 }), [
			[{ json: { job: 'never' } }],
		]);

		expect(execution.status).toBe('completed');
		expect(requests.get('never')).toBe(2);
		expect(byNode('poll')?.outputs).toEqual([
			null,
			[expect.objectContaining({ json: { job: 'never', status: 'running', attempt: 2 } })],
		]);
		expect(byNode('gave-up')?.outputs).toEqual([
			[expect.objectContaining({ json: { job: 'never' } })],
		]);
		expect(byNode('after')?.status).toBe('skipped');
	});

	it('fails the node when the attempts run out and On Timeout throws an error', async () => {
		const { execution, byNode } = await runWorkflow(
			pollGraph({ maxAttempts: 2, onTimeout: 'error' }),
			[[{ json: { job: 'never' } }]],
		);

		expect(execution.status).toBe('failed');
		expect(byNode('poll')?.status).toBe('failed');
		expect(byNode('poll')?.error).toMatchObject({ message: 'Not done after 2 attempts' });
	});

	it('fails the node when Fail When matches', async () => {
		const { execution, byNode } = await runWorkflow(
			pollGraph({ maxAttempts: 3, checkFailure: true, failWhen: doneWhenStatus('running') }),
			[[{ json: { job: 'slow' } }]],
		);

		expect(execution.status).toBe('failed');
		expect(requests.get('slow')).toBe(1);
		expect(byNode('poll')?.error).toMatchObject({ message: 'Fail When matched on attempt 1' });
	});
});
