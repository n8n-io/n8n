import type { INode, IPollFunctions } from 'n8n-workflow';
import { NodeOperationError, UnexpectedError } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { DATABRICKS_PARTNER_USER_AGENT } from '../constants';
import {
	buildPipelineEventsFilter,
	listAllJobRuns,
	listAllPipelineEvents,
	listJobRuns,
	listPipelineEvents,
	type ListJobRunsParams,
	type ListPipelineEventsParams,
} from '../transport';

const HOST = 'https://adb-1234567890.1.azuredatabricks.net';
const JOB_ID = 281874479417551;
const PIPELINE_ID = '8199cd89-e2f5-4169-a6aa-656a24c8886d';
const CURSOR = '2026-09-01T14:20:50Z';

const run = (runId: number) => ({ job_id: JOB_ID, run_id: runId, status: { state: 'TERMINATED' } });
const event = (id: string) => ({ id, event_type: 'update_progress', timestamp: CURSOR });

const createPollContext = () => {
	const context = mockDeep<IPollFunctions>();
	context.getNode.mockReturnValue(mock<INode>({ name: 'Databricks Trigger', typeVersion: 1 }));
	context.getCredentials.mockResolvedValue({ host: HOST });
	return context;
};
const apiMock = (context: ReturnType<typeof createPollContext>) =>
	context.helpers.httpRequestWithAuthentication;
const requestQuery = (context: ReturnType<typeof createPollContext>, call = 0) =>
	apiMock(context).mock.calls[call][1].qs;

describe('listJobRuns', () => {
	it('requests one page with the given filters and the partner User-Agent', async () => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue({ runs: [run(1)], next_page_token: 'page-2' });

		const page = await listJobRuns(context, 'databricksApi', {
			jobId: JOB_ID,
			startTimeFrom: 1788260000000,
			state: 'completed',
			expandTasks: true,
			limit: 25,
		});

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({
				method: 'GET',
				url: `${HOST}/api/2.2/jobs/runs/list`,
				qs: {
					job_id: JOB_ID,
					start_time_from: 1788260000000,
					completed_only: true,
					expand_tasks: true,
					limit: 25,
				},
				headers: expect.objectContaining({ 'User-Agent': DATABRICKS_PARTNER_USER_AGENT }),
			}),
		);
		expect(page).toEqual({ runs: [run(1)], nextPageToken: 'page-2' });
	});

	const queryCases: Array<[string, ListJobRunsParams, Record<string, unknown>]> = [
		['no parameters', {}, {}],
		['a false expandTasks flag', { expandTasks: false }, {}],
		['active runs only', { state: 'active' }, { active_only: true }],
		[
			'a time window',
			{ startTimeFrom: 1, startTimeTo: 2 },
			{ start_time_from: 1, start_time_to: 2 },
		],
		['a page token', { pageToken: 'p2' }, { page_token: 'p2' }],
		['a limit below the range', { limit: 0 }, { limit: 1 }],
		['a limit above the range', { limit: 100 }, { limit: 25 }],
		['a fractional limit', { limit: 7.9 }, { limit: 7 }],
	];

	it.each(queryCases)('sends the query for %s', async (_label, params, qs) => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue({ runs: [] });

		await listJobRuns(context, 'databricksOAuth2Api', params);

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksOAuth2Api',
			expect.objectContaining({ qs }),
		);
	});

	it.each([
		['a page without runs', {}, { runs: [] }],
		[
			'a token without has_more',
			{ runs: [run(1)], next_page_token: 'p2' },
			{ runs: [run(1)], nextPageToken: 'p2' },
		],
		['an empty token', { runs: [run(1)], next_page_token: '' }, { runs: [run(1)] }],
	])('normalises %s', async (_label, response, expected) => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue(response);

		await expect(listJobRuns(context, 'databricksApi')).resolves.toEqual(expected);
	});
});

describe('listAllJobRuns', () => {
	it('follows next_page_token with the same filters until the last page', async () => {
		const context = createPollContext();
		apiMock(context)
			.mockResolvedValueOnce({ runs: [run(1), run(2)], next_page_token: 'p2' })
			.mockResolvedValueOnce({ runs: [run(3)] });

		const result = await listAllJobRuns(context, 'databricksApi', { jobId: JOB_ID, limit: 2 });

		expect(result).toEqual({ runs: [run(1), run(2), run(3)] });
		expect(apiMock(context)).toHaveBeenCalledTimes(2);
		expect(requestQuery(context, 0)).toEqual({ job_id: JOB_ID, limit: 2 });
		expect(requestQuery(context, 1)).toEqual({ job_id: JOB_ID, limit: 2, page_token: 'p2' });
	});

	it('resumes from a given page token', async () => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue({ runs: [run(1)] });

		await listAllJobRuns(context, 'databricksApi', { pageToken: 'p1' });

		expect(requestQuery(context)).toEqual({ page_token: 'p1' });
	});

	it('stops at the page cap and hands back the next token', async () => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue({ runs: [run(1)], next_page_token: 'more' });

		const result = await listAllJobRuns(context, 'databricksApi', {}, 3);

		expect(apiMock(context)).toHaveBeenCalledTimes(3);
		expect(result).toEqual({ runs: [run(1), run(1), run(1)], nextPageToken: 'more' });
	});
});

