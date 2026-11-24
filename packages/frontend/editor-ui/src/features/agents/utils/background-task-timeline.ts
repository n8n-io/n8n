import type { AgentBackgroundJobDto } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import type { TimelineActivityStatus, TimelineItem } from '../session-timeline.types';

export const backgroundTaskPresentation = {
	running: {
		icon: undefined,
		labelKey: 'agentSessions.timeline.taskRunning',
		activity: 'running',
	},
	suspended: {
		icon: 'hourglass',
		labelKey: 'agentSessions.timeline.taskSuspended',
		activity: 'waiting',
	},
	paused: {
		icon: 'circle-pause',
		labelKey: 'agentSessions.timeline.taskPaused',
		activity: 'waiting',
	},
	completed: {
		icon: 'circle-check',
		labelKey: 'agentSessions.timeline.taskCompleted',
		activity: 'completed',
	},
	failed: {
		icon: 'circle-x',
		labelKey: 'agentSessions.timeline.taskFailed',
		activity: 'failed',
	},
	cancelled: {
		icon: 'circle-x',
		labelKey: 'agentSessions.timeline.taskCancelled',
		activity: 'interrupted',
	},
} satisfies Record<
	AgentBackgroundJobDto['status'],
	{
		icon: IconName | undefined;
		labelKey: BaseTextKey;
		activity: TimelineActivityStatus;
	}
>;

/**
 * Preserve execution order. Insert tasks before the first later execution timestamp.
 * Keep equal task timestamps stable. Append tasks without a finite timestamp.
 */
export function insertBackgroundTaskTimelineItems(
	executionItems: readonly TimelineItem[],
	taskItems: readonly TimelineItem[],
): TimelineItem[] {
	const sortedTasks = [...taskItems].sort((a, b) => {
		const aTime = Number.isFinite(a.timestamp) ? a.timestamp : Infinity;
		const bTime = Number.isFinite(b.timestamp) ? b.timestamp : Infinity;
		return aTime === bTime ? 0 : aTime - bTime;
	});
	const items: TimelineItem[] = [];
	let taskIndex = 0;

	for (const item of executionItems) {
		while (
			Number.isFinite(item.timestamp) &&
			taskIndex < sortedTasks.length &&
			Number.isFinite(sortedTasks[taskIndex].timestamp) &&
			sortedTasks[taskIndex].timestamp < item.timestamp
		) {
			items.push(sortedTasks[taskIndex++]);
		}
		items.push(item);
	}

	items.push(...sortedTasks.slice(taskIndex));
	return items;
}

/** Keep one item per task in the current group. */
export function backgroundTasksToTimelineItems(tasks: AgentBackgroundJobDto[]): TimelineItem[] {
	return tasks.map((task) => ({
		kind: 'background-task',
		executionId: `background-task:${task.id}`,
		timestamp: Date.parse(task.startedAt),
		endTimestamp: task.settledAt ? Date.parse(task.settledAt) : undefined,
		activityStatus: backgroundTaskPresentation[task.status].activity,
		content: task.title,
		backgroundTask: task,
	}));
}
