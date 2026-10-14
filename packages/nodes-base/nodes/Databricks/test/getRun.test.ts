import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute as getRun } from '../actions/job/getRun.operation';
import { jobParameters } from '../resources/job/parameters';

const HOST = 'https://adb-1234567890.1.azuredatabricks.net';

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('Job -> Get Run', () => {
	const JOB_ID = 281874479417551;
	const RUN_ID = 41847992357943;
	const RUN_PAGE_URL = `${HOST}/?o=123#job/${JOB_ID}/run/${RUN_ID}`;
	const runWith = (fields: object) => ({
		job_id: JOB_ID,
		run_id: RUN_ID,
		run_name: 'Nightly ETL',
		run_page_url: RUN_PAGE_URL,
		start_time: 1789430400000,
		end_time: 1789430460000,
		...fields,
	});

	const setupContext = (runId: string = String(RUN_ID)) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getNodeParameter.mockImplementation((name) =>
			name === 'authentication' ? 'accessToken' : runId,
		);
		context.getCredentials.mockResolvedValue({ host: HOST });
		return context;
	};
	const apiMock = (context: ReturnType<typeof setupContext>) =>
		context.helpers.httpRequestWithAuthentication;

	it('should read the run by its id and return it with the normalized outcome', async () => {
		const context = setupContext();
		const run = runWith({
			status: {
				state: 'TERMINATED',
				termination_details: { code: 'SUCCESS', type: 'SUCCESS', message: 'All good' },
			},
		});
		apiMock(context).mockResolvedValueOnce(run);

		const result = await getRun.call(context, 0);

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({
				method: 'GET',
				url: `${HOST}/api/2.2/jobs/runs/get`,
				qs: { run_id: RUN_ID },
			}),
		);
		expect(result).toEqual([
			{
				json: {
					...run,
					run_state: 'TERMINATED',
					run_finished: true,
					run_result: 'SUCCESS',
					run_succeeded: true,
					run_error_message: null,
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	it.each([
		[
			'a failure reported through termination details',
			{
				status: {
					state: 'TERMINATED',
					termination_details: { code: 'RUN_EXECUTION_ERROR', message: 'Task failed' },
				},
			},
			{
				run_state: 'TERMINATED',
				run_result: 'RUN_EXECUTION_ERROR',
				run_error_message: 'Task failed',
			},
		],
		[
			'termination details without a code',
			{ status: { state: 'TERMINATED', termination_details: { type: 'CLOUD_FAILURE' } } },
			{ run_state: 'TERMINATED', run_result: 'CLOUD_FAILURE', run_error_message: null },
		],
		[
			'a failure reported only through the deprecated state',
			{ state: { life_cycle_state: 'TERMINATED', result_state: 'FAILED', state_message: 'Died' } },
			{ run_state: 'TERMINATED', run_result: 'FAILED', run_error_message: 'Died' },
		],
		[
			'a deprecated skipped run',
			{ state: { life_cycle_state: 'SKIPPED', state_message: 'Another run is active' } },
			{ run_state: 'SKIPPED', run_result: 'SKIPPED', run_error_message: 'Another run is active' },
		],
		[
			'a deprecated internal error',
			{ state: { life_cycle_state: 'INTERNAL_ERROR', state_message: 'Internal error' } },
			{
				run_state: 'INTERNAL_ERROR',
				run_result: 'INTERNAL_ERROR',
				run_error_message: 'Internal error',
			},
		],
		[
			'conflicting status and deprecated state objects',
			{
				status: {
					state: 'TERMINATED',
					termination_details: { code: 'RUN_EXECUTION_ERROR', message: 'from status' },
				},
				state: { life_cycle_state: 'TERMINATED', result_state: 'SUCCESS' },
			},
			{
				run_state: 'TERMINATED',
				run_result: 'RUN_EXECUTION_ERROR',
				run_error_message: 'from status',
			},
		],
	])('should report %s as a finished, failed run', async (_label, fields, expected) => {
		const context = setupContext();
		apiMock(context).mockResolvedValueOnce(runWith(fields));

		const [item] = await getRun.call(context, 0);

		expect(item.json).toMatchObject({ ...expected, run_finished: true, run_succeeded: false });
	});

	it.each([
		['the current state object', { status: { state: 'RUNNING' } }, 'RUNNING'],
		['the deprecated state object', { state: { life_cycle_state: 'PENDING' } }, 'PENDING'],
		['no state at all', {}, null],
	])(
		'should leave the result empty for a run still going, per %s',
		async (_label, fields, state) => {
			const context = setupContext();
			apiMock(context).mockResolvedValueOnce(runWith(fields));

			const [item] = await getRun.call(context, 0);

			expect(item.json).toMatchObject({
				run_state: state,
				run_finished: false,
				run_result: null,
				run_succeeded: null,
				run_error_message: null,
			});
		},
	);

	it('should strip control characters and truncate the reported error message', async () => {
		const context = setupContext();
		apiMock(context).mockResolvedValueOnce(
			runWith({
				status: {
					state: 'TERMINATED',
					termination_details: {
						code: 'RUN_EXECUTION_ERROR',
						message: `bad\x00\x1fmsg${'x'.repeat(600)}`,
					},
				},
			}),
		);

		const [item] = await getRun.call(context, 0);

		expect(item.json.run_error_message).toBe(`bad msg${'x'.repeat(600)}`.slice(0, 500));
	});

	it('should pair the item with the input item it came from', async () => {
		const context = setupContext();
		apiMock(context).mockResolvedValueOnce(runWith({ status: { state: 'RUNNING' } }));

		const result = await getRun.call(context, 4);

		expect(result[0].pairedItem).toEqual({ item: 4 });
	});

	it.each([
		['', 'Run ID must be a whole number'],
		['not-a-number', 'Run ID must be a whole number'],
		['9007199254740993', 'Run ID is too large to send exactly'],
	])('should reject the run ID %j before any request', async (runId, message) => {
		const context = setupContext(runId);

		await expect(getRun.call(context, 0)).rejects.toThrow(message);
		expect(apiMock(context)).not.toHaveBeenCalled();
	});
});

describe('Job -> run locator', () => {
	it('should show the Run locator for both run readers', () => {
		const runId = jobParameters.find((property) => property.name === 'runId');

		expect(runId?.displayOptions?.show?.operation).toEqual(['getRun', 'getRunOutput']);
	});
});
