/* eslint-disable @typescript-eslint/naming-convention -- item keys are pinned to the legacy ScheduleTrigger emit shape */
import type { ClaimedTask } from '@n8n/scheduler';
import { DateTime } from 'luxon';
import type { INodeExecutionData } from 'n8n-workflow';

/**
 * Task type schedule-trigger jobs are materialized under and their handler registers for.
 */
export const SCHEDULE_TRIGGER_TASK_TYPE = 'workflow:schedule-trigger';

/**
 * What a schedule-trigger job carries through materialization to its handler.
 */
export interface ScheduleTriggerTaskPayload {
	workflowId: string;
	nodeId: string;
}

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value !== '';

/**
 * Validates the payload snapshot the materializer copied from the job onto the task.
 */
export const isScheduleTriggerTaskPayload = (
	payload: Record<string, unknown>,
): payload is Record<string, unknown> & ScheduleTriggerTaskPayload =>
	isNonEmptyString(payload.workflowId) && isNonEmptyString(payload.nodeId);

export const scheduleTriggerDeduplicationKey = ({
	jobId,
	scheduledFor,
}: Pick<ClaimedTask, 'jobId' | 'scheduledFor'>): string => `${jobId}:${scheduledFor.toISOString()}`;

/**
 * The item a firing Schedule Trigger hands to the workflow. Field-for-field
 * identical to the legacy emit in `ScheduleTrigger.node.ts`, so a workflow
 * reads the same shape whichever engine fired it.
 */
// moment's `Do` token has no luxon equivalent
const ordinalSuffix = (day: number): string => {
	if (day >= 11 && day <= 13) return 'th';
	switch (day % 10) {
		case 1:
			return 'st';
		case 2:
			return 'nd';
		case 3:
			return 'rd';
		default:
			return 'th';
	}
};

export const buildScheduleTriggerItem = (
	scheduledFor: Date,
	timezone: string,
): INodeExecutionData => {
	// Locale pinned to 'en' and meridiem lowercased to stay byte-identical with
	// the moment-based legacy emit regardless of the server's ICU locale.
	const dt = DateTime.fromJSDate(scheduledFor, { zone: timezone }).setLocale('en');
	const readableTime = `${dt.toFormat('h:mm:ss')} ${dt.toFormat('a').toLowerCase()}`;
	return {
		json: {
			timestamp: dt.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZZ"),
			'Readable date': `${dt.toFormat('MMMM')} ${dt.day}${ordinalSuffix(dt.day)} ${dt.toFormat('yyyy')}, ${readableTime}`,
			'Readable time': readableTime,
			'Day of week': dt.toFormat('cccc'),
			Year: dt.toFormat('yyyy'),
			Month: dt.toFormat('MMMM'),
			'Day of month': dt.toFormat('dd'),
			Hour: dt.toFormat('HH'),
			Minute: dt.toFormat('mm'),
			Second: dt.toFormat('ss'),
			Timezone: `${timezone} (UTC${dt.toFormat('ZZ')})`,
		},
	};
};
