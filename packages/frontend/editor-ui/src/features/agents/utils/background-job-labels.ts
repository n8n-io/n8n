import type { AgentBackgroundJobSignal } from '@n8n/api-types';
import type { BaseTextKey, useI18n } from '@n8n/i18n';

export const BACKGROUND_JOB_STATUS_LABEL_KEYS = {
	completed: 'agents.chat.backgroundTasks.status.completed',
	failed: 'agents.chat.backgroundTasks.status.failed',
	cancelled: 'agents.chat.backgroundTasks.status.cancelled',
} as const;

export function backgroundJobTimelineLabelKey(key: string): BaseTextKey | undefined {
	switch (key) {
		case 'background-task-signal':
			return 'agents.chat.backgroundTasks.resultsReceived';
		case 'background-task-completed':
			return BACKGROUND_JOB_STATUS_LABEL_KEYS.completed;
		case 'background-task-failed':
			return BACKGROUND_JOB_STATUS_LABEL_KEYS.failed;
		case 'background-task-cancelled':
			return BACKGROUND_JOB_STATUS_LABEL_KEYS.cancelled;
		default:
			return undefined;
	}
}

export function backgroundJobResultLabel(
	job: AgentBackgroundJobSignal['tasks'][number],
	i18n: Pick<ReturnType<typeof useI18n>, 'baseText'>,
): string {
	return i18n.baseText('agents.chat.backgroundTasks.result', {
		interpolate: {
			title: job.title,
			status: i18n.baseText(BACKGROUND_JOB_STATUS_LABEL_KEYS[job.status]),
		},
	});
}
