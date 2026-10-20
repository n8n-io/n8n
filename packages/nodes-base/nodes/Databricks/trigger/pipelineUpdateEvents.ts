import { isRecord } from '@n8n/utils/is-record';
import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, INodeExecutionData, IPollFunctions } from 'n8n-workflow';

import { getActiveCredentialType, getHost } from '../actions/helpers';
import {
	listAllPipelineEvents,
	listPipelineEvents,
	PIPELINE_EVENTS_MAX_PAGE_SIZE,
	UUID_PATTERN,
	type PipelineEvent,
	type PipelineEventLevel,
} from '../transport';
import {
	OVERLAP_MS,
	readEvents,
	toIso,
	toOutput,
	withLegibleErrors,
	withoutUndefined,
} from './shared';

export const PIPELINE_UPDATE_EVENTS = ['updateCompleted', 'updateFailed', 'updateStarted'] as const;
export const MANUAL_PAGE_SIZE = 100;
export const MAX_IN_FLIGHT_UPDATES = 100;

const WATCHED_LEVELS: readonly PipelineEventLevel[] = ['INFO', 'WARN', 'ERROR'];
const PERMISSION_HINT =
	'Grant Can View on the pipeline to the user or service principal of the credential, then retry.';

type PipelineUpdateEvent = (typeof PIPELINE_UPDATE_EVENTS)[number];

type PipelineException = NonNullable<NonNullable<PipelineEvent['error']>['exceptions']>[number];

type StackFrame = NonNullable<PipelineException['stack']>[number];

type UpdateProgress = { raw: PipelineEvent; updateId: string; state: string; timestampMs: number };

type TrackedUpdate = { startedMs?: number; runningMs?: number; endedMs?: number };

type TrackedUpdates = Record<string, TrackedUpdate>;

type PipelineUpdateWatchState = {
	pipelineId: string;
	cursorMs: number;
	floorMs: number;
	updates: TrackedUpdates;
};

type ItemOptions = {
	subscribed: PipelineUpdateEvent[];
	simplify: boolean;
	pipelineId: string;
	host: string;
};