describe('buildPipelineEventsFilter', () => {
	const cases: Array<
		[string, Pick<ListPipelineEventsParams, 'after' | 'levels'>, string | undefined]
	> = [
		['nothing', {}, undefined],
		['no levels', { levels: [] }, undefined],
		['a cursor', { after: CURSOR }, `timestamp > '${CURSOR}'`],
		['a cursor and no levels', { after: CURSOR, levels: [] }, `timestamp > '${CURSOR}'`],
		[
			'a cursor with fractional seconds',
			{ after: '2026-09-01T14:20:31.066Z' },
			"timestamp > '2026-09-01T14:20:31.066Z'",
		],
		['levels', { levels: ['ERROR', 'WARN'] }, "level in ('ERROR', 'WARN')"],
		[
			'levels and a cursor',
			{ after: CURSOR, levels: ['ERROR'] },
			`level in ('ERROR') AND timestamp > '${CURSOR}'`,
		],
	];

	it.each(cases)('builds the filter for %s', (_label, params, expected) => {
		expect(buildPipelineEventsFilter(params)).toBe(expected);
	});

	it.each([
		'2026-09-01',
		'2026-09-01T14:20:50+02:00',
		"2026-09-01T14:20:50Z' OR level='INFO",
		'now',
	])('rejects the cursor %s', (after) => {
		expect(() => buildPipelineEventsFilter({ after })).toThrow(UnexpectedError);
	});

	it('rejects a level the API does not know', () => {
		const levels = [
			'ERROR',
			"DEBUG') OR level in ('INFO",
		] as unknown as ListPipelineEventsParams['levels'];

		expect(() => buildPipelineEventsFilter({ levels })).toThrow(UnexpectedError);
	});
});

describe('listPipelineEvents', () => {
	it('requests events after the cursor in ascending order with the partner User-Agent', async () => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue({ events: [event('e1')], next_page_token: 'p2' });

		const page = await listPipelineEvents(context, 'databricksApi', {
			pipelineId: PIPELINE_ID,
			after: CURSOR,
			levels: ['ERROR', 'WARN'],
			maxResults: 25,
		});

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({
				method: 'GET',
				url: `${HOST}/api/2.0/pipelines/${PIPELINE_ID}/events`,
				qs: {
					max_results: 25,
					filter: `level in ('ERROR', 'WARN') AND timestamp > '${CURSOR}'`,
					order_by: 'timestamp asc',
				},
				headers: expect.objectContaining({ 'User-Agent': DATABRICKS_PARTNER_USER_AGENT }),
			}),
		);
		expect(page).toEqual({ events: [event('e1')], nextPageToken: 'p2' });
	});

	it('sends only the page token and page size when continuing', async () => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue({ events: [] });

		await listPipelineEvents(context, 'databricksApi', {
			pipelineId: PIPELINE_ID,
			after: CURSOR,
			levels: ['ERROR'],
			maxResults: 25,
			pageToken: 'p2',
		});

		expect(requestQuery(context)).toEqual({ max_results: 25, page_token: 'p2' });
	});

	const orderCases: Array<[string, ListPipelineEventsParams['order'], string]> = [
		['ascending by default', undefined, 'timestamp asc'],
		['ascending', 'asc', 'timestamp asc'],
		['descending', 'desc', 'timestamp desc'],
	];

	it.each(orderCases)('orders %s', async (_label, order, orderBy) => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue({});

		await listPipelineEvents(context, 'databricksApi', { pipelineId: PIPELINE_ID, order });

		expect(requestQuery(context)).toEqual({ order_by: orderBy });
	});

	it.each(['pipelines', '../updates', `${PIPELINE_ID}/events`, ''])(
		'rejects the pipeline ID %j before any request',
		async (pipelineId) => {
			const context = createPollContext();

			await expect(listPipelineEvents(context, 'databricksApi', { pipelineId })).rejects.toThrow(
				NodeOperationError,
			);
			expect(apiMock(context)).not.toHaveBeenCalled();
		},
	);

	it.each([
		['a page without events', {}, { events: [] }],
		['an empty token', { events: [event('e1')], next_page_token: '' }, { events: [event('e1')] }],
	])('normalises %s', async (_label, response, expected) => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue(response);

		await expect(
			listPipelineEvents(context, 'databricksApi', { pipelineId: PIPELINE_ID }),
		).resolves.toEqual(expected);
	});
});

describe('listAllPipelineEvents', () => {
	it('follows next_page_token until the last page', async () => {
		const context = createPollContext();
		apiMock(context)
			.mockResolvedValueOnce({ events: [event('e1')], next_page_token: 'p2' })
			.mockResolvedValueOnce({ events: [event('e2')] });

		const result = await listAllPipelineEvents(context, 'databricksApi', {
			pipelineId: PIPELINE_ID,
			after: CURSOR,
			maxResults: 25,
		});

		expect(result).toEqual({ events: [event('e1'), event('e2')] });
		expect(requestQuery(context, 0)).toEqual({
			max_results: 25,
			filter: `timestamp > '${CURSOR}'`,
			order_by: 'timestamp asc',
		});
		expect(requestQuery(context, 1)).toEqual({ max_results: 25, page_token: 'p2' });
	});

	it('resumes from a given page token', async () => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue({ events: [] });

		await listAllPipelineEvents(context, 'databricksApi', {
			pipelineId: PIPELINE_ID,
			after: CURSOR,
			pageToken: 'p1',
		});

		expect(requestQuery(context)).toEqual({ page_token: 'p1' });
	});

	it('stops at the page cap and hands back the next token', async () => {
		const context = createPollContext();
		apiMock(context).mockResolvedValue({ events: [event('e1')], next_page_token: 'more' });

		const result = await listAllPipelineEvents(
			context,
			'databricksApi',
			{ pipelineId: PIPELINE_ID },
			2,
		);

		expect(apiMock(context)).toHaveBeenCalledTimes(2);
		expect(result).toEqual({ events: [event('e1'), event('e1')], nextPageToken: 'more' });
	});
});
