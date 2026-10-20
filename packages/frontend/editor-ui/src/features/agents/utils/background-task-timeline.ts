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
