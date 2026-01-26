import type {
	WorkflowPublishHistory,
	WorkflowHistory,
} from '@n8n/rest-api-client/api/workflowHistory';
import dateformat from 'dateformat';

export const getLastPublishedVersion = (workflowPublishHistory: WorkflowPublishHistory[]) => {
	return workflowPublishHistory.findLast((history) => history.event === 'activated');
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

export type TimelineVersionEntry = {
	type: 'version';
	item: WorkflowHistory;
	originalIndex: number;
	isGrouped: boolean;
};

export type TimelineGroupHeader = {
	type: 'group-header';
	groupId: string;
	count: number;
	versions: TimelineVersionEntry[];
};

export type TimelineEntry = TimelineVersionEntry | TimelineGroupHeader;

/**
 * Computes timeline entries from workflow history, grouping consecutive unnamed versions.
 * Named versions are shown as individual entries.
 * Consecutive unnamed versions are grouped into collapsible blocks.
 * The first item is always shown separately (never grouped).
 */
export const computeTimelineEntries = (items: WorkflowHistory[]): TimelineEntry[] => {
	const entries: TimelineEntry[] = [];
	let currentGroup: TimelineVersionEntry[] = [];
	let groupCounter = 0;

	const flushGroup = () => {
		if (currentGroup.length > 0) {
			entries.push({
				type: 'group-header',
				groupId: `group-${groupCounter++}`,
				count: currentGroup.length,
				versions: [...currentGroup],
			});
			currentGroup = [];
		}
	};

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const isFirstItem = i === 0;
		const shouldBeGrouped = !isFirstItem && !item.name?.trim();

		if (shouldBeGrouped) {
			currentGroup.push({
				type: 'version',
				item,
				originalIndex: i,
				isGrouped: true,
			});
		} else {
			flushGroup();
			entries.push({
				type: 'version',
				item,
				originalIndex: i,
				isGrouped: false,
			});
		}
	}

	flushGroup();

	return entries;
};
