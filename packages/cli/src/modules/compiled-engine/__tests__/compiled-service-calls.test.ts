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

const memory = vi.hoisted(() => ({ created: [] as Array<{ maxBytes: number }>, run: vi.fn() }));
vi.mock('../workflow-lang', async (original) => {
	const actual = await original<typeof import('../workflow-lang')>();
	return {
		loadWorkflowLang: async () => ({
			...(await actual.loadWorkflowLang()),
			// The rules of the store have their tests in `@n8n/workflow-lang`.
			ChatMemoryStore: class {
				constructor(options: { maxBytes: number }) {
					memory.created.push(options);
				}

				run = memory.run;
			},
		}),
	};
});

import { EngineDataTablesService } from '../../engine-v2/engine-data-tables.service';
import { CompiledEngineCredentials } from '../compiled-engine-credentials';
import { CompiledEngineSync } from '../compiled-engine-sync.service';
import type { CompiledEngineConfig } from '../compiled-engine.config';
import { CompiledServiceCalls } from '../compiled-service-calls';
import type { LoadedWorkflow } from '../compiled-engine-sync.service';
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
	const sync = mock<CompiledEngineSync>();
	const credentials = mock<CompiledEngineCredentials>();
	logger.scoped.mockReturnValue(logger);

	const makeCalls = (chatMemoryMb = 64) =>
		new CompiledServiceCalls(
			client,
			logger,
			sync,
			credentials,
			mock<CompiledEngineConfig>({ chatMemoryMb }),
		);

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
		const calls = makeCalls();
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
		const calls = makeCalls();
		const answer = await calls.run(parseWfrtEvent(line) as WfrtServiceEvent);
		expect(answer).toEqual({ ok: false, error: { message: "unknown column name 'x'" } });
	});

	it('refuses an unknown operation and an unknown service', async () => {
		const calls = makeCalls();
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

	it('saves a token that a fallback-host node refreshed and reloads the credential', async () => {
		const slot = {
			slot: 'oauth',
			type: 'oAuth2Api',
			credentialId: 'cred1',
			credentialName: 'OAuth',
		};
		sync.findLoaded.mockReturnValue({ artifact: { slots: [slot] } } as unknown as LoadedWorkflow);
		const event = parseWfrtEvent(line) as WfrtServiceEvent;
		const answer = await makeCalls().run({
			...event,
			service: 'credentials',
			op: 'updateOauthTokenData',
			args: { credentialId: 'oauth', oauthTokenData: { access_token: 'new' } },
		});
		expect(answer).toEqual({ ok: true, result: true });
		expect(credentials.updateOAuthTokenData).toHaveBeenCalledWith(
			slot,
			{ access_token: 'new' },
			'wf1',
		);
		expect(sync.onCredentialChanged).toHaveBeenCalledWith('cred1');
	});

	it('refreshes an OAuth2 token for a native request and reloads the credential', async () => {
		const slot = {
			slot: 'oauth',
			type: 'oAuth2Api',
			credentialId: 'cred1',
			credentialName: 'OAuth',
		};
		sync.findLoaded.mockReturnValue({ artifact: { slots: [slot] } } as unknown as LoadedWorkflow);
		const event = parseWfrtEvent(line) as WfrtServiceEvent;
		const answer = await makeCalls().run({
			...event,
			service: 'credentials',
			op: 'refreshOAuth2',
			args: { credentialId: 'cred1' },
		});
		expect(answer).toEqual({ ok: true, result: { ok: true } });
		// One protocol: the renewal is shared, and only credential values go to `wfrt`.
		expect(sync.renewCredential).toHaveBeenCalledWith('cred1', 'wf1~manual');
		expect(sync.onCredentialChanged).not.toHaveBeenCalled();
	});

	it('renews the credential of a slot when wfrt asks, also in a manual run', async () => {
		const slot = {
			slot: 'Google Docs:googleApi',
			type: 'googleApi',
			credentialId: 'cred2',
			credentialName: 'Service account',
		};
		sync.findLoaded.mockReturnValue({ artifact: { slots: [slot] } } as unknown as LoadedWorkflow);
		const event = parseWfrtEvent(line) as WfrtServiceEvent;
		const answer = await makeCalls().run({
			...event,
			service: 'credentials',
			op: 'renew',
			// `wfrt` names the slot of the request.
			args: { credentialId: 'Google Docs:googleApi' },
		});
		expect(answer).toEqual({ ok: true, result: { ok: true } });
		expect(sync.findLoaded).toHaveBeenCalledWith('wf1~manual');
		expect(sync.renewCredential).toHaveBeenCalledWith('cred2', 'wf1~manual');
	});

	it('answers with the error of n8n when the renewal fails', async () => {
		const slot = { slot: 'oauth', type: 'oAuth2Api', credentialId: 'cred1', credentialName: 'O' };
		sync.findLoaded.mockReturnValue({ artifact: { slots: [slot] } } as unknown as LoadedWorkflow);
		sync.renewCredential.mockRejectedValue(new Error('Reconnect the credential'));
		const event = parseWfrtEvent(line) as WfrtServiceEvent;
		const answer = await makeCalls().run({
			...event,
			service: 'credentials',
			op: 'renew',
			args: { credentialId: 'oauth' },
		});
		expect(answer).toEqual({ ok: false, error: { message: 'Reconnect the credential' } });
	});

	it('refuses a credential that the workflow does not use', async () => {
		sync.findLoaded.mockReturnValue({
			artifact: {
				slots: [
					{ slot: 'oauth', type: 'oAuth2Api', credentialId: 'cred1', credentialName: 'OAuth' },
				],
			},
		} as unknown as LoadedWorkflow);
		const event = parseWfrtEvent(line) as WfrtServiceEvent;
		const answer = await makeCalls().run({
			...event,
			service: 'credentials',
			op: 'refreshOAuth2',
			args: { credentialId: 'other' },
		});
		expect(answer).toEqual({
			ok: false,
			error: { message: 'The workflow does not use this credential' },
		});
		expect(sync.renewCredential).not.toHaveBeenCalled();
		expect(sync.onCredentialChanged).not.toHaveBeenCalled();
	});

	it('runs a deduplication call for the workflow of the execution', async () => {
		dedup.checkProcessedAndRecord.mockResolvedValue({ new: ['b'], processed: ['a'] });
		const calls = makeCalls();
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
	it('runs the chat memory calls of all executions with one session store', async () => {
		memory.created.length = 0;
		memory.run.mockReturnValue({ ok: true, result: {} });
		const calls = makeCalls(2);
		const event = parseWfrtEvent(line) as WfrtServiceEvent;
		const open = {
			...event,
			service: 'chatMemory',
			op: 'open',
			args: { sessionKey: 'k', window: 5, workflowId: 'other' },
		};
		expect(await calls.run(open)).toEqual({ ok: true, result: {} });
		await calls.run({ ...open, executionId: '78', op: 'load', args: { sessionKey: 'k' } });
		expect(memory.created).toEqual([{ maxBytes: 2 * 1024 * 1024 }]);
		// The workflow of the session is the workflow of the execution, without the manual mark.
		expect(memory.run.mock.calls).toEqual([
			[{ service: 'chatMemory', op: 'open', args: open.args }, 'wf1'],
			[{ service: 'chatMemory', op: 'load', args: { sessionKey: 'k' } }, 'wf1'],
		]);
		expect(tables.call).not.toHaveBeenCalled();
	});

	it('gives the answer of the store, also the one that sends the run to the host', async () => {
		memory.run.mockReturnValue({ ok: true, result: { host: true } });
		const event = parseWfrtEvent(line) as WfrtServiceEvent;
		const answer = await makeCalls(0).run({
			...event,
			service: 'chatMemory',
			op: 'open',
			args: { sessionKey: 'k', window: 5 },
		});
		expect(answer).toEqual({ ok: true, result: { host: true } });
	});
});
