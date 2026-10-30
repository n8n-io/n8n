import type {
	IDataObject,
	INode,
	IPollFunctions,
	JsonObject,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { DEFAULT_MAX_PAGES, PIPELINE_EVENTS_MAX_PAGE_SIZE, type PipelineEvent } from '../transport';
import {
	MANUAL_PAGE_SIZE,
	MAX_IN_FLIGHT_UPDATES,
	pollPipelineUpdateEvents,
} from '../trigger/pipelineUpdateEvents';
import { OVERLAP_MS, toIso } from '../trigger/shared';

const HOST = 'https://adb-example.cloud.databricks.com';
const PIPELINE_ID = '8199cd89-e2f5-4169-a6aa-656a24c8886d';
const PIPELINE_NAME = 'n8n-spike-pipeline';
const PIPELINE_URL = `${HOST}/pipelines/${PIPELINE_ID}`;
const UPDATE_ID = '01ee1dae-da54-415a-aba8-0c8b0de503f1';
const FAILED_UPDATE_ID = '4518bfc6-f9d6-4a17-8038-1ad43f74c6da';
const OTHER_UPDATE_ID = '7b2c9f10-3d4e-4f5a-8b6c-0d1e2f3a4b5c';
const RUNNING_AT = '2026-09-01T14:20:31.066Z';
const COMPLETED_AT = '2026-09-01T14:20:35.738Z';
const FAILED_AT = '2026-09-01T14:21:11.671Z';
const RUNNING_MS = Date.parse(RUNNING_AT);
const COMPLETED_MS = Date.parse(COMPLETED_AT);
const FAILED_MS = Date.parse(FAILED_AT);
const CURSOR_MS = RUNNING_MS - 1000;
const FLOOR_MS = CURSOR_MS - OVERLAP_MS;
const NOW = FAILED_MS + 10 * 60 * 1000;
const POLL_BUDGET_MS = 36_000;
const FAILURE_MESSAGE =
	"Update 4518bf has failed. Failed to analyze flow 'workspace.n8n_spike.n8n_spike_table'.";
const TRACEBACK =
	'Traceback (most recent call last):\n  File ".../n8n-spike-dlt-notebook", cell 1, line 7, in n8n_spike_table\n    raise Exception("intentional pipeline failure (n8n spike)") ...';
const ALL_EVENTS = ['updateCompleted', 'updateFailed', 'updateStarted'];
const IN_FLIGHT_STATES = [
	'QUEUED',
	'CREATED',
	'WAITING_FOR_RESOURCES',
	'INITIALIZING',
	'RESETTING',
	'SETTING_UP_TABLES',
	'RUNNING',
	'STOPPING',
];
const LEVELS_FILTER = "level in ('INFO', 'WARN', 'ERROR')";

const node = mock<INode>({ name: 'Databricks Trigger', typeVersion: 1 });

const progressEvent = (
	state: string,
	timestamp: string,
	updateId = UPDATE_ID,
	overrides: Partial<PipelineEvent> = {},
): PipelineEvent => ({
	id: `${updateId}:${state}`,
	event_type: 'update_progress',
	level: 'INFO',
	message: `Update ${updateId.slice(0, 6)} is ${state}.`,
	timestamp,
	origin: { pipeline_id: PIPELINE_ID, pipeline_name: PIPELINE_NAME, update_id: updateId },
	details: { update_progress: { state } },
	...overrides,
});

const runningEvent = progressEvent('RUNNING', RUNNING_AT);
const completedEvent = progressEvent('COMPLETED', COMPLETED_AT);
const failedEvent = progressEvent('FAILED', FAILED_AT, FAILED_UPDATE_ID, {
	level: 'ERROR',
	message: FAILURE_MESSAGE,
	error: {
		fatal: true,
		exceptions: [
			{
				class_name: 'Exception',
				error_class: 'PYTHON.EXCEPTION',
				sql_state: 'P0001',
				message: TRACEBACK,
				stack: [
					{
						declaring_class: 'n8n_spike_table',
						method_name: 'n8n_spike_table',
						file_name: 'n8n-spike-dlt-notebook',
						line_number: 7,
					},
				],
			},
		],
	},
});
const flowEvent = (timestamp: string): PipelineEvent => ({
	id: `flow:${timestamp}`,
	event_type: 'flow_progress',
	level: 'INFO',
	message: "Flow 'n8n_spike_table' is RUNNING.",
	timestamp,
	origin: {
		pipeline_id: PIPELINE_ID,
		pipeline_name: PIPELINE_NAME,
		update_id: UPDATE_ID,
		flow_name: 'n8n_spike_table',
	},
	details: { flow_progress: { status: 'RUNNING' } },
});
const mixedPage = [
	runningEvent,
	progressEvent('RUNNING', toIso(RUNNING_MS + 500), FAILED_UPDATE_ID),
	completedEvent,
	failedEvent,
];

const simplifiedItem = (event: string, body: IDataObject, updateId = UPDATE_ID) => ({
	json: {
		event,
		pipeline: { id: PIPELINE_ID, name: PIPELINE_NAME, url: PIPELINE_URL },
		update: { id: updateId, url: `${PIPELINE_URL}/updates/${updateId}` },
		...body,
	},
});
const startedItem = simplifiedItem('updateStarted', {
	timing: { startedAt: RUNNING_AT, runningAt: RUNNING_AT },
});
const completedResult = { state: 'COMPLETED', message: 'Update 01ee1d is COMPLETED.' };
const completedItem = simplifiedItem('updateCompleted', {
	result: completedResult,
	timing: {
		startedAt: RUNNING_AT,
		runningAt: RUNNING_AT,
		endedAt: COMPLETED_AT,
		durationMs: COMPLETED_MS - RUNNING_MS,
	},
});
const failedResult = {
	state: 'FAILED',
	message: FAILURE_MESSAGE,
	errors: [
		{
			type: 'Exception',
			code: 'PYTHON.EXCEPTION',
			sqlState: 'P0001',
			message: TRACEBACK,
			stack: [
				{
					class: 'n8n_spike_table',
					method: 'n8n_spike_table',
					file: 'n8n-spike-dlt-notebook',
					line: 7,
				},
			],
		},
	],
};
const failedItem = simplifiedItem(
	'updateFailed',
	{ result: failedResult, timing: { endedAt: FAILED_AT } },
	FAILED_UPDATE_ID,
);

const emitted = (event: string, updateId = UPDATE_ID) => ({
	event,
	update: expect.objectContaining({ id: updateId }),
});

const tracked = (startedMs?: number, endedMs?: number, runningMs?: number) => ({
	startedMs,
	runningMs,
	endedMs,
});
const running = (startedMs: number, endedMs?: number) => tracked(startedMs, endedMs, startedMs);

const watchingState = (updates: IDataObject = {}, cursorMs = CURSOR_MS): IDataObject => ({
	pipelineId: PIPELINE_ID,
	cursorMs,
	floorMs: cursorMs - OVERLAP_MS,
	updates,
});

const freshState = (pipelineId = PIPELINE_ID): IDataObject => ({
	pipelineId,
	cursorMs: NOW,
	floorMs: NOW,
	updates: {},
});

const apiErrorFromBody = (status: number, data: JsonObject) =>
	new NodeApiError(node, {
		message: `Request failed with status code ${status}`,
		response: { status, data },
	});

type ContextOptions = {
	events?: NodeParameterValueType;
	simplify?: boolean;
	pipelineId?: string;
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
				return options.events ?? ['updateCompleted', 'updateFailed'];
			case 'simplify':
				return options.simplify ?? true;
			case 'pipelineId':
				return options.pipelineId ?? PIPELINE_ID;
			default:
				return fallback;
		}
	});
	const api = context.helpers.httpRequestWithAuthentication;
	const requestQuery = (call = 0) => api.mock.calls[call][1].qs;
	const poll = async () => await pollPipelineUpdateEvents.call(context);
	const pollWith = async (events: unknown[], nextPageToken?: string) => {
		api.mockResolvedValueOnce({ events, next_page_token: nextPageToken });
		return await poll();
	};
	const eventsWith = async (events: unknown[], nextPageToken?: string) =>
		((await pollWith(events, nextPageToken)) ?? [[]])[0].map((item) => ({
			event: item.json.event,
			update: item.json.update,
		}));
	return { context, staticData, api, requestQuery, poll, pollWith, eventsWith };
};

