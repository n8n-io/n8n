/**
 * Service calls of compiled executions (spec section 9.9 of workflow-lang):
 * n8n runs a `dataTable` call with the engine v2 data-table service, sends the
 * answer to `wfrt`, and gives a call that `wfrt` sends again the same answer.
 */
import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

const dedup = vi.hoisted(() => ({
	checkProcessedAndRecord: vi.fn(),
	removeProcessed: vi.fn(),
	clearAllProcessedItems: vi.fn(),
	getProcessedDataCount: vi.fn(),
}));
vi.mock('@/deduplication/deduplication-helper', () => ({
	DeduplicationHelper: vi.fn(function () {
		return dedup;
	}),
}));

import { EngineDataTablesService } from '../../engine-v2/engine-data-tables.service';
import { CompiledServiceCalls } from '../compiled-service-calls';
import type { WfrtServiceEvent } from '../compiled-engine.types';
import { parseWfrtEvent } from '../compiled-engine.types';
import type { WfrtAdminClient } from '../wfrt-admin.client';

const line = JSON.stringify({
	type: 'service',
	executionId: '77',
	workflowId: 'wf1~manual',
	step: 'Get rows',
	callId: '77:3',
	attempt: 0,
	service: 'dataTable',
	op: 'insertRows',
	args: { dataTableId: 't1', rows: [{ email: 'a@x.io' }], returnType: 'all' },
	at: 1,
});

describe('CompiledServiceCalls', () => {
	const tables = mock<EngineDataTablesService>();
	const client = mock<WfrtAdminClient>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
		client.answerService.mockResolvedValue(true);
		Container.set(EngineDataTablesService, tables);
	});

	it('parses the event', () => {
		const event = parseWfrtEvent(line);
		expect(event).toMatchObject({ type: 'service', callId: '77:3', op: 'insertRows', attempt: 0 });
	});

	it('runs a data table call for the workflow and answers once for a call sent again', async () => {
		tables.call.mockResolvedValue({ data: [{ id: 1, email: 'a@x.io' }] });
		const calls = new CompiledServiceCalls(client, logger);
		const event = parseWfrtEvent(line) as WfrtServiceEvent;
		await calls.handle(event);
		await calls.handle(event);
		expect(tables.call).toHaveBeenCalledTimes(1);
		expect(tables.call).toHaveBeenCalledWith({
			execution: { executionId: '77', workflowId: 'wf1' },
			consumer: { nodeType: 'n8n-nodes-base.dataTable' },
			call: {
				kind: 'insertRows',
				dataTableId: 't1',
				rows: [{ email: 'a@x.io' }],
				returnType: 'all',
			},
		});
		expect(client.answerService).toHaveBeenCalledTimes(2);
		expect(client.answerService).toHaveBeenCalledWith('77:3', {
			ok: true,
			result: [{ id: 1, email: 'a@x.io' }],
		});
	});

	it('gives a refusal of the service as the error of the call', async () => {
		tables.call.mockResolvedValue({
			error: { kind: 'user', message: "unknown column name 'x'" },
		});
		const calls = new CompiledServiceCalls(client, logger);
		const answer = await calls.run(parseWfrtEvent(line) as WfrtServiceEvent);
		expect(answer).toEqual({ ok: false, error: { message: "unknown column name 'x'" } });
	});

	it('refuses an unknown operation and an unknown service', async () => {
		const calls = new CompiledServiceCalls(client, logger);
		const event = parseWfrtEvent(line) as WfrtServiceEvent;
		expect(await calls.run({ ...event, op: 'dropAll' })).toEqual({
			ok: false,
			error: { message: 'Invalid data table call "dropAll"' },
		});
		expect(await calls.run({ ...event, service: 'mail' })).toEqual({
			ok: false,
			error: { message: 'Unknown service "mail"' },
		});
		expect(tables.call).not.toHaveBeenCalled();
	});

	it('runs a deduplication call for the workflow of the execution', async () => {
		dedup.checkProcessedAndRecord.mockResolvedValue({ new: ['b'], processed: ['a'] });
		const calls = new CompiledServiceCalls(client, logger);
		const event = parseWfrtEvent(line) as WfrtServiceEvent;
		const answer = await calls.run({
			...event,
			service: 'deduplication',
			op: 'checkProcessedAndRecord',
			args: {
				items: ['a', 'b'],
				scope: 'node',
				node: { id: 'n1' },
				workflow: { id: 'other' },
				options: { mode: 'entries' },
			},
		});
		expect(answer).toEqual({ ok: true, result: { new: ['b'], processed: ['a'] } });
		expect(dedup.checkProcessedAndRecord).toHaveBeenCalledWith(
			['a', 'b'],
			'node',
			{ workflow: { id: 'wf1' }, node: { id: 'n1' } },
			{ mode: 'entries' },
		);
	});
});
