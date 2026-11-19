import { isRecord } from '@n8n/utils/is-record';
import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, INodeExecutionData, IPollFunctions } from 'n8n-workflow';

import { getActiveCredentialType } from '../actions/helpers';
import type { DatabricksJobRun } from '../actions/interfaces';
import { JOB_RUNS_MAX_PAGE_SIZE, listAllJobRuns, listJobRuns } from '../transport';
import {
	OVERLAP_MS,
	readEvents,
	toIso,
	toOutput,
	withLegibleErrors,
	withoutUndefined,
} from './shared';

const JOB_RUN_EVENTS = ['runFailed', 'runStarted', 'runSucceeded'] as const;
const PERMISSION_HINT =
	'Grant Can View on the job to the user or service principal of the credential, then retry.';

type JobRunEvent = (typeof JOB_RUN_EVENTS)[number];

const TERMINAL_STATUS_STATE = 'TERMINATED';

const TERMINAL_LEGACY_LIFECYCLE_STATES = new Set(['TERMINATED', 'SKIPPED', 'INTERNAL_ERROR']);

type ListedRun = DatabricksJobRun & { run_id: number; start_time: number };

type JobParameter = NonNullable<DatabricksJobRun['job_parameters']>[number];

type TrackedRun = { startMs: number; terminal: boolean };

type JobRunWatchState = {
	jobId: number;
	cursorMs: number;
	floorMs: number;
	runs: Record<string, TrackedRun>;
};

function isListedRun(run: unknown): run is ListedRun {
	return (
		isRecord(run) &&
		typeof run.run_id === 'number' &&
		typeof run.start_time === 'number' &&
		run.start_time > 0
	);
}

function isTrackedRun(value: unknown): value is TrackedRun {
	return (
		isRecord(value) && typeof value.startMs === 'number' && typeof value.terminal === 'boolean'
	);
}

function isJobRunWatchState(value: unknown): value is JobRunWatchState {
	return (
		isRecord(value) &&
		typeof value.jobId === 'number' &&
		typeof value.cursorMs === 'number' &&
		typeof value.floorMs === 'number' &&
		isRecord(value.runs) &&
		Object.values(value.runs).every(isTrackedRun)
	);
}

function readJobId(context: IPollFunctions): number {
	const jobId = String(context.getNodeParameter('jobId', '', { extractValue: true }));
	if (!/^[0-9]+$/.test(jobId)) {
		throw new NodeOperationError(context.getNode(), 'Job ID must be a whole number', {
			description: 'Use the numeric ID shown in the job URL in Databricks.',
		});
	}
	if (!Number.isSafeInteger(Number(jobId))) {
		throw new NodeOperationError(context.getNode(), 'Job ID is too large to send exactly', {
			description:
				'IDs above 9007199254740991 lose precision in JavaScript, so the node cannot watch this job.',
		});
	}
	return Number(jobId);
}

function getLifecycleState(run: DatabricksJobRun): string | undefined {
	return run.status?.state ?? run.state?.life_cycle_state;
}

function isTerminal(run: DatabricksJobRun): boolean {
	const status = run.status?.state;
	if (status !== undefined) return status === TERMINAL_STATUS_STATE;
	const lifecycle = run.state?.life_cycle_state;
	return lifecycle !== undefined && TERMINAL_LEGACY_LIFECYCLE_STATES.has(lifecycle);
}

function getOutcomeCode(run: DatabricksJobRun): string | undefined {
	const details = run.status?.termination_details;
	return details
		? (details.code ?? details.type ?? 'UNKNOWN')
		: (run.state?.result_state ?? getLifecycleState(run));
}

function terminalEventOf(run: DatabricksJobRun): JobRunEvent {
	return getOutcomeCode(run) === 'SUCCESS' ? 'runSucceeded' : 'runFailed';
}

function toChronological(runs: DatabricksJobRun[]): ListedRun[] {
	return runs
		.filter(isListedRun)
		.sort((a, b) =>
			a.start_time === b.start_time ? a.run_id - b.run_id : a.start_time - b.start_time,
		);
}

function toParameterEntries(parameter: JobParameter): Array<[string, string | undefined]> {
	return parameter.name ? [[parameter.name, parameter.value ?? parameter.default]] : [];
}

function readJobParameters(run: DatabricksJobRun): Record<string, string | undefined> {
	return Object.fromEntries((run.job_parameters ?? []).flatMap(toParameterEntries));
}

function getDurationMs(run: ListedRun, endMs: number | undefined): number | undefined {
	if (run.run_duration !== undefined) return run.run_duration;
	return endMs === undefined ? undefined : endMs - run.start_time;
}

function simplifyResult(run: ListedRun): IDataObject {
	const details = run.status?.termination_details;
	return withoutUndefined({
		state: getLifecycleState(run),
		code: getOutcomeCode(run),
		type: details?.type,
		message: details ? details.message : run.state?.state_message,
	});
}

