import { NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	NodeParameterValueType,
} from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute as getRunOutput } from '../actions/job/getRunOutput.operation';
import { getRuns } from '../methods/listSearch';
import { jobParameters } from '../resources/job/parameters';

const HOST = 'https://adb-1234567890.1.azuredatabricks.net';
const JOB_ID = 281874479417551;
const RUN_ID = 41847992357943;

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('Job -> Get Run Output', () => {
	const task = (taskKey: string, runId?: number) => ({
		task_key: taskKey,
		...(runId === undefined ? {} : { run_id: runId }),
		status: { state: 'TERMINATED' },
	});
	const notebookOutput = {
		metadata: { run_id: 1001, task_key: 'extract' },
		notebook_output: { result: '{"rows":42}', truncated: false },
	};
	const sqlOutput = {
		metadata: { run_id: 1002, task_key: 'load' },
		sql_output: { query_output: { output_link: `${HOST}/sql/history` } },
		logs: 'done',
		logs_truncated: false,
	};

	const setupContext = (
		overrides: Record<string, NodeParameterValueType | object> = {},
		itemIndex = 0,
	) => {
		const parameters: Record<string, NodeParameterValueType | object> = {
			authentication: 'accessToken',
			runId: String(RUN_ID),
			...overrides,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getInputData.mockReturnValue([]);
		context.getExecutionCancelSignal.mockReturnValue(undefined);
		context.getNodeParameter.mockImplementation((name, index) =>
			index === itemIndex ? parameters[name] : undefined,
		);
		context.getCredentials.mockResolvedValue({ host: HOST });
		return context;
	};
	const apiMock = (context: ReturnType<typeof setupContext>) =>
		context.helpers.httpRequestWithAuthentication;
	const getRequest = (path: string, qs: object) =>
		expect.objectContaining({ method: 'GET', url: `${HOST}${path}`, qs });

	it('should return one item per task, tagged with the task and run IDs', async () => {
		const context = setupContext({}, 2);
		apiMock(context)
			.mockResolvedValueOnce({
				job_id: JOB_ID,
				run_id: RUN_ID,
				tasks: [task('extract', 1001), task('load', 1002)],
			})
			.mockResolvedValueOnce(notebookOutput)
			.mockResolvedValueOnce(sqlOutput);

		const result = await getRunOutput.call(context, 2);

		expect(apiMock(context)).toHaveBeenCalledTimes(3);
		expect(apiMock(context)).toHaveBeenNthCalledWith(
			1,
			'databricksApi',
			getRequest('/api/2.2/jobs/runs/get', { run_id: RUN_ID }),
		);
		expect(apiMock(context)).toHaveBeenNthCalledWith(
			2,
			'databricksApi',
			getRequest('/api/2.2/jobs/runs/get-output', { run_id: 1001 }),
		);
		expect(apiMock(context)).toHaveBeenNthCalledWith(
			3,
			'databricksApi',
			getRequest('/api/2.2/jobs/runs/get-output', { run_id: 1002 }),
		);
		expect(result).toEqual([
			{
				json: {
					run_id: RUN_ID,
					job_id: JOB_ID,
					task_key: 'extract',
					task_run_id: 1001,
					truncated: false,
					...notebookOutput,
				},
				pairedItem: { item: 2 },
			},
			{
				json: {
					run_id: RUN_ID,
					job_id: JOB_ID,
					task_key: 'load',
					task_run_id: 1002,
					truncated: false,
					...sqlOutput,
				},
				pairedItem: { item: 2 },
			},
		]);
	});

	it.each([
		['lists no tasks', { job_id: JOB_ID, run_id: RUN_ID }],
		['lists tasks without run IDs', { job_id: JOB_ID, run_id: RUN_ID, tasks: [task('main')] }],
	])('should read the output of the run itself when it %s', async (_label, run) => {
		const context = setupContext();
		apiMock(context).mockResolvedValueOnce(run).mockResolvedValueOnce(notebookOutput);

		const result = await getRunOutput.call(context, 0);

		expect(apiMock(context)).toHaveBeenCalledTimes(2);
		expect(apiMock(context)).toHaveBeenNthCalledWith(
			2,
			'databricksApi',
			getRequest('/api/2.2/jobs/runs/get-output', { run_id: RUN_ID }),
		);
		expect(result).toEqual([
			{
				json: {
					run_id: RUN_ID,
					job_id: JOB_ID,
					task_key: undefined,
					task_run_id: RUN_ID,
					truncated: false,
					...notebookOutput,
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should follow the task pages of a large run before reading outputs', async () => {
		const context = setupContext();
		apiMock(context)
			.mockResolvedValueOnce({
				job_id: JOB_ID,
				run_id: RUN_ID,
				tasks: [task('extract', 1001)],
				next_page_token: 'tasks-2',
			})
			.mockResolvedValueOnce({ job_id: JOB_ID, run_id: RUN_ID, tasks: [task('load', 1002)] })
			.mockResolvedValueOnce(notebookOutput)
			.mockResolvedValueOnce(sqlOutput);

		const result = await getRunOutput.call(context, 0);

		expect(apiMock(context)).toHaveBeenCalledTimes(4);
		expect(apiMock(context)).toHaveBeenNthCalledWith(
			2,
			'databricksApi',
			getRequest('/api/2.2/jobs/runs/get', { run_id: RUN_ID, page_token: 'tasks-2' }),
		);
		expect(result.map((item) => item.json.task_key)).toEqual(['extract', 'load']);
	});

	it('should fail instead of returning a partial task list when the run has more task pages than the node reads', async () => {
		const context = setupContext({}, 2);
		apiMock(context).mockResolvedValue({
			job_id: JOB_ID,
			run_id: RUN_ID,
			tasks: [task('extract', 1001)],
			next_page_token: 'more',
		});

		const result = getRunOutput.call(context, 2);

		await expect(result).rejects.toBeInstanceOf(NodeOperationError);
		await expect(result).rejects.toMatchObject({
			message: `Run ${RUN_ID} has more tasks than the node can read`,
			context: { itemIndex: 2 },
		});
		expect(apiMock(context)).toHaveBeenCalledTimes(20);
		expect(apiMock(context).mock.calls.map(([, options]) => options.url)).not.toContain(
			`${HOST}/api/2.2/jobs/runs/get-output`,
		);
	});

	it.each([
		[
			'the notebook output is truncated',
			{ notebook_output: { result: 'x', truncated: true } },
			true,
		],
		['the logs are truncated', { logs: 'y', logs_truncated: true }, true],
		[
			'the clean room notebook output is truncated',
			{ clean_rooms_notebook_output: { notebook_output: { result: 'x', truncated: true } } },
			true,
		],
		['nothing is truncated', { notebook_output: { result: 'x' }, logs: 'y' }, false],
		['the run has not produced output yet', { metadata: { status: { state: 'RUNNING' } } }, false],
	])('should flag truncation when %s', async (_label, output, truncated) => {
		const context = setupContext();
		apiMock(context)
			.mockResolvedValueOnce({ job_id: JOB_ID, run_id: RUN_ID, tasks: [task('main', 1001)] })
			.mockResolvedValueOnce(output);

		const [item] = await getRunOutput.call(context, 0);

		expect(item.json.truncated).toBe(truncated);
	});

	it.each([
		['', 'Run ID must be a whole number'],
		['not-a-number', 'Run ID must be a whole number'],
		['9007199254740993', 'Run ID is too large to send exactly'],
	])('should reject the run ID %j before calling the API', async (runId, message) => {
		const context = setupContext({ runId }, 2);

		const result = getRunOutput.call(context, 2);

		await expect(result).rejects.toBeInstanceOf(NodeOperationError);
		await expect(result).rejects.toMatchObject({ message, context: { itemIndex: 2 } });
		expect(apiMock(context)).not.toHaveBeenCalled();
	});
});

describe('Job -> Get Run Output (run locator URL mode)', () => {
	const urlMode = jobParameters
		.find((property) => property.name === 'runId')
		?.modes?.find((mode) => mode.name === 'url');
	const regexSource = urlMode?.extractValue?.type === 'regex' ? urlMode.extractValue.regex : '';
	const regex = new RegExp(String(regexSource));

	it('should define a regex for the URL mode', () => {
		expect(regexSource).not.toBe('');
	});

	it.each([
		'https://adb-1234567890.1.azuredatabricks.net/jobs/281874479417551/runs/41847992357943',
		'https://dbc-5a643033-7dd4.cloud.databricks.com/?o=7474656527543353#job/281874479417551/run/41847992357943',
		'https://dbc-5a643033-7dd4.cloud.databricks.com/#job/281874479417551/run/41847992357943',
	])('should extract the run ID from %s', (url) => {
		const match = regex.exec(url);
		expect(match).toHaveLength(2);
		expect(match?.[1]).toBe('41847992357943');
	});

	it.each([
		'https://adb-1234567890.1.azuredatabricks.net/jobs/281874479417551',
		'https://dbc-5a643033-7dd4.cloud.databricks.com/#job/281874479417551',
		'http://adb-1234567890.1.azuredatabricks.net/jobs/281874479417551/runs/41847992357943',
		'https://adb-1234567890.1.azuredatabricks.net/jobs/281874479417551/runs/latest',
	])('should not match %s', (url) => {
		expect(regex.exec(url)).toBeNull();
	});
});

describe('listSearch -> getRuns', () => {
	const run = (runId: number, fields: object = {}) => ({
		run_id: runId,
		job_id: JOB_ID,
		run_page_url: `${HOST}/jobs/${JOB_ID}/runs/${runId}`,
		...fields,
	});
	const listItem = (runId: number, name: string) => ({
		name,
		value: String(runId),
		url: `${HOST}/jobs/${JOB_ID}/runs/${runId}`,
	});
	const succeeded = { state: 'TERMINATED', termination_details: { code: 'SUCCESS' } };
	const failed = { state: 'TERMINATED', termination_details: { code: 'FAILED' } };

	const setupContext = () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ host: HOST });
		return context;
	};
	const apiMock = (context: ReturnType<typeof setupContext>) =>
		context.helpers.httpRequestWithAuthentication;

	it('should name each run by job, outcome, start time and run ID, and return the next token', async () => {
		const context = setupContext();
		apiMock(context).mockResolvedValue({
			runs: [
				run(1, { run_name: 'Nightly ETL', status: succeeded, start_time: 1757923200000 }),
				run(2, { status: { state: 'RUNNING' }, start_time: 1757926800000 }),
			],
			has_more: true,
			next_page_token: 'next-token',
		});

		const result = await getRuns.call(context, undefined, 'prev-token');

		expect(apiMock(context)).toHaveBeenCalledTimes(1);
		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({
				method: 'GET',
				url: `${HOST}/api/2.2/jobs/runs/list`,
				qs: { limit: 25, page_token: 'prev-token' },
			}),
		);
		expect(result).toEqual({
			results: [
				listItem(1, 'Nightly ETL · SUCCESS · 2025-09-15 08:00:00 UTC · Run 1'),
				listItem(2, `Job ${JOB_ID} · RUNNING · 2025-09-15 09:00:00 UTC · Run 2`),
			],
			paginationToken: 'next-token',
		});
	});

	it('should give two runs of the same job different names', async () => {
		const context = setupContext();
		apiMock(context).mockResolvedValue({
			runs: [
				run(1, { run_name: 'Nightly ETL', status: succeeded, start_time: 1757923200000 }),
				run(2, { run_name: 'Nightly ETL', status: failed, start_time: 1757836800000 }),
			],
		});

		const { results } = await getRuns.call(context);

		expect(results.map((item) => item.name)).toEqual([
			'Nightly ETL · SUCCESS · 2025-09-15 08:00:00 UTC · Run 1',
			'Nightly ETL · FAILED · 2025-09-14 08:00:00 UTC · Run 2',
		]);
	});

	it('should describe a run reported only through the deprecated state object', async () => {
		const context = setupContext();
		apiMock(context).mockResolvedValue({
			runs: [
				run(3, {
					run_name: 'Backfill',
					state: { life_cycle_state: 'TERMINATED', result_state: 'CANCELED' },
				}),
			],
		});

		const result = await getRuns.call(context);

		expect(result).toEqual({ results: [listItem(3, 'Backfill · CANCELED · Run 3')] });
	});

	it('should handle a workspace without runs, whose page carries no runs key', async () => {
		const context = setupContext();
		apiMock(context).mockResolvedValue({ has_more: false });

		const result = await getRuns.call(context);

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({ qs: { limit: 25 } }),
		);
		expect(result).toEqual({ results: [] });
	});

	it('should scan pages and match the filter anywhere in the name, ignoring case', async () => {
		const context = setupContext();
		apiMock(context)
			.mockResolvedValueOnce({
				runs: [
					run(1, { run_name: 'Nightly ETL', status: failed }),
					run(2, { run_name: 'Daily Load', status: succeeded }),
				],
				has_more: true,
				next_page_token: 'page-2',
			})
			.mockResolvedValueOnce({
				runs: [
					run(3, { run_name: 'Backfill', status: failed }),
					run(4, { run_name: 'nightly cleanup', status: succeeded }),
				],
				has_more: false,
			});

		const result = await getRuns.call(context, 'Nightly');

		expect(apiMock(context)).toHaveBeenCalledTimes(2);
		expect(apiMock(context)).toHaveBeenNthCalledWith(
			2,
			'databricksApi',
			expect.objectContaining({ qs: { limit: 25, page_token: 'page-2' } }),
		);
		expect(result).toEqual({
			results: [
				listItem(1, 'Nightly ETL · FAILED · Run 1'),
				listItem(4, 'nightly cleanup · SUCCESS · Run 4'),
			],
		});
	});

	it('should match the filter against the run outcome', async () => {
		const context = setupContext();
		apiMock(context).mockResolvedValue({
			runs: [
				run(1, { run_name: 'Nightly ETL', status: failed }),
				run(2, { run_name: 'Daily Load', status: succeeded }),
			],
		});

		const result = await getRuns.call(context, 'failed');

		expect(result).toEqual({ results: [listItem(1, 'Nightly ETL · FAILED · Run 1')] });
	});

	it('should resume a filtered search from the incoming token', async () => {
		const context = setupContext();
		apiMock(context).mockResolvedValue({ runs: [run(9, { run_name: 'Nightly ETL' })] });

		await getRuns.call(context, 'Nightly', 'prev-token');

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({ qs: { limit: 25, page_token: 'prev-token' } }),
		);
	});

	it('should stop scanning after ten pages and hand back the continuation token', async () => {
		const context = setupContext();
		apiMock(context).mockResolvedValue({ has_more: true, next_page_token: 'more' });

		const result = await getRuns.call(context, 'missing');

		expect(apiMock(context)).toHaveBeenCalledTimes(10);
		expect(result).toEqual({ results: [], paginationToken: 'more' });
	});
});
