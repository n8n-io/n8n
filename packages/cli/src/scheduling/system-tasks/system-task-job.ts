import type { SystemTask } from '@n8n/decorators';
import { resolveSystemTaskRunOptions } from '@n8n/decorators';
import { computeFirstRunAt, scheduleFromDefinition } from '@n8n/scheduler';

import type { ProvisionRequest } from '../durable-job-provisioner';
import type { SystemTaskScheduledJobOwner } from './system-task-scheduled-job-owner';
import { systemTaskType } from './system-task-type';

/**
 * The one durable job a system task owns, ready to provision. The schedule is
 * stored as declared, so `defaultTimezone` seeds the first run only: baking it
 * into the row would redefine every task whenever the instance timezone changes.
 */
export function systemTaskProvisionRequest(
	task: SystemTask,
	owner: SystemTaskScheduledJobOwner,
	defaultTimezone: string,
	now: Date,
): ProvisionRequest {
	const firstRunAt = computeFirstRunAt(scheduleFromDefinition(task.schedule, defaultTimezone), now);
	const name = systemTaskType(task.name);
	const { misfirePolicy, misfireGraceSeconds, maxAttempts } = resolveSystemTaskRunOptions(task);

	return {
		owner: owner.owner(task.name),
		taskType: name,
		payload: {},
		desired: [{ name, schedule: task.schedule, firstRunAt }],
		misfirePolicy,
		misfireGraceSeconds,
		maxAttempts,
	};
}
