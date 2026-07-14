/* eslint-disable @typescript-eslint/naming-convention -- item keys are pinned to the legacy ScheduleTrigger emit shape */
import type { ClaimedTask } from '@n8n/scheduler';
import moment from 'moment-timezone';
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
export const buildScheduleTriggerItem = (
	scheduledFor: Date,
	timezone: string,
): INodeExecutionData => {
	const momentTz = moment.tz(scheduledFor, timezone);
	return {
		json: {
			timestamp: momentTz.toISOString(true),
			'Readable date': momentTz.format('MMMM Do YYYY, h:mm:ss a'),
			'Readable time': momentTz.format('h:mm:ss a'),
			'Day of week': momentTz.format('dddd'),
			Year: momentTz.format('YYYY'),
			Month: momentTz.format('MMMM'),
			'Day of month': momentTz.format('DD'),
			Hour: momentTz.format('HH'),
			Minute: momentTz.format('mm'),
			Second: momentTz.format('ss'),
			Timezone: `${timezone} (UTC${momentTz.format('Z')})`,
		},
	};
};