function isUuid(value: unknown): value is string {
	return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isOptionalNumber(value: unknown): value is number | undefined {
	return value === undefined || typeof value === 'number';
}

function isTrackedUpdate(value: unknown): value is TrackedUpdate {
	return (
		isRecord(value) &&
		isOptionalNumber(value.startedMs) &&
		isOptionalNumber(value.runningMs) &&
		isOptionalNumber(value.endedMs)
	);
}

function isPipelineUpdateWatchState(value: unknown): value is PipelineUpdateWatchState {
	return (
		isRecord(value) &&
		typeof value.pipelineId === 'string' &&
		typeof value.cursorMs === 'number' &&
		typeof value.floorMs === 'number' &&
		isRecord(value.updates) &&
		Object.values(value.updates).every(isTrackedUpdate)
	);
}

function readPipelineId(context: IPollFunctions): string {
	const pipelineId = String(context.getNodeParameter('pipelineId', '', { extractValue: true }));
	if (!isUuid(pipelineId)) {
		throw new NodeOperationError(context.getNode(), 'Pipeline ID must be a UUID', {
			description:
				'Use the ID shown in the pipeline URL in Databricks, for example 8199cd89-e2f5-4169-a6aa-656a24c8886d.',
		});
	}
	return pipelineId.toLowerCase();
}

function parseTimestamp(value: string | undefined): number | undefined {
	if (value === undefined) return undefined;
	const ms = Date.parse(value);
	return Number.isNaN(ms) ? undefined : ms;
}

function toUpdateProgress(event: PipelineEvent): UpdateProgress | undefined {
	const updateId = event.origin?.update_id;
	const state = event.details?.update_progress?.state;
	const timestampMs = parseTimestamp(event.timestamp);
	if (
		event.event_type !== 'update_progress' ||
		!isUuid(updateId) ||
		typeof state !== 'string' ||
		timestampMs === undefined
	) {
		return undefined;
	}
	return { raw: event, updateId, state, timestampMs };
}

function toChronological(events: PipelineEvent[]): UpdateProgress[] {
	return events
		.flatMap((event) => toUpdateProgress(event) ?? [])
		.sort((a, b) => a.timestampMs - b.timestampMs);
}

function terminalEventOf(state: string): PipelineUpdateEvent | undefined {
	if (state === 'COMPLETED') return 'updateCompleted';
	if (state === 'FAILED' || state === 'CANCELED') return 'updateFailed';
	return undefined;
}

function collectNewEvents(
	updates: TrackedUpdates,
	progress: UpdateProgress,
): PipelineUpdateEvent[] {
	let entry = updates[progress.updateId];
	if (entry === undefined) {
		entry = {};
		updates[progress.updateId] = entry;
	}
	if (entry.endedMs !== undefined) return [];
	const terminal = terminalEventOf(progress.state);
	if (terminal !== undefined) {
		entry.endedMs = progress.timestampMs;
		return [terminal];
	}
	if (progress.state === 'RUNNING' && entry.runningMs === undefined) {
		entry.runningMs = progress.timestampMs;
	}
	if (entry.startedMs !== undefined) return [];
	entry.startedMs = progress.timestampMs;
	return ['updateStarted'];
}

function simplifyFrame(frame: StackFrame): IDataObject {
	return withoutUndefined({
		class: frame.declaring_class,
		method: frame.method_name,
		file: frame.file_name,
		line: frame.line_number,
	});
}

function simplifyException(exception: PipelineException): IDataObject {
	const stack = exception.stack ?? [];
	return withoutUndefined({
		type: exception.class_name,
		code: exception.error_class,
		sqlState: exception.sql_state,
		message: exception.message,
		stack: stack.length > 0 ? stack.map(simplifyFrame) : undefined,
	});
}

function simplifyResult(progress: UpdateProgress): IDataObject {
	const exceptions = progress.raw.error?.exceptions ?? [];
	return withoutUndefined({
		state: progress.state,
		message: progress.raw.message,
		errors: exceptions.length > 0 ? exceptions.map(simplifyException) : undefined,
	});
}

function simplifyTiming(
	event: PipelineUpdateEvent,
	progress: UpdateProgress,
	entry: TrackedUpdate,
): IDataObject {
	const { startedMs, runningMs } = entry;
	const started = withoutUndefined({
		startedAt: startedMs === undefined ? undefined : toIso(startedMs),
		runningAt: runningMs === undefined ? undefined : toIso(runningMs),
	});
	if (event === 'updateStarted') return started;
	return withoutUndefined({
		...started,
		endedAt: toIso(progress.timestampMs),
		durationMs: runningMs === undefined ? undefined : progress.timestampMs - runningMs,
	});
}

function simplifyUpdate(
	event: PipelineUpdateEvent,
	progress: UpdateProgress,
	entry: TrackedUpdate,
	options: ItemOptions,
): IDataObject {
	const pipelineUrl = `${options.host}/pipelines/${options.pipelineId}`;
	return {
		event,
		pipeline: withoutUndefined({
			id: options.pipelineId,
			name: progress.raw.origin?.pipeline_name,
			url: pipelineUrl,
		}),
		update: { id: progress.updateId, url: `${pipelineUrl}/updates/${progress.updateId}` },
		...(event !== 'updateStarted' && { result: simplifyResult(progress) }),
		timing: simplifyTiming(event, progress, entry),
	};
}

function toItem(
	event: PipelineUpdateEvent,
	progress: UpdateProgress,
	entry: TrackedUpdate,
	options: ItemOptions,
): INodeExecutionData {
	return {
		json: options.simplify
			? simplifyUpdate(event, progress, entry, options)
			: { event, ...progress.raw },
	};
}

function collectItems(
	updates: TrackedUpdates,
	progress: UpdateProgress[],
	options: ItemOptions,
): INodeExecutionData[] {
	return progress.flatMap((update) =>
		collectNewEvents(updates, update)
			.filter((event) => options.subscribed.includes(event))
			.map((event) => toItem(event, update, updates[update.updateId], options)),
	);
}

function startWatching(staticData: IDataObject, pipelineId: string): void {
	for (const key of Object.keys(staticData)) delete staticData[key];
	const now = Date.now();
	staticData.pipelineId = pipelineId;
	staticData.cursorMs = now;
	staticData.floorMs = now;
	staticData.updates = {};
}

function advanceCursor(state: PipelineUpdateWatchState, fetched: PipelineEvent[]): void {
	state.cursorMs = fetched.reduce(
		(max, event) => Math.max(max, parseTimestamp(event.timestamp) ?? max),
		state.cursorMs,
	);
	state.floorMs = Math.max(state.floorMs, state.cursorMs - OVERLAP_MS);
	for (const [key, entry] of Object.entries(state.updates)) {
		if (entry.endedMs !== undefined && entry.endedMs < state.floorMs) delete state.updates[key];
	}
	const inFlight = Object.entries(state.updates)
		.filter(([, entry]) => entry.endedMs === undefined)
		.sort(([, a], [, b]) => (a.startedMs ?? 0) - (b.startedMs ?? 0));
	for (const [key] of inFlight.slice(0, -MAX_IN_FLIGHT_UPDATES)) delete state.updates[key];
}

export async function pollPipelineUpdateEvents(
	this: IPollFunctions,
): Promise<INodeExecutionData[][] | null> {
	const subscribed = readEvents(this, PIPELINE_UPDATE_EVENTS, 'update');
	const simplify = this.getNodeParameter('simplify', true) === true;
	const pipelineId = readPipelineId(this);
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);
	const options: ItemOptions = { subscribed, simplify, pipelineId, host };

	if (this.getMode() === 'manual') {
		const page = await withLegibleErrors(
			async () =>
				await listPipelineEvents(this, credentialType, {
					pipelineId,
					levels: WATCHED_LEVELS,
					order: 'desc',
					pageSize: MANUAL_PAGE_SIZE,
				}),
			PERMISSION_HINT,
		);
		return toOutput(collectItems({}, toChronological(page.items), options));
	}

	const staticData = this.getWorkflowStaticData('node');
	if (!isPipelineUpdateWatchState(staticData) || staticData.pipelineId !== pipelineId) {
		startWatching(staticData, pipelineId);
		return null;
	}

	const deadlineEpochMs = Date.now() + this.getPollBudgetMs();
	const after = toIso(staticData.floorMs);
	const page = await withLegibleErrors(
		async () =>
			await listAllPipelineEvents(
				this,
				credentialType,
				{ pipelineId, after, levels: WATCHED_LEVELS, pageSize: PIPELINE_EVENTS_MAX_PAGE_SIZE },
				{ deadlineEpochMs },
			),
		PERMISSION_HINT,
	);
	const progress = toChronological(page.items).filter(
		(update) => update.timestampMs >= staticData.floorMs,
	);
	const items = collectItems(staticData.updates, progress, options);

	advanceCursor(staticData, page.items);
	if (page.nextPageToken !== undefined) {
		this.logger.info(
			`Databricks Trigger could not list every event of pipeline ${pipelineId} since ${after} in one poll. The next poll continues from ${toIso(staticData.cursorMs)}.`,
		);
	}

	return toOutput(items);
}
