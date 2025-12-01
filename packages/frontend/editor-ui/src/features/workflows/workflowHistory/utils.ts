import type { WorkflowPublishHistory } from '@n8n/rest-api-client/api/workflowHistory';
import dateformat from 'dateformat';

export const getLastPublishedByUser = (workflowPublishHistory: WorkflowPublishHistory[]) => {
	return workflowPublishHistory.findLast(
		(history) => history.event === 'activated' && history.userId !== null,
	);
};

export const generateVersionName = (versionId: string) => {
	return `Version ${versionId.substring(0, 8)}`;
};

export const formatTimestamp = (value: string) => {
	const currentYear = new Date().getFullYear().toString();
	const [date, time] = dateformat(
		value,
		`${value.startsWith(currentYear) ? '' : 'yyyy '}mmm d"#"HH:MM:ss`,
	).split('#');

	return { date, time };
};