describe('pollPipelineUpdateEvents', () => {
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
			[
				'state of another pipeline',
				{ ...watchingState({ [OTHER_UPDATE_ID]: tracked(5) }, 5), pipelineId: FAILED_UPDATE_ID },
			],
			[
				'state of another pipeline with a leftover key',
				{ ...watchingState(), pipelineId: FAILED_UPDATE_ID, seen: 3 },
			],
			[
				'state with a broken shape',
				{ pipelineId: PIPELINE_ID, cursorMs: 'yesterday', updates: [] },
			],
			['state without a floor', { pipelineId: PIPELINE_ID, cursorMs: CURSOR_MS, updates: {} }],
			['state with a broken update entry', watchingState({ [UPDATE_ID]: { startedMs: 'soon' } })],
		])('resets %s in place', async (_label, stale) => {
			const staticData: IDataObject = { ...stale };
			const { api, poll } = createContext({ staticData });

			await expect(poll()).resolves.toBeNull();

			expect(staticData).toEqual(freshState());
			expect(api).not.toHaveBeenCalled();
		});

		it('stores the pipeline ID in lower case', async () => {
			const { staticData, poll } = createContext({ pipelineId: PIPELINE_ID.toUpperCase() });

			await expect(poll()).resolves.toBeNull();

			expect(staticData).toEqual(freshState());
		});

		it('does not emit an event from before the activation time', async () => {
			const { staticData, requestQuery, poll, pollWith } = createContext({ events: ALL_EVENTS });

			await expect(poll()).resolves.toBeNull();
			await expect(pollWith([progressEvent('RUNNING', toIso(NOW - 1000))])).resolves.toBeNull();

			expect(requestQuery()).toMatchObject({
				filter: `${LEVELS_FILTER} AND timestamp > '${toIso(NOW)}'`,
			});
			expect(staticData).toEqual(freshState());
		});

		it('keeps an event whose sub-millisecond timestamp falls right after the floor', async () => {
			const justAfterNow = toIso(NOW).replace('Z', '4Z');
			const { staticData, eventsWith, poll } = createContext({ events: ALL_EVENTS });

			await expect(poll()).resolves.toBeNull();
			await expect(eventsWith([progressEvent('RUNNING', justAfterNow)])).resolves.toEqual([
				emitted('updateStarted'),
			]);
			expect(staticData).toEqual({ ...freshState(), updates: { [UPDATE_ID]: running(NOW) } });
		});
	});

	describe('classification', () => {
		it('classifies a completed update whose start it did not see', async () => {
			const { staticData, pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([completedEvent])).resolves.toEqual([
				[
					simplifiedItem('updateCompleted', {
						result: completedResult,
						timing: { endedAt: COMPLETED_AT },
					}),
				],
			]);
			expect(staticData).toEqual(
				watchingState({ [UPDATE_ID]: tracked(undefined, COMPLETED_MS) }, COMPLETED_MS),
			);
		});

		it('classifies a failed update with its message and traceback', async () => {
			const { staticData, pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([failedEvent])).resolves.toEqual([[failedItem]]);
			expect(staticData).toEqual(
				watchingState({ [FAILED_UPDATE_ID]: tracked(undefined, FAILED_MS) }, FAILED_MS),
			);
		});

		it('classifies a cancelled update as failed', async () => {
			const { pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([progressEvent('CANCELED', FAILED_AT)])).resolves.toEqual([
				[
					simplifiedItem('updateFailed', {
						result: { state: 'CANCELED', message: 'Update 01ee1d is CANCELED.' },
						timing: { endedAt: FAILED_AT },
					}),
				],
			]);
		});

		it.each([...IN_FLIGHT_STATES, 'SOME_FUTURE_STATE'])(
			'treats %s as a started update',
			async (state) => {
				const runningMs = state === 'RUNNING' ? RUNNING_MS : undefined;
				const { staticData, pollWith } = createContext({
					events: ALL_EVENTS,
					staticData: watchingState(),
				});

				await expect(pollWith([progressEvent(state, RUNNING_AT)])).resolves.toEqual([
					[
						simplifiedItem('updateStarted', {
							timing: {
								startedAt: RUNNING_AT,
								runningAt: runningMs === undefined ? undefined : RUNNING_AT,
							},
						}),
					],
				]);
				expect(staticData).toEqual(
					watchingState({ [UPDATE_ID]: tracked(RUNNING_MS, undefined, runningMs) }, RUNNING_MS),
				);
			},
		);

		it.each<[string, PipelineEvent['error'], IDataObject]>([
			[
				'no exceptions',
				{ fatal: true, exceptions: [] },
				{ state: 'FAILED', message: FAILURE_MESSAGE },
			],
			['no error block', undefined, { state: 'FAILED', message: FAILURE_MESSAGE }],
			[
				'an exception with only a message',
				{ exceptions: [{ message: 'boom' }] },
				{ state: 'FAILED', message: FAILURE_MESSAGE, errors: [{ message: 'boom' }] },
			],
			[
				'a frame with only a line number',
				{ exceptions: [{ message: 'boom', stack: [{ line_number: 3 }] }] },
				{
					state: 'FAILED',
					message: FAILURE_MESSAGE,
					errors: [{ message: 'boom', stack: [{ line: 3 }] }],
				},
			],
			[
				'an empty stack',
				{ exceptions: [{ message: 'boom', stack: [] }] },
				{ state: 'FAILED', message: FAILURE_MESSAGE, errors: [{ message: 'boom' }] },
			],
		])('simplifies the result of a failure with %s', async (_label, error, result) => {
			const { pollWith } = createContext({ staticData: watchingState() });
			const event = progressEvent('FAILED', FAILED_AT, FAILED_UPDATE_ID, {
				level: 'ERROR',
				message: FAILURE_MESSAGE,
				error,
			});

			await expect(pollWith([event])).resolves.toEqual([
				[
					simplifiedItem(
						'updateFailed',
						{ result, timing: { endedAt: FAILED_AT } },
						FAILED_UPDATE_ID,
					),
				],
			]);
		});

		it('omits the pipeline name when the event has none', async () => {
			const { pollWith } = createContext({ staticData: watchingState() });
			const event = progressEvent('COMPLETED', COMPLETED_AT, UPDATE_ID, {
				origin: { pipeline_id: PIPELINE_ID, update_id: UPDATE_ID },
			});

			const output = await pollWith([event]);

			expect(output?.[0][0].json.pipeline).toEqual({ id: PIPELINE_ID, url: PIPELINE_URL });
		});

		it('returns the raw event behind the event label when simplify is off', async () => {
			const { pollWith } = createContext({ simplify: false, staticData: watchingState() });

			await expect(pollWith([failedEvent])).resolves.toEqual([
				[{ json: { event: 'updateFailed', ...failedEvent } }],
			]);
		});

		it('skips events that are not update progress and still advances the cursor', async () => {
			const { staticData, pollWith } = createContext({
				events: ALL_EVENTS,
				staticData: watchingState(),
			});

			await expect(
				pollWith([
					flowEvent(RUNNING_AT),
					{ ...runningEvent, origin: { pipeline_id: PIPELINE_ID } },
					{ ...runningEvent, origin: { ...runningEvent.origin, update_id: '__proto__' } },
					{ ...runningEvent, origin: { ...runningEvent.origin, update_id: 'update-1' } },
					{ ...runningEvent, details: {} },
					{ ...runningEvent, details: { update_progress: { state: 7 } } },
					{ ...runningEvent, timestamp: undefined },
					{ ...runningEvent, timestamp: 'yesterday' },
				]),
			).resolves.toBeNull();

			expect(staticData).toEqual(watchingState({}, RUNNING_MS));
			expect(Object.prototype).not.toHaveProperty('startedMs');
		});

		it('rejects a page with a null entry in the events and keeps the state', async () => {
			const { staticData, api, poll } = createContext({ staticData: watchingState() });
			api.mockResolvedValueOnce({ events: [null, runningEvent] });

			await expect(poll()).rejects.toThrow(
				'Databricks did not return a JSON list of pipeline events',
			);
			expect(staticData).toEqual(watchingState());
		});
	});

	describe('update lifecycle across polls', () => {
		it('tracks a started update without emitting when updateStarted is not subscribed', async () => {
			const { staticData, pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([runningEvent])).resolves.toBeNull();
			expect(staticData).toEqual(watchingState({ [UPDATE_ID]: running(RUNNING_MS) }, RUNNING_MS));
		});

		it('emits the start, then the completion with its duration, then nothing on a repeat', async () => {
			const { staticData, pollWith, eventsWith } = createContext({
				events: ALL_EVENTS,
				staticData: watchingState(),
			});

			await expect(eventsWith([runningEvent])).resolves.toEqual([emitted('updateStarted')]);

			await expect(pollWith([completedEvent])).resolves.toEqual([[completedItem]]);
			expect(staticData).toEqual(
				watchingState({ [UPDATE_ID]: running(RUNNING_MS, COMPLETED_MS) }, COMPLETED_MS),
			);

			await expect(pollWith([runningEvent, completedEvent])).resolves.toBeNull();
		});

		it('emits the start and the end of an update that ran between polls', async () => {
			const { pollWith } = createContext({ events: ALL_EVENTS, staticData: watchingState() });

			await expect(pollWith([runningEvent, completedEvent])).resolves.toEqual([
				[startedItem, completedItem],
			]);
		});

		it('orders the events by timestamp when the API returns them out of order', async () => {
			const { eventsWith } = createContext({ events: ALL_EVENTS, staticData: watchingState() });

			await expect(eventsWith([completedEvent, runningEvent])).resolves.toEqual([
				emitted('updateStarted'),
				emitted('updateCompleted'),
			]);
		});

		it('ignores a late start event of an update already reported as finished', async () => {
			const { staticData, eventsWith } = createContext({
				events: ALL_EVENTS,
				staticData: watchingState(),
			});

			await expect(eventsWith([completedEvent])).resolves.toEqual([emitted('updateCompleted')]);
			await expect(eventsWith([runningEvent])).resolves.toEqual([]);
			expect(staticData).toEqual(
				watchingState({ [UPDATE_ID]: tracked(undefined, COMPLETED_MS) }, COMPLETED_MS),
			);
		});

		it('emits the start once, at the first in-flight event of an update', async () => {
			const queuedAt = toIso(RUNNING_MS - 30_000);
			const { staticData, pollWith } = createContext({
				events: ALL_EVENTS,
				staticData: watchingState(),
			});

			await expect(
				pollWith([progressEvent('WAITING_FOR_RESOURCES', queuedAt), runningEvent]),
			).resolves.toEqual([[simplifiedItem('updateStarted', { timing: { startedAt: queuedAt } })]]);
			expect(staticData).toEqual(
				watchingState(
					{ [UPDATE_ID]: tracked(RUNNING_MS - 30_000, undefined, RUNNING_MS) },
					RUNNING_MS,
				),
			);
		});

		it('measures the duration from the RUNNING event and keeps the earlier start', async () => {
			const queuedAt = toIso(RUNNING_MS - 30_000);
			const { pollWith } = createContext({ staticData: watchingState() });

			await expect(
				pollWith([progressEvent('WAITING_FOR_RESOURCES', queuedAt), runningEvent]),
			).resolves.toBeNull();
			await expect(pollWith([completedEvent])).resolves.toEqual([
				[
					simplifiedItem('updateCompleted', {
						result: completedResult,
						timing: {
							startedAt: queuedAt,
							runningAt: RUNNING_AT,
							endedAt: COMPLETED_AT,
							durationMs: COMPLETED_MS - RUNNING_MS,
						},
					}),
				],
			]);
		});

		it('reports no duration when it never saw the RUNNING event', async () => {
			const queuedMs = RUNNING_MS - 30_000;
			const { pollWith } = createContext({
				staticData: watchingState({ [UPDATE_ID]: tracked(queuedMs) }),
			});

			await expect(pollWith([completedEvent])).resolves.toEqual([
				[
					simplifiedItem('updateCompleted', {
						result: completedResult,
						timing: { startedAt: toIso(queuedMs), endedAt: COMPLETED_AT },
					}),
				],
			]);
		});

		it('follows two interleaved updates in time order', async () => {
			const { eventsWith } = createContext({ events: ALL_EVENTS, staticData: watchingState() });

			await expect(eventsWith(mixedPage)).resolves.toEqual([
				emitted('updateStarted'),
				emitted('updateStarted', FAILED_UPDATE_ID),
				emitted('updateCompleted'),
				emitted('updateFailed', FAILED_UPDATE_ID),
			]);
		});

		it.each([
			['updateStarted', [emitted('updateStarted'), emitted('updateStarted', FAILED_UPDATE_ID)]],
			['updateCompleted', [emitted('updateCompleted')]],
			['updateFailed', [emitted('updateFailed', FAILED_UPDATE_ID)]],
		])('emits only %s when it is the single subscribed event', async (event, expected) => {
			const { eventsWith } = createContext({ events: [event], staticData: watchingState() });

			await expect(eventsWith(mixedPage)).resolves.toEqual(expected);
		});
	});

	describe('cursor', () => {
		it('lists the events after the floor at the INFO, WARN and ERROR levels', async () => {
			const { context, api, requestQuery, pollWith } = createContext({
				staticData: watchingState(),
			});

			await pollWith([completedEvent]);

			expect(context.getNodeParameter).toHaveBeenCalledWith('pipelineId', '', {
				extractValue: true,
			});
			expect(api).toHaveBeenCalledTimes(1);
			expect(requestQuery()).toEqual({
				max_results: PIPELINE_EVENTS_MAX_PAGE_SIZE,
				filter: `${LEVELS_FILTER} AND timestamp > '${toIso(FLOOR_MS)}'`,
				order_by: 'timestamp asc',
			});
		});

		it('advances the cursor to the newest fetched event, including events it does not report', async () => {
			const laterMs = COMPLETED_MS + 60_000;
			const { staticData, pollWith } = createContext({
				events: ALL_EVENTS,
				staticData: watchingState(),
			});

			await expect(pollWith([runningEvent, flowEvent(toIso(laterMs))])).resolves.toHaveLength(1);

			expect(staticData).toEqual(watchingState({ [UPDATE_ID]: running(RUNNING_MS) }, laterMs));
		});

		it('keeps the cursor when the poll lists no events', async () => {
			const { staticData, pollWith } = createContext({ staticData: watchingState() });

			await expect(pollWith([])).resolves.toBeNull();
			expect(staticData).toEqual(watchingState());
		});

		it('drops finished updates the window can no longer list and keeps unfinished ones', async () => {
			const t = CURSOR_MS + OVERLAP_MS + 60_000;
			const oldStart = CURSOR_MS - 10 * OVERLAP_MS;
			const { staticData, pollWith } = createContext({
				staticData: watchingState({
					[FAILED_UPDATE_ID]: tracked(CURSOR_MS - 5000, CURSOR_MS),
					[OTHER_UPDATE_ID]: tracked(oldStart),
				}),
			});

			await expect(pollWith([progressEvent('RUNNING', toIso(t))])).resolves.toBeNull();

			expect(staticData).toEqual(
				watchingState({ [OTHER_UPDATE_ID]: tracked(oldStart), [UPDATE_ID]: running(t) }, t),
			);
		});

		it('keeps a finished update whose end is still inside the window', async () => {
			const { staticData, pollWith } = createContext({
				staticData: watchingState({ [FAILED_UPDATE_ID]: tracked(undefined, CURSOR_MS) }),
			});

			await expect(pollWith([runningEvent])).resolves.toBeNull();

			expect(staticData).toEqual(
				watchingState(
					{ [FAILED_UPDATE_ID]: tracked(undefined, CURSOR_MS), [UPDATE_ID]: running(RUNNING_MS) },
					RUNNING_MS,
				),
			);
		});

		it('caps the tracked unfinished updates and drops the oldest first', async () => {
			const updates = Object.fromEntries(
				Array.from({ length: MAX_IN_FLIGHT_UPDATES }, (_, index) => [
					`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
					tracked(CURSOR_MS - MAX_IN_FLIGHT_UPDATES + index),
				]),
			);
			const kept = Object.fromEntries(Object.entries(updates).slice(1));
			const { staticData, pollWith } = createContext({ staticData: watchingState(updates) });

			await expect(pollWith([runningEvent])).resolves.toBeNull();

			expect(staticData).toEqual(
				watchingState({ ...kept, [UPDATE_ID]: running(RUNNING_MS) }, RUNNING_MS),
			);
		});

		describe('truncated listing', () => {
			it('reports what it fetched, continues from there on the next poll and logs it once', async () => {
				const { context, staticData, api, requestQuery, poll, pollWith } = createContext({
					events: ALL_EVENTS,
					staticData: watchingState(),
				});
				api.mockResolvedValue({ events: [runningEvent], next_page_token: 'more' });

				await expect(poll()).resolves.toEqual([[startedItem]]);

				expect(api).toHaveBeenCalledTimes(DEFAULT_MAX_PAGES);
				expect(staticData).toEqual(watchingState({ [UPDATE_ID]: running(RUNNING_MS) }, RUNNING_MS));
				expect(context.logger.info).toHaveBeenCalledTimes(1);
				expect(context.logger.info).toHaveBeenCalledWith(
					expect.stringContaining(`pipeline ${PIPELINE_ID} since ${toIso(FLOOR_MS)}`),
				);
				expect(context.logger.info).toHaveBeenCalledWith(
					expect.stringContaining(`continues from ${RUNNING_AT}`),
				);
				expect(context.logger.warn).not.toHaveBeenCalled();

				await expect(pollWith([completedEvent])).resolves.toEqual([[completedItem]]);
				expect(requestQuery(DEFAULT_MAX_PAGES)).toMatchObject({
					filter: `${LEVELS_FILTER} AND timestamp > '${toIso(RUNNING_MS - OVERLAP_MS)}'`,
				});
				expect(api).toHaveBeenCalledTimes(DEFAULT_MAX_PAGES + 1);
				expect(context.logger.info).toHaveBeenCalledTimes(1);
			});

			it('stops after one page when the poll budget is already spent', async () => {
				const { context, staticData, api, poll } = createContext({
					events: ALL_EVENTS,
					pollBudgetMs: 0,
					staticData: watchingState(),
				});
				api.mockResolvedValueOnce({ events: [runningEvent], next_page_token: 'more' });

				await expect(poll()).resolves.toEqual([[startedItem]]);

				expect(api).toHaveBeenCalledTimes(1);
				expect(staticData).toEqual(watchingState({ [UPDATE_ID]: running(RUNNING_MS) }, RUNNING_MS));
				expect(context.logger.info).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('manual mode', () => {
		it('lists the latest page, reports it in time order and leaves the static data alone', async () => {
			const { context, staticData, api, requestQuery, eventsWith } = createContext({
				mode: 'manual',
				events: ALL_EVENTS,
			});

			await expect(
				eventsWith([failedEvent, completedEvent, runningEvent], 'ignored'),
			).resolves.toEqual([
				emitted('updateStarted'),
				emitted('updateCompleted'),
				emitted('updateFailed', FAILED_UPDATE_ID),
			]);

			expect(api).toHaveBeenCalledTimes(1);
			expect(requestQuery()).toEqual({
				max_results: MANUAL_PAGE_SIZE,
				filter: LEVELS_FILTER,
				order_by: 'timestamp desc',
			});
			expect(context.getWorkflowStaticData).not.toHaveBeenCalled();
			expect(staticData).toEqual({});
		});

		it('computes the duration when the page holds both ends of an update', async () => {
			const { pollWith } = createContext({ mode: 'manual', events: ['updateCompleted'] });

			await expect(pollWith([completedEvent, runningEvent])).resolves.toEqual([[completedItem]]);
		});

		it('returns null when the page has no update events', async () => {
			const { pollWith } = createContext({ mode: 'manual' });

			await expect(pollWith([flowEvent(RUNNING_AT)])).resolves.toBeNull();
		});
	});

	describe('errors', () => {
		it('explains a PERMISSION_DENIED error with the Can View hint', async () => {
			const { api, poll } = createContext({ staticData: watchingState() });
			api.mockRejectedValue(
				apiErrorFromBody(403, {
					error_code: 'PERMISSION_DENIED',
					message: `User does not have Can View permission on pipeline ${PIPELINE_ID}.`,
				}),
			);

			const error = await poll().catch((thrown: unknown) => thrown);

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error).toMatchObject({
				message: `User does not have Can View permission on pipeline ${PIPELINE_ID}.`,
				description:
					'Grant Can View on the pipeline to the user or service principal of the credential, then retry.',
			});
		});

		it('rethrows other API errors unchanged', async () => {
			const { api, poll } = createContext({ staticData: watchingState() });
			const apiError = apiErrorFromBody(500, { error_code: 'INTERNAL_ERROR', message: 'boom' });
			api.mockRejectedValue(apiError);

			await expect(poll()).rejects.toBe(apiError);
		});

		it.each([
			['an empty pipeline ID', ''],
			['a pipeline ID without dashes', '8199cd89e2f54169a6aa656a24c8886d'],
			['a path', '../updates'],
			['a job ID', '281874479417551'],
		])('rejects %s before any request', async (_label, pipelineId) => {
			const { staticData, api, poll } = createContext({
				pipelineId,
				staticData: watchingState(),
			});

			const error = await poll().catch((thrown: unknown) => thrown);

			expect(error).toBeInstanceOf(NodeOperationError);
			expect(error).toMatchObject({ message: 'Pipeline ID must be a UUID' });
			expect(api).not.toHaveBeenCalled();
			expect(staticData).toEqual(watchingState());
		});

		it.each([
			['a string', 'updateFailed'],
			['an unknown event', ['updateFailed', 'updateCancelled']],
		])('rejects %s as the events parameter', async (_label, events) => {
			const { api, poll } = createContext({ events, staticData: watchingState() });

			await expect(poll()).rejects.toThrow('Events must be a list of update events');
			expect(api).not.toHaveBeenCalled();
		});
	});
});