function simplifyTiming(run: ListedRun): IDataObject {
	const endMs = run.end_time !== undefined && run.end_time > 0 ? run.end_time : undefined;
	return withoutUndefined({
		startedAt: toIso(run.start_time),
		endedAt: endMs === undefined ? undefined : toIso(endMs),
		durationMs: getDurationMs(run, endMs),
		queuedMs: run.queue_duration,
	});
}

function simplifyRun(event: JobRunEvent, run: ListedRun): IDataObject {
	return {
		event,
		job: withoutUndefined({ id: run.job_id }),
		run: withoutUndefined({
			id: run.run_id,
			name: run.run_name,
			url: run.run_page_url,
			trigger: run.trigger,
			creator: run.creator_user_name,
			parameters: readJobParameters(run),
		}),
		...(event !== 'runStarted' && { result: simplifyResult(run) }),
		timing: simplifyTiming(run),
	};
}

function toItem(event: JobRunEvent, run: ListedRun, simplify: boolean): INodeExecutionData {
	return { json: simplify ? simplifyRun(event, run) : { event, ...run } };
}

function collectManualItems(
	runs: ListedRun[],
	subscribed: JobRunEvent[],
	simplify: boolean,
): INodeExecutionData[] {
	return runs.flatMap((run) => {
		const event = isTerminal(run) ? terminalEventOf(run) : 'runStarted';
		return subscribed.includes(event) ? [toItem(event, run, simplify)] : [];
	});
}

function collectNewEvents(state: JobRunWatchState, run: ListedRun): JobRunEvent[] {
	const key = String(run.run_id);
	const events: JobRunEvent[] = [];
	if (state.runs[key] === undefined) {
		events.push('runStarted');
		state.runs[key] = { startMs: run.start_time, terminal: false };
	}
	const entry = state.runs[key];
	if (!entry.terminal && isTerminal(run)) {
		entry.terminal = true;
		events.push(terminalEventOf(run));
	}
	return events;
}

function startWatching(staticData: IDataObject, jobId: number): void {
	for (const key of Object.keys(staticData)) delete staticData[key];
	const now = Date.now();
	staticData.jobId = jobId;
	staticData.cursorMs = now;
	staticData.floorMs = now;
	staticData.runs = {};
}

function raiseFloor(state: JobRunWatchState): void {
	state.floorMs = Math.max(state.floorMs, state.cursorMs - OVERLAP_MS);
}

function advanceCursor(state: JobRunWatchState, listedRunIds: Set<string>): void {
	for (const [key, entry] of Object.entries(state.runs)) {
		if (!entry.terminal && !listedRunIds.has(key)) delete state.runs[key];
	}
	const entries = Object.values(state.runs);
	const newestStartMs = entries.reduce(
		(max, entry) => Math.max(max, entry.startMs),
		state.cursorMs,
	);
	const oldestInFlightMs = entries
		.filter((entry) => !entry.terminal)
		.reduce((min, entry) => Math.min(min, entry.startMs), Number.POSITIVE_INFINITY);
	state.cursorMs = Math.min(newestStartMs, oldestInFlightMs);
	raiseFloor(state);
	for (const [key, entry] of Object.entries(state.runs)) {
		if (entry.terminal && entry.startMs < state.floorMs) delete state.runs[key];
	}
}

export async function pollJobRunEvents(
	this: IPollFunctions,
): Promise<INodeExecutionData[][] | null> {
	const subscribed = readEvents(this, JOB_RUN_EVENTS, 'run');
	const simplify = this.getNodeParameter('simplify', true) === true;
	const jobId = readJobId(this);
	const credentialType = getActiveCredentialType(this);

	if (this.getMode() === 'manual') {
		const page = await withLegibleErrors(
			async () =>
				await listJobRuns(this, credentialType, { jobId, pageSize: JOB_RUNS_MAX_PAGE_SIZE }),
			PERMISSION_HINT,
		);
		return toOutput(collectManualItems(toChronological(page.items), subscribed, simplify));
	}

	const staticData = this.getWorkflowStaticData('node');
	if (!isJobRunWatchState(staticData) || staticData.jobId !== jobId) {
		startWatching(staticData, jobId);
		return null;
	}

	const deadlineEpochMs = Date.now() + this.getPollBudgetMs();
	const startTimeFromMs = staticData.floorMs;
	const page = await withLegibleErrors(
		async () =>
			await listAllJobRuns(
				this,
				credentialType,
				{ jobId, startTimeFromMs, pageSize: JOB_RUNS_MAX_PAGE_SIZE },
				{ deadlineEpochMs },
			),
		PERMISSION_HINT,
	);
	const runs = toChronological(page.items).filter((run) => run.start_time >= startTimeFromMs);
	const items = runs.flatMap((run) =>
		collectNewEvents(staticData, run)
			.filter((event) => subscribed.includes(event))
			.map((event) => toItem(event, run, simplify)),
	);

	advanceCursor(staticData, new Set(runs.map((run) => String(run.run_id))));
	if (page.nextPageToken !== undefined) {
		this.logger.warn(
			`Databricks Trigger could not list every run of job ${jobId} since ${toIso(startTimeFromMs)} in one poll. It reported the ${runs.length} most recent runs and skipped older runs in that window.`,
		);
	}

	return toOutput(items);
}
