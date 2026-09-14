import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { IExecutionResponse } from '@n8n/db';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';

import { FormStepClient, formStepQuery } from '../form-steps';

const BASE = 'http://127.0.0.1:5678';
const STEP_PATH = '/form-waiting/exec-1';
const STATUS_PATH = `${STEP_PATH}/n8n-execution-status`;
const SIGNATURE = { signature: 'tok-1' };

const page = {
	kind: 'page',
	formTitle: 'Step 2',
	formFields: [{ id: 'field-0', label: 'Name', isInput: true, type: 'text' }],
};
const completion = { kind: 'completion', title: 'Done', message: 'Thanks' };

function buildClient() {
	const executionPersistence = mock<ExecutionPersistence>();
	const logger = mock<Logger>();
	const globalConfig = mock<GlobalConfig>({
		port: 5678,
		endpoints: { formWaiting: 'form-waiting' },
	});
	return {
		client: new FormStepClient(globalConfig, executionPersistence, logger),
		executionPersistence,
		logger,
	};
}

const mockStatus = (...statuses: string[]) => {
	for (const status of statuses) {
		nock(BASE).get(STATUS_PATH).query(SIGNATURE).reply(200, status);
	}
};

describe('formStepQuery', () => {
	it('encodes the block id, execution id and token', () => {
		expect(formStepQuery('f 1', 'exec/1', 'a|b')).toBe('?_form=f%201&_exec=exec%2F1&_sig=a%7Cb');
	});
});

describe('FormStepClient', () => {
	beforeEach(() => {
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	describe('resumeToken', () => {
		it('reads the token of the waiting execution', async () => {
			const { client, executionPersistence } = buildClient();
			executionPersistence.findSingleExecution.mockResolvedValue(
				mock<IExecutionResponse>({ data: { resumeToken: 'tok-1' } }),
			);

			await expect(client.resumeToken('exec-1')).resolves.toBe('tok-1');
			expect(executionPersistence.findSingleExecution).toHaveBeenCalledWith('exec-1', {
				includeData: true,
				unflattenData: true,
			});
		});

		it('throws when the execution has no token', async () => {
			const { client, executionPersistence } = buildClient();
			executionPersistence.findSingleExecution.mockResolvedValue(undefined);

			await expect(client.resumeToken('exec-1')).rejects.toBeInstanceOf(UnexpectedError);
		});
	});

	describe('fetchPage', () => {
		it('asks the waiting run for JSON over loopback once the status settles on form-waiting', async () => {
			const { client } = buildClient();
			mockStatus('form-waiting');
			const get = nock(BASE, { reqheaders: { accept: 'application/json' } })
				.get(STEP_PATH)
				.query(SIGNATURE)
				.reply(200, page, { 'content-type': 'application/json; charset=utf-8' });

			await expect(client.fetchPage('exec-1', 'tok-1')).resolves.toEqual(
				expect.objectContaining({ kind: 'page', formTitle: 'Step 2' }),
			);
			expect(get.isDone()).toBe(true);
		});

		it('polls while the run is still running', async () => {
			const { client } = buildClient();
			mockStatus('running', 'form-waiting');
			nock(BASE)
				.get(STEP_PATH)
				.query(SIGNATURE)
				.reply(200, page, { 'content-type': 'application/json' });

			await expect(client.fetchPage('exec-1', 'tok-1')).resolves.toMatchObject({ kind: 'page' });
			expect(nock.isDone()).toBe(true);
		});

		it('posts once after a completion page so the paused run can end', async () => {
			const { client } = buildClient();
			mockStatus('form-waiting');
			nock(BASE)
				.get(STEP_PATH)
				.query(SIGNATURE)
				.reply(200, completion, { 'content-type': 'application/json' });
			const finish = nock(BASE).post(STEP_PATH).query(SIGNATURE).reply(200);

			await expect(client.fetchPage('exec-1', 'tok-1')).resolves.toMatchObject({
				kind: 'completion',
			});
			expect(finish.isDone()).toBe(true);
		});

		it('does not post again when the run already finished', async () => {
			const { client } = buildClient();
			mockStatus('success');
			nock(BASE)
				.get(STEP_PATH)
				.query(SIGNATURE)
				.reply(200, completion, { 'content-type': 'application/json' });

			await expect(client.fetchPage('exec-1', 'tok-1')).resolves.toMatchObject({
				kind: 'completion',
			});
			expect(nock.pendingMocks()).toEqual([]);
		});

		it('reports a finished run without a completion page as finished', async () => {
			const { client } = buildClient();
			mockStatus('success');
			nock(BASE)
				.get(STEP_PATH)
				.query(SIGNATURE)
				.reply(200, '<html>Form Submitted</html>', { 'content-type': 'text/html' });

			await expect(client.fetchPage('exec-1', 'tok-1')).resolves.toEqual({ kind: 'finished' });
		});

		it('reports a run paused on a non-form node as running', async () => {
			const { client } = buildClient();
			mockStatus('waiting');

			await expect(client.fetchPage('exec-1', 'tok-1')).resolves.toEqual({ kind: 'running' });
		});

		it('maps a failed run, a missing run and a bad signature to errors the visitor may see', async () => {
			const { client } = buildClient();

			mockStatus('error');
			await expect(client.fetchPage('exec-1', 'tok-1')).rejects.toBeInstanceOf(OperationalError);

			mockStatus('null');
			await expect(client.fetchPage('exec-1', 'tok-1')).rejects.toBeInstanceOf(UserError);

			nock(BASE).get(STATUS_PATH).query(SIGNATURE).reply(401, '<html>invalid</html>');
			await expect(client.fetchPage('exec-1', 'tok-1')).rejects.toThrow(
				'This form link is not valid',
			);
		});

		it('rejects page data that does not match the schema', async () => {
			const { client } = buildClient();
			mockStatus('form-waiting');
			nock(BASE)
				.get(STEP_PATH)
				.query(SIGNATURE)
				.reply(200, { kind: 'page', formFields: 'nope' }, { 'content-type': 'application/json' });

			await expect(client.fetchPage('exec-1', 'tok-1')).rejects.toBeInstanceOf(UnexpectedError);
		});
	});

	describe('submitPage', () => {
		it('posts the fields as multipart with choice lists JSON-encoded, then fetches the next page', async () => {
			const { client } = buildClient();
			let body = '';
			const post = nock(BASE)
				.post(STEP_PATH, (raw: string) => {
					body = raw;
					return true;
				})
				.query(SIGNATURE)
				.reply(307, undefined, { location: 'https://public.example/form-waiting/exec-1' });
			mockStatus('form-waiting');
			nock(BASE)
				.get(STEP_PATH)
				.query(SIGNATURE)
				.reply(200, page, { 'content-type': 'application/json' });

			await expect(
				client.submitPage('exec-1', 'tok-1', { 'field-0': 'Ada', 'field-1': ['Red', 'Blue'] }),
			).resolves.toMatchObject({ kind: 'page' });

			expect(post.isDone()).toBe(true);
			expect(body).toContain('name="field-0"');
			expect(body).toContain('Ada');
			expect(body).toContain('["Red","Blue"]');
		});

		it('throws when the waiting run refuses the submission', async () => {
			const { client } = buildClient();
			nock(BASE).post(STEP_PATH).query(SIGNATURE).reply(400, { message: 'bad' });

			await expect(client.submitPage('exec-1', 'tok-1', { 'field-0': 'x' })).rejects.toBeInstanceOf(
				OperationalError,
			);
		});
	});
});
