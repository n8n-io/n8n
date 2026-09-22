import type {
	IDataObject,
	INode,
	IPollFunctions,
	JsonObject,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { DatabricksJobRun } from '../actions/interfaces';
import { DEFAULT_MAX_PAGES, JOB_RUNS_MAX_PAGE_SIZE } from '../transport';
import { pollJobRunEvents } from '../trigger/jobRunEvents';
import { OVERLAP_MS } from '../trigger/shared';

const HOST = 'https://adb-example.cloud.databricks.com';
const JOB_ID = 281874479417551;
const RUN_ID = 41847992357943;
const RUN_URL = `${HOST}/?o=1234567890#job/${JOB_ID}/run/${RUN_ID}`;
const START_TIME = 1756733838171;
const END_TIME = 1756733878640;
const STARTED_AT = '2025-09-01T13:37:18.171Z';
const ENDED_AT = '2025-09-01T13:37:58.640Z';
const NOW = END_TIME + 10 * 60 * 1000;
const CURSOR = START_TIME - 1000;
const POLL_BUDGET_MS = 36_000;
const FAILURE_MESSAGE =
	'Task main failed with message: Workload failed, see run output for details.';
const ALL_EVENTS = ['runFailed', 'runStarted', 'runSucceeded'];

const STATUS_IN_FLIGHT = ['BLOCKED', 'PENDING', 'QUEUED', 'RUNNING', 'TERMINATING', 'WAITING'];
const LEGACY_IN_FLIGHT = [
	'PENDING',
	'RUNNING',
	'TERMINATING',
	'BLOCKED',
	'WAITING_FOR_RETRY',
	'QUEUED',
];

const node = mock<INode>({ name: 'Databricks Trigger', typeVersion: 1 });

type RunOverrides = Partial<DatabricksJobRun>;
type JobParameter = NonNullable<DatabricksJobRun['job_parameters']>[number];

const jobParameter = (name: string, values: Pick<JobParameter, 'value' | 'default'>) => ({
	name,
	...values,
});

const listedRun = (overrides: RunOverrides = {}): DatabricksJobRun => ({
	job_id: JOB_ID,
	run_id: RUN_ID,
	run_name: 'n8n-spike-webhook-test',
	run_page_url: RUN_URL,
	trigger: 'ONE_TIME',
	creator_user_name: 'service-principal@example.com',
	job_parameters: [jobParameter('fail', { value: 'true' })],
	start_time: START_TIME,
	end_time: END_TIME,
	run_duration: 40469,
	queue_duration: 14111,
	status: {
		state: 'TERMINATED',
		termination_details: {
			code: 'RUN_EXECUTION_ERROR',
			type: 'CLIENT_ERROR',
			message: FAILURE_MESSAGE,
		},
	},
	state: { life_cycle_state: 'TERMINATED', result_state: 'FAILED', state_message: FAILURE_MESSAGE },
	...overrides,
});

const succeeded: RunOverrides = {
	status: { state: 'TERMINATED', termination_details: { code: 'SUCCESS', type: 'SUCCESS' } },
	state: { life_cycle_state: 'TERMINATED', result_state: 'SUCCESS' },
};

const failedRun = listedRun();
const succeededRun = listedRun(succeeded);
const runningRun = listedRun({
	end_time: 0,
	run_duration: undefined,
	status: { state: 'RUNNING' },
	state: { life_cycle_state: 'RUNNING' },
});
const terminatingRun = listedRun({
	...runningRun,
	status: { state: 'TERMINATING', termination_details: { code: 'SUCCESS', type: 'SUCCESS' } },
});

const runAt = (runId: number, startTime: number, base = succeededRun): DatabricksJobRun => ({
	...base,
	run_id: runId,
	start_time: startTime,
	end_time: base.end_time ? startTime + 1000 : 0,
});

const mixedPage = [
	runAt(3, START_TIME + 2000, succeededRun),
	runAt(2, START_TIME + 1000, failedRun),
	runAt(1, START_TIME, runningRun),
];

const simplifiedRun = {
	id: RUN_ID,
	name: 'n8n-spike-webhook-test',
	url: RUN_URL,
	trigger: 'ONE_TIME',
	creator: 'service-principal@example.com',
	parameters: { fail: 'true' },
};

const failedResult = {
	state: 'TERMINATED',
	code: 'RUN_EXECUTION_ERROR',
	type: 'CLIENT_ERROR',
	message: FAILURE_MESSAGE,
};

const finishedTiming = {
	startedAt: STARTED_AT,
	endedAt: ENDED_AT,
	durationMs: 40469,
	queuedMs: 14111,
};
const inFlightTiming = { startedAt: STARTED_AT, queuedMs: 14111 };

const simplifiedItem = (event: string, overrides: IDataObject = {}) => ({
	json: { event, job: { id: JOB_ID }, run: simplifiedRun, timing: finishedTiming, ...overrides },
});

const emitted = (event: string, id: number) => ({ event, run: expect.objectContaining({ id }) });

const tracked = (startMs: number, terminal: boolean) => ({ startMs, terminal });

const watchingState = (runs: IDataObject = {}, cursorMs = CURSOR): IDataObject => ({
	jobId: JOB_ID,
	cursorMs,
	floorMs: cursorMs - OVERLAP_MS,
	runs,
});

const freshState = (jobId = JOB_ID): IDataObject => ({
	jobId,
	cursorMs: NOW,
	floorMs: NOW,
	runs: {},
});

const apiErrorFromBody = (status: number, data: JsonObject) =>
	new NodeApiError(node, {
		message: `Request failed with status code ${status}`,
		response: { status, data },
	});

type ContextOptions = {
	events?: NodeParameterValueType;
	simplify?: boolean;
	jobId?: string;
	mode?: 'trigger' | 'manual';
	pollBudgetMs?: number;
	staticData?: IDataObject;
};

const createContext = (options: ContextOptions = {}) => {
	const context = mockDeep<IPollFunctions>();
	const staticData = options.staticData ?? {};
	context.getNode.mockReturnValue(node);
	context.getMode.mockReturnValue(options.mode ?? 'trigger');
	context.getPollBudgetMs.mockReturnValue(options.pollBudgetMs ?? POLL_BUDGET_MS);
	context.getWorkflowStaticData.mockReturnValue(staticData);
	context.getCredentials.mockResolvedValue({ host: HOST });
	context.getNodeParameter.mockImplementation((name, fallback) => {
		switch (name) {
			case 'authentication':
				return 'accessToken';
			case 'events':
				return options.events ?? ['runFailed', 'runSucceeded'];
			case 'simplify':
				return options.simplify ?? true;
			case 'jobId':
				return options.jobId ?? String(JOB_ID);
			default:
				return fallback;
		}
	});
	const api = context.helpers.httpRequestWithAuthentication;
	const requestQuery = (call = 0) => api.mock.calls[call][1].qs;
	const poll = async () => await pollJobRunEvents.call(context);
	const pollWith = async (runs: DatabricksJobRun[], nextPageToken?: string) => {
		api.mockResolvedValueOnce({ runs, next_page_token: nextPageToken });
		return await poll();
	};
	const eventsWith = async (runs: DatabricksJobRun[], nextPageToken?: string) =>
		((await pollWith(runs, nextPageToken)) ?? [[]])[0].map((item) => ({
			event: item.json.event,
			run: item.json.run,
		}));
	return { context, staticData, api, requestQuery, poll, pollWith, eventsWith };
};

describe('pollJobRunEvents', () => {
	beforeEach(() => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('first poll', () => {
		it('starts watching from now without calling the API', async () => {
			const { staticData, api, poll } = createContext();

			await expect(poll()).resolves.toBeNull();

			expect(staticData).toEqual(freshState());
			expect(api).not.toHaveBeenCalled();
		});

		it.each([
			['state of another job', { ...watchingState({ '7': tracked(5, false) }, 5), jobId: 1 }],
			['state of another job with a leftover key', { ...watchingState(), jobId: 1, seen: 3 }],
			['state with a broken shape', { jobId: JOB_ID, cursorMs: 'yesterday', runs: [] }],
			['state without a floor', { jobId: JOB_ID, cursorMs: CURSOR, runs: {} }],
			['state with a broken run entry', watchingState({ '7': { startMs: 5 } })],
		])('resets %s in place', async (_label, stale) => {
			const staticData: IDataObject = { ...stale };
			const { api, poll } = createContext({ staticData });

			await expect(poll()).resolves.toBeNull();

			expect(staticData).toEqual(freshState());
			expect(api).not.toHaveBeenCalled();
		});

		it('does not emit a run that started before the watch began', async () => {
			const { staticData, requestQuery, poll, pollWith } = createContext({ events: ALL_EVENTS });

			await expect(poll()).resolves.toBeNull();
			await expect(pollWith([runAt(1, NOW - 1000)])).resolves.toBeNull();

			expect(requestQuery()).toMatchObject({ start_time_from: NOW });
			expect(staticData).toEqual(freshState());
		});
	});

	describe('classification', () => {
		it.each<[string, RunOverrides, string, IDataObject]>([
			['a failed run', {}, 'runFailed', failedResult],
			[
				'a successful run',
				succeeded,
				'runSucceeded',
				{ state: 'TERMINATED', code: 'SUCCESS', type: 'SUCCESS' },
			],
			[
				'a run with task failures',
				{
					status: {
						state: 'TERMINATED',
						termination_details: { code: 'SUCCESS_WITH_FAILURES', type: 'SUCCESS' },
					},
					state: { life_cycle_state: 'TERMINATED', result_state: 'SUCCESS_WITH_FAILURES' },
				},
				'runFailed',
				{ state: 'TERMINATED', code: 'SUCCESS_WITH_FAILURES', type: 'SUCCESS' },
			],
			[
				'termination details with only a failure type',
				{ status: { state: 'TERMINATED', termination_details: { type: 'INTERNAL_ERROR' } } },
				'runFailed',
				{ state: 'TERMINATED', code: 'INTERNAL_ERROR', type: 'INTERNAL_ERROR' },
			],
			[
				'termination details with only a success type',
				{ status: { state: 'TERMINATED', termination_details: { type: 'SUCCESS' } } },
				'runSucceeded',
				{ state: 'TERMINATED', code: 'SUCCESS', type: 'SUCCESS' },
			],
			[
				'a terminated run with empty termination details',
				{ status: { state: 'TERMINATED', termination_details: {} } },
				'runFailed',
				{ state: 'TERMINATED', code: 'UNKNOWN' },
			],
			[
				'a terminated run without termination details',
				{ status: { state: 'TERMINATED' }, state: undefined },
				'runFailed',
				{ state: 'TERMINATED', code: 'TERMINATED' },
			],
			[
				'a run whose status disagrees with its legacy state',
				{
					...succeeded,
					state: {
						life_cycle_state: 'INTERNAL_ERROR',
						result_state: 'FAILED',
						state_message: 'legacy',
					},
				},
				'runSucceeded',
				{ state: 'TERMINATED', code: 'SUCCESS', type: 'SUCCESS' },
			],
			[
				'a failed legacy run',
				{
					status: undefined,
					state: { life_cycle_state: 'TERMINATED', result_state: 'FAILED', state_message: 'boom' },
				},
				'runFailed',
				{ state: 'TERMINATED', code: 'FAILED', message: 'boom' },
			],
			[
				'a successful legacy run',
				{ status: undefined, state: { life_cycle_state: 'TERMINATED', result_state: 'SUCCESS' } },
				'runSucceeded',
				{ state: 'TERMINATED', code: 'SUCCESS' },
			],
			[
				'a legacy run with task failures',
				{
					status: undefined,
					state: { life_cycle_state: 'TERMINATED', result_state: 'SUCCESS_WITH_FAILURES' },
				},
				'runFailed',
				{ state: 'TERMINATED', code: 'SUCCESS_WITH_FAILURES' },
			],
			[
				'a skipped legacy run',
				{ status: undefined, state: { life_cycle_state: 'SKIPPED', state_message: 'Run skipped' } },
				'runFailed',
				{ state: 'SKIPPED', code: 'SKIPPED', message: 'Run skipped' },
			],
			[
				'an internal error legacy run',
				{ status: undefined, state: { life_cycle_state: 'INTERNAL_ERROR' } },
				'runFailed',
				{ state: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR' },
			],
		])('classifies %s', async (_label, overrides, event, result) => {
			const { staticData, pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([listedRun(overrides)])).resolves.toEqual([
				[simplifiedItem(event, { result })],
			]);
			expect(staticData).toEqual(
				watchingState({ [RUN_ID]: tracked(START_TIME, true) }, START_TIME),
			);
		});

		it.each<[string, RunOverrides]>([
			...STATUS_IN_FLIGHT.map((state): [string, RunOverrides] => [
				`status.state ${state}`,
				{ status: { state } },
			]),
			['status.state TERMINATING with termination details', terminatingRun],
			[
				'status.state RUNNING over a terminated legacy state',
				{ state: { life_cycle_state: 'TERMINATED', result_state: 'SUCCESS' } },
			],
			...LEGACY_IN_FLIGHT.map((life_cycle_state): [string, RunOverrides] => [
				`legacy life_cycle_state ${life_cycle_state}`,
				{ status: undefined, state: { life_cycle_state } },
			]),
		])('treats %s as in flight', async (_label, overrides) => {
			const { staticData, pollWith } = createContext({
				events: ALL_EVENTS,
				staticData: watchingState(),
			});

			await expect(pollWith([{ ...runningRun, ...overrides }])).resolves.toEqual([
				[simplifiedItem('runStarted', { timing: inFlightTiming })],
			]);
			expect(staticData).toEqual(
				watchingState({ [RUN_ID]: tracked(START_TIME, false) }, START_TIME),
			);
		});

		it.each<[string, RunOverrides, IDataObject]>([
			[
				'run_duration is missing',
				{ run_duration: undefined },
				{ ...finishedTiming, durationMs: END_TIME - START_TIME },
			],
			[
				'queue_duration is missing',
				{ queue_duration: undefined },
				{ startedAt: STARTED_AT, endedAt: ENDED_AT, durationMs: 40469 },
			],
		])('simplifies the timing when %s', async (_label, overrides, timing) => {
			const { pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([listedRun(overrides)])).resolves.toEqual([
				[simplifiedItem('runFailed', { result: failedResult, timing })],
			]);
		});

		it.each<[string, DatabricksJobRun['job_parameters'], IDataObject]>([
			['a value', [jobParameter('fail', { value: 'true' })], { fail: 'true' }],
			['a default', [jobParameter('fail', { default: 'false' })], { fail: 'false' }],
			[
				'a value over its default',
				[jobParameter('fail', { value: 'true', default: 'false' })],
				{ fail: 'true' },
			],
			['the name __proto__', [jobParameter('__proto__', { value: 'x' })], { ['__proto__']: 'x' }],
			['no name', [{ value: 'true' }], {}],
			['no parameters', undefined, {}],
		])('reads a job parameter with %s', async (_label, job_parameters, parameters) => {
			const { pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([listedRun({ job_parameters })])).resolves.toEqual([
				[
					simplifiedItem('runFailed', {
						result: failedResult,
						run: { ...simplifiedRun, parameters },
					}),
				],
			]);
		});

		it('returns the raw run behind the event label when simplify is off', async () => {
			const { pollWith } = createContext({ simplify: false, staticData: watchingState() });

			await expect(pollWith([failedRun])).resolves.toEqual([
				[{ json: { event: 'runFailed', ...failedRun } }],
			]);
		});

		it('skips runs without a run ID or start time', async () => {
			const { staticData, pollWith } = createContext({ staticData: watchingState() });

			await expect(
				pollWith([
					{ ...failedRun, run_id: undefined },
					{ ...failedRun, start_time: undefined },
					{ ...runningRun, start_time: 0 },
				]),
			).resolves.toBeNull();
			expect(staticData).toEqual(watchingState());
		});

		it('rejects a page with a null entry in the listed runs and keeps the state', async () => {
			const { staticData, api, poll } = createContext({ staticData: watchingState() });
			api.mockResolvedValueOnce({ runs: [null, failedRun] });

			await expect(poll()).rejects.toThrow('Databricks did not return a JSON list of job runs');
			expect(staticData).toEqual(watchingState());
		});
	});

	describe('run lifecycle across polls', () => {
		it('tracks a running run without emitting when runStarted is not subscribed', async () => {
			const { staticData, pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([runningRun])).resolves.toBeNull();
			expect(staticData).toEqual(
				watchingState({ [RUN_ID]: tracked(START_TIME, false) }, START_TIME),
			);
		});

		it.each([
			['a running run', runningRun],
			['a terminating run', terminatingRun],
		])(
			'emits the terminal event once, without a second runStarted, when %s finishes',
			async (_label, inFlight) => {
				const { staticData, eventsWith } = createContext({
					events: ['runStarted', 'runSucceeded'],
					staticData: watchingState(),
				});

				await expect(eventsWith([inFlight])).resolves.toEqual([emitted('runStarted', RUN_ID)]);
				expect(staticData).toEqual(
					watchingState({ [RUN_ID]: tracked(START_TIME, false) }, START_TIME),
				);

				await expect(eventsWith([succeededRun])).resolves.toEqual([
					emitted('runSucceeded', RUN_ID),
				]);
				expect(staticData).toEqual(
					watchingState({ [RUN_ID]: tracked(START_TIME, true) }, START_TIME),
				);

				await expect(eventsWith([succeededRun])).resolves.toEqual([]);
			},
		);

		it('emits runStarted then the terminal event for a run that started and finished between polls', async () => {
			const { eventsWith } = createContext({ events: ALL_EVENTS, staticData: watchingState() });

			await expect(eventsWith([succeededRun])).resolves.toEqual([
				emitted('runStarted', RUN_ID),
				emitted('runSucceeded', RUN_ID),
			]);
		});

		it.each([
			[
				'runStarted',
				[emitted('runStarted', 1), emitted('runStarted', 2), emitted('runStarted', 3)],
			],
			['runFailed', [emitted('runFailed', 2)]],
			['runSucceeded', [emitted('runSucceeded', 3)]],
		])('emits only %s when it is the single subscribed event', async (event, expected) => {
			const { eventsWith } = createContext({ events: [event], staticData: watchingState() });

			await expect(eventsWith(mixedPage)).resolves.toEqual(expected);
		});

		it('does not emit a terminal run again when the overlap window lists it a second time', async () => {
			const { api, pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([failedRun])).resolves.toHaveLength(1);
			await expect(pollWith([failedRun])).resolves.toBeNull();
			await expect(pollWith([failedRun])).resolves.toBeNull();
			expect(api).toHaveBeenCalledTimes(3);
		});

		it.each([
			[
				'start times',
				[runAt(3, START_TIME + 2000), runAt(1, START_TIME), runAt(2, START_TIME + 1000)],
			],
			[
				'run IDs when the start times match',
				[runAt(3, START_TIME), runAt(1, START_TIME), runAt(2, START_TIME)],
			],
		])('emits several new runs ordered by %s', async (_label, runs) => {
			const { eventsWith } = createContext({ staticData: watchingState() });

			await expect(eventsWith(runs)).resolves.toEqual([
				emitted('runSucceeded', 1),
				emitted('runSucceeded', 2),
				emitted('runSucceeded', 3),
			]);
		});
	});

	describe('cursor', () => {
		it('lists the runs of the job from five minutes before the cursor', async () => {
			const { context, api, requestQuery, pollWith } = createContext({
				staticData: watchingState(),
			});

			await pollWith([failedRun]);

			expect(context.getNodeParameter).toHaveBeenCalledWith('jobId', '', { extractValue: true });
			expect(api).toHaveBeenCalledTimes(1);
			expect(requestQuery()).toEqual({
				job_id: JOB_ID,
				start_time_from: CURSOR - OVERLAP_MS,
				limit: JOB_RUNS_MAX_PAGE_SIZE,
			});
		});

		it('never advances past the oldest run that is still in flight', async () => {
			const t1 = START_TIME;
			const t2 = START_TIME + 60_000;
			const listing = [runAt(2, t2), runAt(1, t1, runningRun)];
			const { staticData, requestQuery, pollWith } = createContext({
				staticData: watchingState(),
			});

			await pollWith(listing);
			expect(staticData).toEqual(
				watchingState({ '1': tracked(t1, false), '2': tracked(t2, true) }, t1),
			);

			await pollWith(listing);
			expect(requestQuery(1)).toMatchObject({ start_time_from: t1 - OVERLAP_MS });
		});

		it('advances past an in-flight run once it finishes and drops entries the window can no longer list', async () => {
			const t1 = START_TIME;
			const t2 = START_TIME + OVERLAP_MS + 60_000;
			const { staticData, pollWith } = createContext({ staticData: watchingState() });

			await pollWith([runAt(2, t2), runAt(1, t1, runningRun)]);
			expect(staticData).toMatchObject({ cursorMs: t1 });

			await pollWith([runAt(2, t2), runAt(1, t1)]);
			expect(staticData).toEqual(watchingState({ '2': tracked(t2, true) }, t2));
		});

		it('drops an in-flight run that vanished from the listing and advances the cursor', async () => {
			const t1 = START_TIME;
			const t2 = START_TIME + 60_000;
			const { staticData, eventsWith } = createContext({
				staticData: watchingState({ '1': tracked(t1, false) }, t1),
			});

			await expect(eventsWith([runAt(2, t2)])).resolves.toEqual([emitted('runSucceeded', 2)]);
			expect(staticData).toEqual(watchingState({ '2': tracked(t2, true) }, t2));
		});

		it('keeps the listing window above runs it already pruned when the cursor moves back to an in-flight run', async () => {
			const tA = START_TIME - OVERLAP_MS;
			const tB = START_TIME + 60_000;
			const tX = tB - 30_000;
			const { staticData, requestQuery, eventsWith } = createContext({
				events: ALL_EVENTS,
				staticData: watchingState(),
			});

			await eventsWith([runAt(2, tB), runAt(1, tA)]);
			expect(staticData).toEqual(watchingState({ '2': tracked(tB, true) }, tB));

			await expect(eventsWith([runAt(2, tB), runAt(3, tX, runningRun)])).resolves.toEqual([
				emitted('runStarted', 3),
			]);
			expect(staticData).toMatchObject({ cursorMs: tX, floorMs: tB - OVERLAP_MS });

			await expect(eventsWith([runAt(2, tB), runAt(3, tX, runningRun)])).resolves.toEqual([]);
			expect(requestQuery(2)).toMatchObject({ start_time_from: tB - OVERLAP_MS });
		});

		it('keeps the cursor when the poll lists no runs', async () => {
			const { staticData, pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([])).resolves.toBeNull();
			expect(staticData).toEqual(watchingState());
		});

		describe('truncated listing', () => {
			const t1 = START_TIME;
			const t2 = START_TIME + 60_000;
			const stale = tracked(CURSOR - 2 * OVERLAP_MS, false);
			const warning = `job ${JOB_ID} since ${new Date(CURSOR - OVERLAP_MS).toISOString()}`;

			it.each([
				[
					'every fetched run finished',
					[runAt(2, t2), runAt(1, t1)],
					watchingState({ '1': tracked(t1, true), '2': tracked(t2, true) }, t2),
				],
				[
					'a fetched run is still in flight',
					[runAt(2, t2), runAt(1, t1, runningRun)],
					watchingState({ '1': tracked(t1, false), '2': tracked(t2, true) }, t1),
				],
			])(
				'resyncs to the fetched runs, warns once and lists one page on the next poll when %s',
				async (_label, fetched, expected) => {
					const { context, staticData, api, poll, pollWith } = createContext({
						staticData: watchingState({ '9': stale }),
					});
					api.mockResolvedValue({ runs: fetched, next_page_token: 'more' });

					await expect(poll()).resolves.toHaveLength(1);

					expect(api).toHaveBeenCalledTimes(DEFAULT_MAX_PAGES);
					expect(staticData).toEqual(expected);
					expect(context.logger.warn).toHaveBeenCalledTimes(1);
					expect(context.logger.warn).toHaveBeenCalledWith(expect.stringContaining(warning));

					await expect(pollWith(fetched)).resolves.toBeNull();
					expect(api).toHaveBeenCalledTimes(DEFAULT_MAX_PAGES + 1);
					expect(context.logger.warn).toHaveBeenCalledTimes(1);
				},
			);

			it('stops after one page when the poll budget is already spent', async () => {
				const { context, staticData, api, poll } = createContext({
					pollBudgetMs: 0,
					staticData: watchingState({ '9': stale }),
				});
				api.mockResolvedValueOnce({ runs: [runAt(2, t2), runAt(1, t1)], next_page_token: 'more' });
				api.mockResolvedValueOnce({ runs: [runAt(0, t1 - 1000)] });

				const output = await poll();

				expect(output?.[0].map((item) => item.json.run)).toEqual([
					expect.objectContaining({ id: 1 }),
					expect.objectContaining({ id: 2 }),
				]);
				expect(api).toHaveBeenCalledTimes(1);
				expect(staticData).toEqual(
					watchingState({ '1': tracked(t1, true), '2': tracked(t2, true) }, t2),
				);
				expect(context.logger.warn).toHaveBeenCalledTimes(1);
				expect(context.logger.warn).toHaveBeenCalledWith(expect.stringContaining(warning));
			});
		});
	});

	describe('manual mode', () => {
		it('lists one page without a start time and leaves the static data alone', async () => {
			const { context, staticData, api, requestQuery, eventsWith } = createContext({
				mode: 'manual',
				events: ALL_EVENTS,
			});

			await expect(
				eventsWith(
					[runAt(3, START_TIME + 2000, runningRun), runAt(2, START_TIME + 1000), failedRun],
					'ignored',
				),
			).resolves.toEqual([
				emitted('runFailed', RUN_ID),
				emitted('runSucceeded', 2),
				emitted('runStarted', 3),
			]);
			expect(api).toHaveBeenCalledTimes(1);
			expect(requestQuery()).toEqual({ job_id: JOB_ID, limit: JOB_RUNS_MAX_PAGE_SIZE });
			expect(context.getWorkflowStaticData).not.toHaveBeenCalled();
			expect(staticData).toEqual({});
		});

		it.each([
			['runStarted', [emitted('runStarted', 1)]],
			['runFailed', [emitted('runFailed', 2)]],
		])('returns only %s when it is the single subscribed event', async (event, expected) => {
			const { eventsWith } = createContext({ mode: 'manual', events: [event] });

			await expect(eventsWith(mixedPage)).resolves.toEqual(expected);
		});

		it('returns null when the job has no runs', async () => {
			const { pollWith } = createContext({ mode: 'manual' });

			await expect(pollWith([])).resolves.toBeNull();
		});
	});

	describe('errors', () => {
		it('explains a PERMISSION_DENIED error with the Can View hint', async () => {
			const { api, poll } = createContext({ staticData: watchingState() });
			api.mockRejectedValue(
				apiErrorFromBody(403, {
					error_code: 'PERMISSION_DENIED',
					message: 'User does not have Can View permission on job 281874479417551.',
				}),
			);

			const error = await poll().catch((thrown: unknown) => thrown);

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error).toMatchObject({
				message: 'User does not have Can View permission on job 281874479417551.',
				description:
					'Grant Can View on the job to the user or service principal of the credential, then retry.',
			});
		});

		it('rethrows other API errors unchanged', async () => {
			const { api, poll } = createContext({ staticData: watchingState() });
			const apiError = apiErrorFromBody(500, { error_code: 'INTERNAL_ERROR', message: 'boom' });
			api.mockRejectedValue(apiError);

			await expect(poll()).rejects.toBe(apiError);
		});

		it.each([
			['9007199254740991', 9007199254740991],
			['0', 0],
		])('accepts the job ID %s', async (jobId, expected) => {
			const { staticData, api, poll } = createContext({ jobId });

			await expect(poll()).resolves.toBeNull();

			expect(staticData).toEqual(freshState(expected));
			expect(api).not.toHaveBeenCalled();
		});

		it.each([
			['a job ID with letters', 'abc', 'Job ID must be a whole number'],
			['an empty job ID', '', 'Job ID must be a whole number'],
			['a negative job ID', '-1', 'Job ID must be a whole number'],
			['a fractional job ID', '1.5', 'Job ID must be a whole number'],
			['a job ID above the safe range', '9007199254740992', 'Job ID is too large to send exactly'],
		])('rejects %s before any request', async (_label, jobId, message) => {
			const { staticData, api, poll } = createContext({ jobId, staticData: watchingState() });

			const error = await poll().catch((thrown: unknown) => thrown);

			expect(error).toBeInstanceOf(NodeOperationError);
			expect(error).toMatchObject({ message });
			expect(api).not.toHaveBeenCalled();
			expect(staticData).toEqual(watchingState());
		});

		it.each([
			['a string', 'runFailed'],
			['an unknown event', ['runFailed', 'runCancelled']],
		])('rejects %s as the events parameter', async (_label, events) => {
			const { api, poll } = createContext({ events, staticData: watchingState() });

			await expect(poll()).rejects.toThrow(NodeOperationError);
			expect(api).not.toHaveBeenCalled();
		});
	});
});
